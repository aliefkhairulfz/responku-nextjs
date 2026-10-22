import { randomUUID } from "node:crypto"
import { env } from "@/env"
import { IDR_PER_TOKEN } from "@/lib/token-price"
import { InternalServerErrorException, NotFoundException } from "@/lib/server/http-exception"
import { PaymentStatus, PaymentType, TokenTransactionType } from "@/prisma/generated/prisma/enums"
import type { PaymentModel } from "@/prisma/generated/prisma/models/Payment"
import { prisma } from "@/prisma/prisma"

/* ========== Konstanta ========== */

/** How many ledger rows the wallet view returns. */
const WALLET_HISTORY_LIMIT = 50

/** Default size of the payment list. */
const DEFAULT_PAYMENT_LIMIT = 20

/* ========== Helper ========== */

/** Public view of a payment, with the token amount worked back out of the price. */
function toPaymentResponse(payment: PaymentModel) {
    const amountIdr = Number(payment.amountIdr)

    return {
        id: payment.id,
        type: payment.type,
        provider: payment.provider,
        providerRef: payment.providerRef,
        amountIdr,
        tokenAmount: amountIdr / IDR_PER_TOKEN,
        status: payment.status,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
    }
}

/* ========== Top up ========== */

/**
 * Opens a token top-up: records the order and hands back what the client needs in
 * order to pay it. Nothing is credited yet — the wallet only moves once the gateway
 * reports the payment as settled (`settlePaymentService`).
 *
 * No gateway is wired up yet, so the order is written with `PAYMENT_PROVIDER` (by
 * default `manual`) and a generated reference. Plugging in Midtrans/Xendit means
 * creating the real order here and returning its redirect URL alongside.
 */
export async function topupService({ userId, tokenAmount }: { userId: string; tokenAmount: number }) {
    const providerRef = `topup-${randomUUID()}`

    const payment = await prisma.payment.create({
        data: {
            userId,
            type: PaymentType.TOKEN_TOPUP,
            provider: env.PAYMENT_PROVIDER,
            providerRef,
            amountIdr: tokenAmount * IDR_PER_TOKEN,
            status: PaymentStatus.PENDING,
            idempotencyKey: `topup:${providerRef}`,
        },
    })

    return toPaymentResponse(payment)
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
 */
export async function settlePaymentService({ providerRef, status }: { providerRef: string; status: PaymentStatus }) {
    const payment = await prisma.payment.findUnique({ where: { providerRef }, select: { id: true } })

    if (payment === null) throw new NotFoundException("Payment not found")

    if (status !== PaymentStatus.PAID) {
        await prisma.payment.updateMany({
            where: { id: payment.id, status: PaymentStatus.PENDING },
            data: { status },
        })

        return { id: payment.id, status, credited: false }
    }

    const credited = await prisma.$transaction(async (tx) => {
        const current = await tx.payment.findUniqueOrThrow({
            where: { id: payment.id },
            select: { userId: true, amountIdr: true, status: true },
        })

        if (current.status === PaymentStatus.PAID) return false

        const tokenAmount = Number(current.amountIdr) / IDR_PER_TOKEN

        // The wallet holds whole tokens, so a half-token credit would corrupt it.
        if (!Number.isInteger(tokenAmount)) {
            throw new InternalServerErrorException(`Payment ${payment.id} does not settle to a whole number of tokens`)
        }

        await tx.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.PAID } })

        const wallet = await tx.tokenWallet.upsert({
            where: { userId: current.userId },
            // Accounts created before wallets were made at registration have none.
            create: { userId: current.userId, balance: tokenAmount },
            update: { balance: { increment: tokenAmount } },
            select: { id: true },
        })

        await tx.tokenTransaction.create({
            data: {
                walletId: wallet.id,
                type: TokenTransactionType.TOPUP,
                // Credits are positive; debits (like a research reserve) are negative.
                amount: tokenAmount,
                idempotencyKey: `topup-credit:${payment.id}`,
            },
        })

        return true
    })

    return { id: payment.id, status: PaymentStatus.PAID, credited }
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
            createdAt: transaction.createdAt,
        })),
    }
}
