"use server"

import { getCurrentUser } from "@/service/auth"

/**
 * Server action: returns the signed-in user, or `null` when the request has no
 * valid session.
 *
 * It returns `null` instead of throwing because Next.js replaces error messages
 * thrown from server actions with a generic message in production, so refusing
 * loudly would tell the caller nothing useful. Let the caller decide what to
 * render for a signed-out visitor.
 *
 * Note this is a POST under the hood, so it cannot be called while rendering:
 * invoke it from an event handler or effect, or pass the user down from a server
 * component when you only need it for the initial render.
 */
export async function getCurrent() {
    return getCurrentUser()
}
