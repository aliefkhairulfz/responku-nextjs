import type { NextRequest } from "next/server"
import { z } from "zod"
import { exceptionResponse, handleRouteError, parseBody, readJsonBody, successResponse } from "@/lib/server/api"
import {
    changeEmailService,
    confirmEmailChangeService,
    confirmVerificationService,
    loginService,
    logoutService,
    registerService,
    requireCurrentUser,
    requireSession,
    resendVerificationService,
} from "@/service/auth"

/* ========== Validasi ========== */

/**
 * Trimmed before validation, so an email pasted with stray whitespace still
 * passes. The service lower-cases it for storage.
 */
const emailField = z.string().trim().pipe(z.email("A valid email address is required"))

const registerSchema = z.object({
    name: z.string().trim().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
    email: emailField,
    password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password must be at most 72 characters"),
})

const loginSchema = z.object({
    email: emailField,
    password: z.string().min(1, "Password is required"),
})

/** Six digits — the only shape the OTP endpoints accept. */
const codeField = z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Verification code must be 6 digits")

const confirmVerificationSchema = z.object({
    email: emailField,
    code: codeField,
})

const resendVerificationSchema = z.object({
    email: emailField,
})

const changeEmailSchema = z.object({
    email: emailField,
    password: z.string().min(1, "Password is required"),
})

const confirmEmailChangeSchema = z.object({
    code: codeField,
})

/* ========== Helper ========== */

/** Path below `/api/auth`, e.g. `me` for `/api/auth/me`. */
function getAuthPath(req: NextRequest) {
    return req.nextUrl.pathname.replace(/^\/api\/auth\/?/, "")
}

/** Request metadata stored alongside a session for auditing. */
function getRequestContext(req: NextRequest) {
    return {
        ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: req.headers.get("user-agent") ?? null,
    }
}

/* ========== Handler ========== */

/** login */
async function loginHandler(req: NextRequest) {
    try {
        const body = parseBody(loginSchema, await readJsonBody(req))
        const result = await loginService({ ...body, ...getRequestContext(req) })

        return successResponse({ message: "Login successful", data: result })
    } catch (error) {
        return handleRouteError(error)
    }
}

/** register and send otp verification */
async function registerHandler(req: NextRequest) {
    try {
        const body = parseBody(registerSchema, await readJsonBody(req))
        const result = await registerService(body)

        return successResponse({
            message: "Registration successful. Check your email for the verification code.",
            statusCode: 201,
            data: result,
        })
    } catch (error) {
        return handleRouteError(error)
    }
}

/** confirm the account verification otp */
async function confirmVerificationHandler(req: NextRequest) {
    try {
        const body = parseBody(confirmVerificationSchema, await readJsonBody(req))
        const result = await confirmVerificationService(body)

        return successResponse({
            message: result.alreadyVerified ? "Account is already verified" : "Account verified",
            data: result,
        })
    } catch (error) {
        return handleRouteError(error)
    }
}

/** send a fresh account verification otp */
async function resendVerificationHandler(req: NextRequest) {
    try {
        const body = parseBody(resendVerificationSchema, await readJsonBody(req))
        const result = await resendVerificationService(body)

        return successResponse({
            message: result.alreadyVerified ? "Account is already verified" : "Verification code sent",
            data: result,
        })
    } catch (error) {
        return handleRouteError(error)
    }
}

/** start an email change by sending a code to the new address */
async function changeEmailHandler(req: NextRequest) {
    try {
        const { user } = await requireSession()
        const body = parseBody(changeEmailSchema, await readJsonBody(req))
        const result = await changeEmailService({ userId: user.id, ...body })

        return successResponse({ message: "Verification code sent to the new email", data: result })
    } catch (error) {
        return handleRouteError(error)
    }
}

/** finish an email change with the code sent to the new address */
async function confirmEmailChangeHandler(req: NextRequest) {
    try {
        const { user } = await requireSession()
        const body = parseBody(confirmEmailChangeSchema, await readJsonBody(req))
        const result = await confirmEmailChangeService({ userId: user.id, ...body })

        return successResponse({ message: "Email changed", data: result })
    } catch (error) {
        return handleRouteError(error)
    }
}

/** get the signed-in user */
async function meHandler(_req: NextRequest) {
    try {
        const user = await requireCurrentUser()

        return successResponse({ message: "Current user", data: { user } })
    } catch (error) {
        return handleRouteError(error)
    }
}

/** logout */
async function logoutHandler(_req: NextRequest) {
    try {
        await logoutService()

        return successResponse({ message: "Logout successful" })
    } catch (error) {
        return handleRouteError(error)
    }
}

export async function GET(req: NextRequest) {
    const pathname = getAuthPath(req)

    switch (pathname) {
        case "me":
            return meHandler(req)
        default:
            return exceptionResponse({ message: "Not Found", statusCode: 404 })
    }
}

export async function POST(req: NextRequest) {
    const pathname = getAuthPath(req)

    switch (pathname) {
        case "login":
            return loginHandler(req)
        case "register":
            return registerHandler(req)
        case "confirm-verification":
            return confirmVerificationHandler(req)
        case "resend-verification":
            return resendVerificationHandler(req)
        case "change-email":
            return changeEmailHandler(req)
        case "confirm-email-change":
            return confirmEmailChangeHandler(req)
        case "logout":
            return logoutHandler(req)
        default:
            return exceptionResponse({ message: "Not Found", statusCode: 404 })
    }
}
