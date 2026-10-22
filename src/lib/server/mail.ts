import { Resend } from "resend"
import { VerificationCodeEmail } from "@/emails/verification-code"
import { env } from "@/env"

export const resend = new Resend(env.RESEND_API_KEY)

/**
 * Sender used for transactional mail.
 *
 * `APP_MAIL_NAME` holds the sending domain suffix (e.g. `"@email.pickblue.cloud"`),
 * so mail goes out from `no-reply@email.pickblue.cloud` unless an explicit
 * `MAIL_FROM_ADDRESS` overrides it. The domain must be verified in Resend.
 */
const MAIL_FROM = env.MAIL_FROM_ADDRESS ?? `no-reply${env.APP_MAIL_NAME ?? "@resend.dev"}`

type SendVerificationCodeEmail = {
    to: string
    name: string
    code: string
    expiresInMinutes: number
    purpose: "signup" | "email-change"
}

/**
 * Sends a verification OTP.
 *
 * Resend resolves with an `error` object rather than rejecting, so a failed
 * delivery is re-thrown here to let callers decide what to do about it.
 */
export async function sendVerificationCodeEmail({ to, name, code, expiresInMinutes, purpose }: SendVerificationCodeEmail) {
    const { error } = await resend.emails.send({
        from: MAIL_FROM,
        to,
        subject: purpose === "email-change" ? "Confirm your new Responku email" : "Your Responku verification code",
        react: VerificationCodeEmail({ name, code, expiresInMinutes, purpose }),
    })

    if (error) throw new Error(`RESEND_SEND_FAILED: ${error.message}`)
}
