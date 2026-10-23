import { type NextRequest, NextResponse } from "next/server"
import { env } from "@/env"

/**
 * Auth guard for every page.
 *
 * Next.js 16 renamed `middleware.ts` to `proxy.ts`; this runs before a request is
 * rendered, so a signed-out visitor is redirected instead of watching a page load
 * and then bounce.
 *
 * It only checks that the session cookie is *present*, never the database. Proxy
 * runs on every request — including prefetches — so a query here would be paid on
 * every navigation, and the Next.js docs are explicit that this is an optimistic
 * check rather than the security boundary. The real check stays where the data is:
 * `requireSession()` in the route handlers, which is what actually refuses a
 * request whose cookie is expired or forged.
 *
 * The cookie name is read from `@/env` rather than `@/lib/server/session`, so this
 * bundle does not pull in `next/headers` for a constant.
 */

/** Routes a signed-out visitor may see. Everything else is treated as protected. */
const PUBLIC_PATHS = ["/", "/feed", "/login", "/register", "/register/verify", "/terms", "/privacy"]

const LOGIN_PATH = "/login"

/** Where a signed-in visitor is sent when they open an auth screen. */
const HOME_PATH = "/dashboard"

function isPublic(pathname: string): boolean {
    return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl
    const signedIn = request.cookies.has(env.SESSION_COOKIE_NAME)

    // Deny by default: a page added later is guarded without being listed here.
    if (!signedIn && !isPublic(pathname)) {
        return NextResponse.redirect(new URL(LOGIN_PATH, request.nextUrl))
    }

    // The auth screens have nothing to offer somebody who is already signed in.
    if (signedIn && (pathname === LOGIN_PATH || pathname.startsWith("/register"))) {
        return NextResponse.redirect(new URL(HOME_PATH, request.nextUrl))
    }

    return NextResponse.next()
}

export const config = {
    /**
     * Everything except the API — which answers its own `401`s, so redirecting it
     * would break the client's error handling — and the static assets, which are
     * the same for everybody.
     */
    matcher: ["/((?!api|_next|favicon.ico|.*\\.(?:png|jpe?g|svg|ico|webp|gif|txt|xml|webmanifest)$).*)"],
}
