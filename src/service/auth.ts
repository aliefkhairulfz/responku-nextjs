import { cookies } from "next/headers"
import { generateOTP, generateTokenWithHash, hashPassword, hashToken, verifyPassword } from "@/lib/server/crypto"
import { BadRequestException, ConflictException, TooManyRequestsException, UnauthorizedException } from "@/lib/server/http-exception"
import { sendVerificationCodeEmail } from "@/lib/server/mail"
import { DEFAULT_ROLES, toRoleList } from "@/lib/server/roles"
import { clearSessionCookie, SESSION_COOKIE_NAME, setSessionCookie } from "@/lib/server/session"
import { VerificationType } from "@/prisma/generated/prisma/enums"
import { prisma } from "@/prisma/prisma"

/* ========== Konstanta ========== */

/** Sessions stay valid for 30 days. */
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30

/** Verification codes stay valid for 15 minutes. */
const VERIFICATION_TTL_MS = 15 * 60 * 1000

/** Minimum gap between two codes for the same purpose, so nobody can spray mail. */
const RESEND_COOLDOWN_MS = 60 * 1000

/** Wrong codes a verification tolerates before it is thrown away. */
const MAX_VERIFICATION_ATTEMPTS = 5

/** Provider id used for email + password accounts. */
const CREDENTIALS_PROVIDER_ID = "credentials"

/* ========== Tipe ========== */

type RegisterInput = {
    name: string
    email: string
    password: string
}

type LoginInput = {
    email: string
    password: string
    ipAddress?: string | null
    userAgent?: string | null
}

/* ========== Helper ========== */

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase()
}

/** Values a fresh code needs: the row to store, plus the code to send. */
function buildVerification(type: VerificationType, target: string | null = null) {
    const { hashedToken } = generateTokenWithHash()
    const code = generateOTP()
    const expiredAt = new Date(Date.now() + VERIFICATION_TTL_MS)

    return { code, expiredAt, data: { type, target, tokenHash: hashedToken, code, expiredAt } }
}

/**
 * Sends a verification code, reporting a delivery failure instead of throwing.
 *
 * The account (or the pending change) exists either way, so callers surface the
 * failure rather than rolling anything back.
 */
async function sendVerificationCodeQuietly({
    to,
    name,
    code,
    purpose,
}: {
    to: string
    name: string
    code: string
    purpose: "signup" | "email-change"
}) {
    try {
        await sendVerificationCodeEmail({ to, name, code, expiresInMinutes: VERIFICATION_TTL_MS / 60_000, purpose })

        return true
    } catch (error) {
        console.error("[auth] failed to send verification email", error)

        return false
    }
}

/**
 * Issues a fresh code for `type`, refusing when one was just sent.
 *
 * Older codes of the same type are dropped, so only the newest one ever works.
 */
