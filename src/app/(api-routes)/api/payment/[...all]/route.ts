import type { NextRequest } from "next/server"
import { z } from "zod"
import { env } from "@/env"
import { exceptionResponse, handleRouteError, parseBody, readJsonBody, successResponse } from "@/lib/server/api"
import { requireSession } from "@/service/auth"
import { getPaymentService, getWalletService, listPaymentsService, settlePaymentService, topupService } from "@/service/payment"

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
 * Outcomes a gateway callback may report.
 *
 * `REFUNDED` is deliberately absent: reversing a credit is a flow of its own, and
 * marking a payment refunded without reversing it would leave the wallet wrong.
 */
const callbackStatuses = ["PAID", "FAILED", "EXPIRED"] as const

const webhookSchema = z.object({
    providerRef: z.string().trim().min(1, "providerRef is required"),
    status: z.enum(callbackStatuses),
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
    return segment !== "" && ![TOPUP_PATH, WEBHOOK_PATH, WALLET_PATH].includes(segment)
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
        const payment = await topupService({ userId: user.id, tokenAmount: body.tokenAmount })

        return successResponse({ message: "Top-up created", statusCode: 201, data: { payment } })
    } catch (error) {
        return handleRouteError(error)
    }
}

/**
 * gateway callback
 *
 * The only endpoint in this route that is not session-guarded — a gateway has no
 * cookie — so it is guarded by a shared secret instead. With
 * `PAYMENT_WEBHOOK_SECRET` unset it refuses every call rather than accepting them
 * openly, and once a real gateway is wired up the secret check should be replaced
 * by that gateway's own signature verification.
 */
async function webhookHandler(req: NextRequest) {
    try {
        const secret = env.PAYMENT_WEBHOOK_SECRET

        if (secret === undefined) {
            return exceptionResponse({ message: "Payment webhook is not configured", statusCode: 503 })
        }

        if (req.headers.get("x-webhook-secret") !== secret) {
            return exceptionResponse({ message: "Unauthorized", statusCode: 401 })
        }

        const body = parseBody(webhookSchema, await readJsonBody(req))
        const result = await settlePaymentService(body)

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
