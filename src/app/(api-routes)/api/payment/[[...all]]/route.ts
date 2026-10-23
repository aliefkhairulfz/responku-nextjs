import type { NextRequest } from "next/server"
import { z } from "zod"
import { exceptionResponse, handleRouteError, parseBody, readJsonBody, successResponse } from "@/lib/server/api"
import { isMidtransConfigured } from "@/lib/server/midtrans"
import { requireSession } from "@/service/auth"
import {
    getPaymentService,
    getWalletService,
    listPaymentsService,
    settleMidtransNotificationService,
    topupService,
    withdrawService,
} from "@/service/payment"

/* ========== Validasi ========== */

/**
 * A top-up buys whole tokens, because the wallet holds integers — the `step="0.1"`
 * on the wallet dialog's input is misleading.
 */
const topupSchema = z.object({
    tokenAmount: z
        .number()
        .int("Token amount must be a whole number")
        .min(1, "Top up at least 1 token")
        .max(1_000_000, "Top up at most 1.000.000 tokens at a time"),
})

/**
 * A withdrawal also moves whole tokens, and the platform keeps a percentage of them as a
 * fee — so the rupiah paid out is the net, which the service works out.
 */
const withdrawSchema = z.object({
    tokenAmount: z
        .number()
        .int("Token amount must be a whole number")
        .min(1, "Withdraw at least 1 token")
        .max(1_000_000, "Withdraw at most 1.000.000 tokens at a time"),
})

/**
 * The fields of a Midtrans notification this app uses. Midtrans posts a large
 * payload; anything else in it is ignored rather than rejected.
 *
 * `gross_amount` arrives as a string (e.g. `"50000.00"`), and that exact string is
 * what the signature is computed over — so it is kept as one.
 */
const webhookSchema = z.object({
    order_id: z.string().trim().min(1, "order_id is required"),
    status_code: z.string().trim().min(1, "status_code is required"),
    gross_amount: z.string().trim().min(1, "gross_amount is required"),
    transaction_status: z.string().trim().min(1, "transaction_status is required"),
    fraud_status: z.string().trim().optional(),
    signature_key: z.string().trim().min(1, "signature_key is required"),
})

/** Every status a payment can be filtered by. */
const listingStatuses = ["PENDING", "PAID", "FAILED", "EXPIRED", "REFUNDED"] as const

/**
 * Query string of the payment list, validated with the same helper as a request body:
 * a bad `status` or `take` comes back as a 422 naming the key, exactly like a bad
 * payload would.
 */
const paymentsQuerySchema = z.object({
    status: z.enum(listingStatuses).optional(),
    take: z.coerce.number().int().min(1).max(100).optional(),
})

/* ========== Helper ========== */

/** The action path that opens a top-up, as opposed to addressing one by id. */
const TOPUP_PATH = "topup"

/** The action path that opens a withdrawal. */
const WITHDRAW_PATH = "withdraw"

/** The action path a payment gateway calls back on. */
const WEBHOOK_PATH = "webhook"

/** The action path that reads the caller's wallet. */
const WALLET_PATH = "wallet"

/** Path below `/api/payment`, e.g. `wallet` for `/api/payment/wallet`. */
function getPaymentPath(req: NextRequest) {
    return req.nextUrl.pathname.replace(/^\/api\/payment\/?/, "")
}

/** Whether a segment addresses a payment rather than being an action name. */
function isPaymentId(segment: string): boolean {
    return segment !== "" && ![TOPUP_PATH, WITHDRAW_PATH, WEBHOOK_PATH, WALLET_PATH].includes(segment)
}

function notFound() {
    return exceptionResponse({ message: "Not Found", statusCode: 404 })
}

/* ========== Handler ========== */

/** open a token top-up */
async function topupHandler(req: NextRequest) {
    try {
        const { user } = await requireSession()
        const body = parseBody(topupSchema, await readJsonBody(req))
        const result = await topupService({
            userId: user.id,
            tokenAmount: body.tokenAmount,
            customer: { name: user.name, email: user.email },
        })

        return successResponse({ message: "Top-up created", statusCode: 201, data: result })
    } catch (error) {
        return handleRouteError(error)
    }
}

/**
 * Open a token withdrawal.
 *
 * The tokens leave the wallet here, so the caller sees the reduced balance immediately; the
 * order is recorded `PENDING` for an admin to settle. The fee the platform keeps is returned
 * alongside, so the client can show what was deducted without recomputing it.
 */
async function withdrawHandler(req: NextRequest) {
    try {
        const { user } = await requireSession()
        const body = parseBody(withdrawSchema, await readJsonBody(req))
        const result = await withdrawService({ userId: user.id, tokenAmount: body.tokenAmount })

        return successResponse({ message: "Withdrawal requested", statusCode: 201, data: result })
    } catch (error) {
        return handleRouteError(error)
    }
}

/**
 * Midtrans notification.
 *
 * The only endpoint in this route that is not session-guarded — Midtrans has no
 * cookie — so it is guarded by the `signature_key` Midtrans signs every
 * notification with instead. Verifying that key needs `MIDTRANS_SERVER_KEY`, so
 * while the gateway is unconfigured the endpoint refuses every call rather than
 * accepting them openly.
 */
async function webhookHandler(req: NextRequest) {
    try {
        if (!isMidtransConfigured()) {
            return exceptionResponse({ message: "Payment webhook is not configured", statusCode: 503 })
        }

        const body = parseBody(webhookSchema, await readJsonBody(req))
        const result = await settleMidtransNotificationService({
            orderId: body.order_id,
            statusCode: body.status_code,
            grossAmount: body.gross_amount,
            transactionStatus: body.transaction_status,
            fraudStatus: body.fraud_status,
            signatureKey: body.signature_key,
        })

        return successResponse({
            message: result.credited ? "Payment settled and wallet credited" : "Payment updated",
            data: result,
        })
    } catch (error) {
        return handleRouteError(error)
    }
}

/** list the caller's payments, newest first */
async function paymentsHandler(req: NextRequest) {
    try {
        const { user } = await requireSession()
        const query = parseBody(paymentsQuerySchema, Object.fromEntries(req.nextUrl.searchParams))
        const payments = await listPaymentsService({ userId: user.id, ...query })

        return successResponse({ message: "Payments", data: { payments } })
    } catch (error) {
        return handleRouteError(error)
    }
}

/** read the caller's wallet */
async function walletHandler(_req: NextRequest) {
    try {
        const { user } = await requireSession()
        const wallet = await getWalletService({ userId: user.id })

        return successResponse({ message: "Wallet", data: { wallet } })
    } catch (error) {
        return handleRouteError(error)
    }
}

/** read one payment owned by the caller */
async function paymentHandler(_req: NextRequest, id: string) {
    try {
        const { user } = await requireSession()
        const payment = await getPaymentService({ id, userId: user.id })

        return successResponse({ message: "Payment", data: { payment } })
    } catch (error) {
        return handleRouteError(error)
    }
}

export async function POST(req: NextRequest) {
    const path = getPaymentPath(req)

    switch (path) {
        case TOPUP_PATH:
            return topupHandler(req)
        case WITHDRAW_PATH:
            return withdrawHandler(req)
        case WEBHOOK_PATH:
            return webhookHandler(req)
        default:
            return notFound()
    }
}

export async function GET(req: NextRequest) {
    const path = getPaymentPath(req)

    if (path === "") return paymentsHandler(req)
    if (path === WALLET_PATH) return walletHandler(req)

    return isPaymentId(path) ? paymentHandler(req, path) : notFound()
}