async function issueVerification({ userId, type, target = null }: { userId: string; type: VerificationType; target?: string | null }) {
    const latest = await prisma.verification.findFirst({
        where: { userId, type, deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
    })

    if (latest !== null && Date.now() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS) {
        throw new TooManyRequestsException("A code was just sent — please wait before asking for another one.")
    }

    const verification = buildVerification(type, target)

    await prisma.$transaction([
        prisma.verification.deleteMany({ where: { userId, type } }),
        prisma.verification.create({ data: { userId, ...verification.data } }),
    ])

    return verification
}

/**
 * Checks a submitted code against the newest verification of `type`.
 *
 * A wrong code is counted, and once `MAX_VERIFICATION_ATTEMPTS` are spent the
 * verification is thrown away — a 6-digit code must not be brute forceable.
 */
async function consumeVerification({ userId, type, code }: { userId: string; type: VerificationType; code: string }) {
    const invalid = new BadRequestException("Invalid or expired verification code", {
        code: "The verification code is invalid or has expired.",
    })

    const verification = await prisma.verification.findFirst({
        where: { userId, type, deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: { id: true, code: true, attempts: true, target: true, expiredAt: true },
    })

    if (!verification || verification.code === null) throw invalid
    if (verification.expiredAt.getTime() <= Date.now()) throw invalid

    if (verification.code !== code) {
        const attempts = verification.attempts + 1

        if (attempts >= MAX_VERIFICATION_ATTEMPTS) {
            await prisma.verification.deleteMany({ where: { id: verification.id } })

            throw new TooManyRequestsException("Too many incorrect codes — ask for a new one.")
        }

        await prisma.verification.update({ where: { id: verification.id }, data: { attempts } })

        throw invalid
    }

    return verification
}

/* ========== Register ========== */

/**
 * Creates an email + password account and sends the verification OTP.
 *
 * The user, its credentials account, and the verification record are written as
 * one nested write, which Prisma runs in a transaction so a partial account can
 * never be left behind.
 */
export async function registerService({ name, email, password }: RegisterInput) {
    const normalizedEmail = normalizeEmail(email)

    const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
    })
    if (existingUser) throw new ConflictException("Email is already registered")

    const passwordHash = await hashPassword(password)
    const verification = buildVerification(VerificationType.EMAIL_VERIFICATION)

    const user = await prisma.user.create({
        data: {
            name,
            email: normalizedEmail,
            roles: DEFAULT_ROLES,
            accounts: {
                create: {
                    accountId: normalizedEmail,
                    providerId: CREDENTIALS_PROVIDER_ID,
                    password: passwordHash,
                },
            },
            verifications: { create: verification.data },
        },
        select: { id: true, name: true, email: true, verifiedAt: true },
    })

    const verificationSent = await sendVerificationCodeQuietly({
        to: user.email,
        name: user.name,
        code: verification.code,
        purpose: "signup",
    })

    return { user, verificationSent }
}

/* ========== Confirm verification ========== */

type ConfirmVerificationInput = {
    email: string
    code: string
}

/**
 * Consumes the account verification OTP and marks the user as verified.
 *
 * The user is not signed in at this point, so the account is identified by the
 * email the code was sent to. Every failure — unknown account, missing
 * verification, expired code, wrong code — reports the same error, so the
 * response cannot be used to probe which accounts exist.
 *
 * Idempotent: confirming an account that is already verified succeeds again,
 * so a double-submitted form does not turn into an error.
 */
export async function confirmVerificationService({ email, code }: ConfirmVerificationInput) {
    const normalizedEmail = normalizeEmail(email)

    const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, name: true, email: true, verifiedAt: true, deletedAt: true },
    })

    const invalidCode = new BadRequestException("Invalid or expired verification code", {
        code: "The verification code is invalid or has expired.",
    })

    if (!user || user.deletedAt !== null) throw invalidCode

    if (user.verifiedAt !== null) {
        return {
            user: { id: user.id, name: user.name, email: user.email, verifiedAt: user.verifiedAt },
            alreadyVerified: true,
        }
    }

    // Wrong codes are counted in here, so a 6-digit code cannot be brute forced.
    await consumeVerification({ userId: user.id, type: VerificationType.EMAIL_VERIFICATION, code })

    const verifiedAt = new Date()

    // Consuming the code is what makes it single-use: the row is deleted rather
    // than flagged, so the same OTP can never be replayed.
    await prisma.$transaction([
        prisma.user.update({ where: { id: user.id }, data: { verifiedAt } }),
        prisma.verification.deleteMany({ where: { userId: user.id, type: VerificationType.EMAIL_VERIFICATION } }),
    ])

    return {
        user: { id: user.id, name: user.name, email: user.email, verifiedAt },
        alreadyVerified: false,
    }
}

/* ========== Resend verification ========== */

/**
 * Sends a fresh account-verification code.
 *
 * This is what makes the 15-minute expiry survivable — without it, a code that
 * lapsed would lock the account out for good. Previous codes stop working the
 * moment a new one is issued, and `issueVerification` enforces the cooldown so the
 * endpoint cannot be turned into an inbox sprayer.
 */
