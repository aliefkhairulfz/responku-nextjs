import { createHash, timingSafeEqual } from "node:crypto"
import { env } from "@/env"
import { BadGatewayException, InternalServerErrorException } from "@/lib/server/http-exception"
import { PaymentStatus } from "@/prisma/generated/prisma/enums"

/**
 * The Midtrans thin client: Snap order creation and notification verification.
 *
 * Only the two calls this app makes are wrapped, so nothing else has to know
 * Midtrans' wire format. `MIDTRANS_SERVER_KEY` is optional — without it the
 * gateway counts as unconfigured and top-ups stay local (see `topupService`).
 */

const SNAP_BASE_URL = env.MIDTRANS_SNAP_BASE_URL ?? (env.MIDTRANS_IS_PRODUCTION ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com")

/** Recorded on `Payment.provider` so a row states which gateway produced it. */
export const MIDTRANS_PROVIDER = "midtrans"

/** Whether a Midtrans server key is present. */
export function isMidtransConfigured(): boolean {
    return env.MIDTRANS_SERVER_KEY !== undefined
}

/**
 * Snap authenticates with the server key as the Basic-auth username, paired with
 * an empty password.
 */
function authorizationHeader(serverKey: string): string {
    return `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`
}

type SnapOrder = {
    orderId: string
    grossAmount: number
    customer?: { name?: string; email?: string }
}

/**
 * Registers an order with Snap and returns the hosted payment page the client
 * has to open.
 *
 * A non-2xx answer or a body without a token throws, so a caller can never
 * mistake a failed registration for a payable order.
 */
export async function createSnapTransaction({ orderId, grossAmount, customer }: SnapOrder) {
    const serverKey = env.MIDTRANS_SERVER_KEY

    // Callers check `isMidtransConfigured` first; this only guards the contract.
    if (serverKey === undefined) {
        throw new InternalServerErrorException("Midtrans is not configured")
    }

    const response = await fetch(`${SNAP_BASE_URL}/snap/v1/transactions`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            accept: "application/json",
            authorization: authorizationHeader(serverKey),
        },
        body: JSON.stringify({
            transaction_details: { order_id: orderId, gross_amount: grossAmount },
            customer_details: customer,
        }),
    })

    if (!response.ok) {
        throw new BadGatewayException("Midtrans rejected the top-up order", { status: response.status })
    }

    const body = (await response.json()) as { token?: unknown; redirect_url?: unknown }

    if (typeof body.token !== "string" || typeof body.redirect_url !== "string") {
        throw new InternalServerErrorException("Midtrans returned no payment token")
    }

    return { token: body.token, redirectUrl: body.redirect_url }
}

type NotificationSignature = {
    orderId: string
    statusCode: string
    grossAmount: string
    signatureKey: string
}

/**
 * Verifies a notification's `signature_key`.
 *
 * Midtrans signs the concatenation of `order_id`, `status_code`, `gross_amount`
 * and the server key with SHA-512. The digest is compared in constant time so a
 * wrong signature cannot be guessed byte by byte.
 */
export function verifyNotificationSignature({ orderId, statusCode, grossAmount, signatureKey }: NotificationSignature): boolean {
    const serverKey = env.MIDTRANS_SERVER_KEY

    if (serverKey === undefined) return false

    const expected = createHash("sha512").update(`${orderId}${statusCode}${grossAmount}${serverKey}`).digest()
    const received = Buffer.from(signatureKey, "hex")

    return received.byteLength === expected.byteLength && timingSafeEqual(received, expected)
}

/**
 * Maps Midtrans' `transaction_status` onto `PaymentStatus`, or `null` for a
 * status this app does not act on — the caller rejects those instead of guessing.
 *
 * A `capture` is only money once its fraud check comes back `accept`; while that
 * is pending (or `challenge`) the order stays `PENDING`.
 */
export function mapTransactionStatus(transactionStatus: string, fraudStatus?: string): PaymentStatus | null {
    switch (transactionStatus) {
        case "capture":
            return fraudStatus === undefined || fraudStatus === "accept" ? PaymentStatus.PAID : PaymentStatus.PENDING
        case "settlement":
            return PaymentStatus.PAID
        case "pending":
            return PaymentStatus.PENDING
        case "deny":
        case "cancel":
            return PaymentStatus.FAILED
        case "expire":
            return PaymentStatus.EXPIRED
        case "refund":
        case "partial_refund":
            return PaymentStatus.REFUNDED
        default:
            return null
    }
}
