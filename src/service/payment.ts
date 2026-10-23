import { randomUUID } from "node:crypto"
import { env } from "@/env"
import { BadRequestException, NotFoundException, UnauthorizedException } from "@/lib/server/http-exception"
import {
    createSnapTransaction,
    isMidtransConfigured,
    MIDTRANS_PROVIDER,
    mapTransactionStatus,
    verifyNotificationSignature,
} from "@/lib/server/midtrans"
import { IDR_PER_TOKEN } from "@/lib/server/token-price"
import { PaymentStatus, PaymentType, TokenTransactionType } from "@/prisma/generated/prisma/enums"
import type { PaymentModel } from "@/prisma/generated/prisma/models/Payment"
import { prisma } from "@/prisma/prisma"

/* ========== Konstanta ========== */

/** How many ledger rows the wallet view returns. */
const WALLET_HISTORY_LIMIT = 50

/** Default size of the payment list. */
const DEFAULT_PAYMENT_LIMIT = 20

/** Recorded on `Payment.provider` when no gateway is configured. */
const MANUAL_PROVIDER = "manual"

/* ========== Helper ========== */

/** Public view of a payment. */
function toPaymentResponse(payment: PaymentModel) {
    return {
        id: payment.id,
        type: payment.type,
        provider: payment.provider,
        providerRef: payment.providerRef,
        amountIdr: Number(payment.amountIdr),
        tokenAmount: payment.tokenAmount,
        status: payment.status,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
    }
}

/* ========== Top up ========== */

/**
 * Opens a token top-up: records the order and hands back what the client needs in
 * order to pay it. Nothing is credited yet — the wallet only moves once Midtrans
 * reports the payment as settled (`settleMidtransNotificationService`).
 *
 * With Midtrans configured the order is registered with Snap, which returns the
 * hosted payment page to open (`token` + `redirectUrl`). Without a server key the
 * order is only recorded locally and both are `null`, so a dev environment with no
 * credentials can still exercise the endpoint.
 */
export async function topupService({
    userId,
    tokenAmount,
    customer,
}: {
    userId: string
    tokenAmount: number
    customer?: { name?: string; email?: string }
}) {
    const providerRef = `topup-${randomUUID()}`
    const amountIdr = tokenAmount * IDR_PER_TOKEN
    const configured = isMidtransConfigured()

    const payment = await prisma.payment.create({
        data: {
            userId,
            type: PaymentType.TOKEN_TOPUP,
            provider: configured ? MIDTRANS_PROVIDER : MANUAL_PROVIDER,
            providerRef,
            amountIdr,
            // Frozen at creation: the price lives in env, so an order has to remember what
            // it bought rather than have it recomputed at settlement or on every read.
            tokenAmount,
            status: PaymentStatus.PENDING,
            idempotencyKey: `topup:${providerRef}`,
        },
    })

    if (!configured) {
        return { payment: toPaymentResponse(payment), token: null, redirectUrl: null }
    }

    try {
        const snap = await createSnapTransaction({ orderId: providerRef, grossAmount: amountIdr, customer })

        return { payment: toPaymentResponse(payment), token: snap.token, redirectUrl: snap.redirectUrl }
    } catch (error) {
        // A row left `PENDING` would look like a payment still on its way; mark it
        // failed so it reads as dead and the client can start a fresh order.
        await prisma.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.FAILED } })

        throw error
    }
}

/* ========== Tarik tunai ========== */

/**
 * Requests a withdrawal of tokens to cash.
 *
 * The tokens leave the wallet immediately: the request is a reservation, so the balance
 * cannot be spent twice while the payout is processed, and a `WITHDRAWAL` payment row
 * records the order for an admin to settle. The platform keeps
 * `WITHDRAWAL_FEE_PERCENT` of the tokens, so the rupiah the caller is owed is the net of
 * that fee — `amountIdr` is the net, while `tokenAmount` is the gross that left the wallet.
 *
 * The debit and the order share one transaction, and the ledger row is keyed by the
 * payment, so a retry cannot debit twice. The balance check is a conditional update rather
 * than a read-then-write, so two withdrawals racing cannot both pass it and overdraw.
 */