export async function resendVerificationService({ email }: { email: string }) {
    const normalizedEmail = normalizeEmail(email)

    const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, name: true, email: true, verifiedAt: true, deletedAt: true },
    })

    // Registration already reveals whether an email is taken, so being explicit
    // here costs nothing and is far more usable than a silent success.
    if (!user || user.deletedAt !== null) {
        throw new BadRequestException("Account not found", { email: "No account is registered with this email." })
    }

    if (user.verifiedAt !== null) {
        return { verificationSent: false, alreadyVerified: true, expiresAt: null }
    }

    const verification = await issueVerification({ userId: user.id, type: VerificationType.EMAIL_VERIFICATION })

    const verificationSent = await sendVerificationCodeQuietly({
        to: user.email,
        name: user.name,
        code: verification.code,
        purpose: "signup",
    })

    return { verificationSent, alreadyVerified: false, expiresAt: verification.expiredAt }
}

/* ========== Email change ========== */

/**
 * Starts an email change by sending a code to the *new* address.
 *
 * The password is required again: changing the email is enough to take the account
 * over. Only the new address receives the code, so only whoever controls that
 * inbox can finish the change — the target is kept on the verification row until
 * then.
 */
export async function changeEmailService({ userId, email, password }: { userId: string; email: string; password: string }) {
    const normalizedEmail = normalizeEmail(email)

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            deletedAt: true,
            accounts: {
                where: { providerId: CREDENTIALS_PROVIDER_ID, deletedAt: null },
                select: { password: true },
                orderBy: { createdAt: "asc" },
                take: 1,
            },
        },
    })

    const invalidCredentials = new UnauthorizedException("Invalid credentials")

    if (!user || user.deletedAt !== null) throw invalidCredentials

    const account = user.accounts.at(0)
    if (!account?.password) throw invalidCredentials
    if (!(await verifyPassword(password, account.password))) throw invalidCredentials

    if (normalizedEmail === user.email) {
        throw new BadRequestException("That is already your email", { email: "Enter a different email address." })
    }

    const taken = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } })
    if (taken) throw new ConflictException("Email is already registered")

    const verification = await issueVerification({ userId, type: VerificationType.EMAIL_CHANGE, target: normalizedEmail })

    const verificationSent = await sendVerificationCodeQuietly({
        to: normalizedEmail,
        name: user.name,
        code: verification.code,
        purpose: "email-change",
    })

    return { email: normalizedEmail, verificationSent, expiresAt: verification.expiredAt }
}

/**
 * Finishes an email change with the code that was sent to the new address.
 *
 * The session survives, because it is keyed by user id rather than by email. The
 * new address counts as verified — the code proved it.
 *
 * The credentials account moves with it: login looks the account up by
 * `accountId`, which holds the email, so leaving it behind would lock the user out
 * of the new address.
 */
export async function confirmEmailChangeService({ userId, code }: { userId: string; code: string }) {
    const verification = await consumeVerification({ userId, type: VerificationType.EMAIL_CHANGE, code })

    if (verification.target === null) {
        throw new BadRequestException("Invalid or expired verification code", {
            code: "The verification code is invalid or has expired.",
        })
    }

    const verifiedAt = new Date()

    const [user] = await prisma.$transaction([
        prisma.user.update({
            where: { id: userId },
            data: { email: verification.target, verifiedAt },
            select: { id: true, name: true, email: true, verifiedAt: true },
        }),
        prisma.account.updateMany({
            where: { userId, providerId: CREDENTIALS_PROVIDER_ID },
            data: { accountId: verification.target },
        }),
        prisma.verification.deleteMany({ where: { userId, type: VerificationType.EMAIL_CHANGE } }),
    ])

    return { user }
}

/* ========== Login ========== */

/**
 * Verifies email + password credentials and starts a new session.
 *
 * The raw session token only ever lives in the HTTP-only cookie; the database
 * stores its hash.
 */
