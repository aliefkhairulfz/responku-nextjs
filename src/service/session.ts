import { NotFoundException } from "@/lib/server/http-exception"
import { prisma } from "@/prisma/prisma"

/**
 * The devices currently signed in to an account, for the Account Settings page.
 *
 * These are the rows `getSession` already resolves a request against, so listing them is
 * a read of `sessions` — there is no separate table. Two things it deliberately does not
 * offer: a device *location* (that needs IP geolocation, and the IP is stored raw) and a
 * "last seen" time (nothing touches a session row per request, so the only honest
 * timestamps are when the session started and when it expires).
 *
 * Ending a session is a hard delete, matching `logoutService` — sessions are ephemeral
 * auth artifacts, and a row kept around "just in case" is a credential kept around.
 */

/* ========== Baca ========== */

/**
 * The caller's live sessions, newest first.
 *
 * Expired rows are filtered out rather than shown as history, because the UI presents
 * this as "where you are signed in right now" — the exact question `getSession` answers.
 */
export async function listSessionsService({ userId, currentSessionId }: { userId: string; currentSessionId: string }) {
    const sessions = await prisma.session.findMany({
        where: { userId, deletedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
        select: { id: true, userAgent: true, ipAddress: true, createdAt: true, expiresAt: true },
    })

    return sessions.map((session) => ({
        id: session.id,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        current: session.id === currentSessionId,
    }))
}

/* ========== Cabut ========== */

/**
 * Ends one session.
 *
 * Scoped by `userId`, so an id belonging to someone else reads as missing rather than
 * being deleted. The caller's *current* session is not special-cased: ending it is
 * exactly what `logout` does, and it can only ever affect the caller's own device.
 */
export async function revokeSessionService({ userId, id }: { userId: string; id: string }) {
    const result = await prisma.session.deleteMany({ where: { id, userId } })

    if (result.count === 0) throw new NotFoundException("Session not found")

    return { revoked: result.count }
}

/**
 * Ends every session except the one making the request.
 *
 * The current session survives on purpose: this backs "sign out everywhere else", and
 * ending the caller's own session would log them out of the page they just used.
 */
export async function revokeOtherSessionsService({ userId, currentSessionId }: { userId: string; currentSessionId: string }) {
    const result = await prisma.session.deleteMany({ where: { userId, id: { not: currentSessionId } } })

    return { revoked: result.count }
}