export async function withdrawService({ userId, tokenAmount }: { userId: string; tokenAmount: number }) {
    const feeTokens = Math.floor((tokenAmount * env.WITHDRAWAL_FEE_PERCENT) / 100)
    const netTokens = tokenAmount - feeTokens
    const amountIdr = netTokens * IDR_PER_TOKEN
    const providerRef = `withdraw-${randomUUID()}`

    const result = await prisma.$transaction(async (tx) => {
        const wallet = await tx.tokenWallet.findUnique({
            where: { userId },
            select: { id: true, balance: true },
        })

        if (wallet === null) {
            throw new BadRequestException("Insufficient balance", {
                tokenAmount: "This account has no token wallet yet.",
            })
        }

        // Atomic guard: the balance is only decremented when it still covers the request,
        // so a concurrent withdrawal cannot slip past a stale read.
        const debited = await tx.tokenWallet.updateMany({
            where: { id: wallet.id, balance: { gte: tokenAmount } },
            data: { balance: { decrement: tokenAmount } },
        })

        if (debited.count === 0) {
            throw new BadRequestException("Insufficient balance", {
                tokenAmount: `You have ${wallet.balance} tokens, which is less than the ${tokenAmount} requested.`,
            })
        }

        const payment = await tx.payment.create({
            data: {
                userId,
                type: PaymentType.WITHDRAWAL,
                provider: MANUAL_PROVIDER,
                providerRef,
                amountIdr,
                tokenAmount,
                status: PaymentStatus.PENDING,
                idempotencyKey: `withdraw:${providerRef}`,
            },
        })

        await tx.tokenTransaction.create({
            data: {
                walletId: wallet.id,
                paymentId: payment.id,
                type: TokenTransactionType.WITHDRAW,
                // Debits are negative, the mirror of a top-up credit.
                amount: -tokenAmount,
                idempotencyKey: `withdraw-debit:${payment.id}`,
            },
        })

        return { payment, feeTokens, netTokens, amountIdr }
    })

    return {
        payment: toPaymentResponse(result.payment),
        feeTokens: result.feeTokens,
        netTokens: result.netTokens,
        amountIdr: result.amountIdr,
    }
}

/* ========== Settle ========== */

/**
 * Applies a gateway callback to a top-up.
 *
 * `PAID` credits the wallet; `FAILED` and `EXPIRED` only close the order out, and
 * only ever from `PENDING` — an order already marked paid cannot be flipped back.
 *
 * `PAID` is credited whatever state came before it, as long as it is not already
 * paid: a declined attempt is routinely retried on the same order, and a payment
 * that says it arrived should never be dropped.
 *
 * Crediting and the status change share one transaction, and the ledger row carries
 * `topup-credit:{paymentId}`, so a gateway that calls back twice — or retries — can
 * never credit twice. Two callbacks racing past the status check would trip that
 * unique key instead, rolling the second one back.
 *
 * The credit is the `tokenAmount` the order was opened with, not a fresh division of
 * `amountIdr`: the price can change between the order and its settlement, and the
 * tokens that were quoted are the tokens that are owed. The ledger row also points
 * back at the payment, so the chain from order to balance is walkable in both
 * directions.
 *
 * `REFUNDED` is acknowledged without being applied: reversing a credit is a flow
 * of its own, and a status flip without it would leave the wallet lying.
 */