export async function loginService({ email, password, ipAddress, userAgent }: LoginInput) {
    const normalizedEmail = normalizeEmail(email)

    const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: {
            id: true,
            name: true,
            email: true,
            roles: true,
            verifiedAt: true,
            deletedAt: true,
            // A user can hold several accounts, so match the credentials account
            // registered for this email rather than "the" account.
            accounts: {
                where: {
                    providerId: CREDENTIALS_PROVIDER_ID,
                    accountId: normalizedEmail,
                    deletedAt: null,
                },
                select: { password: true },
                orderBy: { createdAt: "asc" },
                take: 1,
            },
        },
    })

    // Same error for unknown account, wrong password, and disabled account so the
    // response cannot be used to enumerate registered emails.
    const invalidCredentials = new UnauthorizedException("Invalid email or password")

    if (!user || user.deletedAt !== null) throw invalidCredentials

    const account = user.accounts.at(0)
    if (!account?.password) throw invalidCredentials
    if (!(await verifyPassword(password, account.password))) throw invalidCredentials

    const { rawToken, hashedToken } = generateTokenWithHash()
    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000)

    await prisma.session.create({
        data: {
            userId: user.id,
            token: hashedToken,
            expiresAt,
            ipAddress: ipAddress ?? null,
            userAgent: userAgent ?? null,
        },
    })

    await setSessionCookie({
        token: rawToken,
        cookieName: SESSION_COOKIE_NAME,
        maxAge: SESSION_TTL_SECONDS,
    })

    return {
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            roles: toRoleList(user.roles),
            verifiedAt: user.verifiedAt,
        },
        expiresAt,
    }
}

/* ========== Logout ========== */

/**
 * Revokes the current session and clears the session cookie.
 *
 * Idempotent: signing out without a valid session still succeeds.
 */
export async function logoutService(): Promise<void> {
    const cookieStore = await cookies()
    const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (rawToken) {
        await prisma.session.deleteMany({ where: { token: hashToken(rawToken) } })
    }

    await clearSessionCookie({ cookieName: SESSION_COOKIE_NAME })
}

/* ========== Session ========== */

/**
 * Resolves the session behind the current request.
 *
 * Returns `null` when the request carries no cookie, an unknown token, an
 * expired session, or a session whose user has since been soft-deleted.
 */
export async function getSession() {
    const cookieStore = await cookies()
    const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
    if (!rawToken) return null

    const session = await prisma.session.findUnique({
        where: { token: hashToken(rawToken) },
        select: {
            id: true,
            expiresAt: true,
            deletedAt: true,
            user: {
                select: { id: true, name: true, email: true, image: true, roles: true, verifiedAt: true, createdAt: true, deletedAt: true },
            },
        },
    })

    if (!session || session.deletedAt !== null) return null
    if (session.expiresAt.getTime() <= Date.now()) return null
    if (session.user.deletedAt !== null) return null

    return session
}

export type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>

/**
 * Same as `getSession`, but throws a 401 instead of returning `null`.
 *
 * Route handlers use this to guard endpoints that need a signed-in user.
 */
export async function requireSession(): Promise<Session> {
    const session = await getSession()
    if (!session) throw new UnauthorizedException("Authentication required")
    return session
}

/* ========== Current user ========== */

/**
 * Public view of a user: identity fields only, without the soft-delete
 * bookkeeping that `getSession` reads internally.
 */
function toCurrentUser({ user }: Session) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        roles: toRoleList(user.roles),
        verifiedAt: user.verifiedAt,
        createdAt: user.createdAt,
    }
}

export type CurrentUser = ReturnType<typeof toCurrentUser>

/**
 * Returns the signed-in user, or `null` when the request has no valid session.
 *
 * Use this where an absent session is an ordinary outcome rather than an error,
 * such as from a server action.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
    const session = await getSession()
    return session === null ? null : toCurrentUser(session)
}

/**
 * Same as `getCurrentUser`, but throws a 401 instead of returning `null`.
 *
 * Route handlers use this to guard endpoints that need a signed-in user.
 */
export async function requireCurrentUser(): Promise<CurrentUser> {
    return toCurrentUser(await requireSession())
}
