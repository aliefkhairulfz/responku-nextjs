import { cookies } from "next/headers"
import { env } from "@/env"

/**
 * Session cookie plumbing.
 *
 * The name and the setters live together so a caller cannot write the token
 * under a name the reader will not look for.
 */

/** Cookie that carries the raw session token. Its default lives in `@/env`. */
export const SESSION_COOKIE_NAME = env.SESSION_COOKIE_NAME

type SetSessionCookie = {
    token: string
    cookieName: string
    maxAge: number
}

/**
 * Sets a secure, HTTP-only session cookie.
 *
 * Must be called from a Server Action or Route Handler.
 */
export async function setSessionCookie({ token, cookieName, maxAge }: SetSessionCookie): Promise<void> {
    const cookieStore = await cookies()
    cookieStore.set(cookieName, token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge,
        path: "/",
    })
}

type ClearSessionCookie = {
    cookieName: string
}

/**
 * Clears the session cookie from the client's browser.
 *
 * Must be called from a Server Action or Route Handler.
 */
export async function clearSessionCookie({ cookieName }: ClearSessionCookie): Promise<void> {
    const cookieStore = await cookies()
    cookieStore.set(cookieName, "", {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 0,
        path: "/",
    })
}