export async function settlePaymentService({ providerRef, status }: { providerRef: string; status: PaymentStatus }) {
    const payment = await prisma.payment.findUnique({ where: { providerRef }, select: { id: true } })

    if (payment === null) throw new NotFoundException("Payment not found")

    // Reversing a credit is a flow of its own. Until it exists a refund is
    // acknowledged without touching the row: flipping the status to `REFUNDED`
    // while the tokens stayed in the wallet would leave the two disagreeing.
    if (status === PaymentStatus.REFUNDED) {
        console.warn(`[payment] refund for ${providerRef} acknowledged but not applied — reverse it by hand`)

        return { id: payment.id, status, credited: false, ignored: true }
    }

    if (status !== PaymentStatus.PAID) {
        await prisma.payment.updateMany({
            where: { id: payment.id, status: PaymentStatus.PENDING },
            data: { status },
        })

        return { id: payment.id, status, credited: false, ignored: false }
    }

    const credited = await prisma.$transaction(async (tx) => {
        const current = await tx.payment.findUniqueOrThrow({
            where: { id: payment.id },
            select: { userId: true, tokenAmount: true, status: true },
        })

        if (current.status === PaymentStatus.PAID) return false

        await tx.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.PAID } })

        const wallet = await tx.tokenWallet.upsert({
            where: { userId: current.userId },
            // Accounts created before wallets were made at registration have none.
            create: { userId: current.userId, balance: current.tokenAmount },
            update: { balance: { increment: current.tokenAmount } },
            select: { id: true },
        })

        await tx.tokenTransaction.create({
            data: {
                walletId: wallet.id,
                paymentId: payment.id,
                type: TokenTransactionType.TOPUP,
                // Credits are positive; debits (like a research reserve) are negative.
                amount: current.tokenAmount,
                idempotencyKey: `topup-credit:${payment.id}`,
            },
        })

        return true
    })

    return { id: payment.id, status: PaymentStatus.PAID, credited, ignored: false }
}

/**
 * Applies a Midtrans notification.
 *
 * Midtrans posts every status change to a single endpoint, so the payload is
 * verified and mapped here before the shared settlement logic runs. The signature
 * is checked first — an unverified body is never allowed to move the wallet.
 */
export async function settleMidtransNotificationService(notification: {
    orderId: string
    statusCode: string
    grossAmount: string
    transactionStatus: string
    fraudStatus?: string
    signatureKey: string
}) {
    if (!verifyNotificationSignature(notification)) {
        throw new UnauthorizedException("Invalid Midtrans signature")
    }

    const status = mapTransactionStatus(notification.transactionStatus, notification.fraudStatus)

    if (status === null) {
        throw new BadRequestException("Unsupported Midtrans transaction status", {
            transaction_status: `Midtrans sent "${notification.transactionStatus}", which this app does not handle.`,
        })
    }

    return settlePaymentService({ providerRef: notification.orderId, status })
}

/* ========== Reads ========== */

/**
 * Lists the caller's payments, newest first.
 *
 * Capped rather than cursor-paginated: this history does not need more yet, and a
 * wrong guess at a cursor would be worse than a simple limit.
 */
export async function listPaymentsService({ userId, status, take }: { userId: string; status?: PaymentStatus; take?: number }) {
    const payments = await prisma.payment.findMany({
        where: status === undefined ? { userId } : { userId, status },
        orderBy: { createdAt: "desc" },
        take: take ?? DEFAULT_PAYMENT_LIMIT,
    })

    return payments.map(toPaymentResponse)
}

/** One payment, scoped to its owner. */
export async function getPaymentService({ id, userId }: { id: string; userId: string }) {
    const payment = await prisma.payment.findFirst({ where: { id, userId } })

    if (payment === null) throw new NotFoundException("Payment not found")

    return toPaymentResponse(payment)
}

/**
 * The caller's wallet: balance plus its most recent ledger rows.
 *
 * A missing wallet reads as a zero balance rather than an error, because accounts
 * created before wallets existed do not have one.
 */
export async function getWalletService({ userId }: { userId: string }) {
    const wallet = await prisma.tokenWallet.findUnique({
        where: { userId },
        select: {
            balance: true,
            transactions: {
                orderBy: { createdAt: "desc" },
                take: WALLET_HISTORY_LIMIT,
                select: {
                    id: true,
                    type: true,
                    amount: true,
                    researchId: true,
                    respondentParticipationId: true,
                    paymentId: true,
                    createdAt: true,
                },
            },
        },
    })

    const balance = wallet?.balance ?? 0

    return {
        balance,
        balanceIdr: balance * IDR_PER_TOKEN,
        transactions: (wallet?.transactions ?? []).map((transaction) => ({
            id: transaction.id,
            type: transaction.type,
            amount: transaction.amount,
            researchId: transaction.researchId,
            participationId: transaction.respondentParticipationId,
            paymentId: transaction.paymentId,
            createdAt: transaction.createdAt,
        })),
    }
}
