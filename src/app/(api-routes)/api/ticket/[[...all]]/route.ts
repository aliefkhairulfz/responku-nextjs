import type { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { TICKET_CATEGORIES, TICKET_DECISIONS, TICKET_STATUSES } from "@/lib/ticket"
import { exceptionResponse, handleRouteError, parseBody, readJsonBody, successResponse } from "@/lib/server/api"
import { requireRole } from "@/lib/server/roles"
import { requireSession, type Session } from "@/service/auth"
import {
    createTicketService,
    getTicketForAdminService,
    getTicketService,
    listAllTicketsService,
    listTicketsService,
    reviewTicketService,
} from "@/service/ticket"

/* ========== Validasi ========== */

/**
 * A new ticket. `status` is absent on purpose — a ticket always opens in `REVIEW`;
 * only an admin review moves it on.
 *
 * Lengths mirror the help-center form, so the client and the API agree on what is
 * acceptable before anything is sent.
 */
const createTicketSchema = z.object({
    category: z.enum(TICKET_CATEGORIES),
    subject: z.string().trim().min(3, "Subject must be at least 3 characters").max(150, "Subject must be at most 150 characters"),
    description: z.string().trim().min(20, "Description must be at least 20 characters").max(5000, "Description must be at most 5000 characters"),
})

/** An admin closes a ticket one way or the other; nothing else is a decision. */
const reviewSchema = z.object({
    status: z.enum(TICKET_DECISIONS),
    resolutionNote: z.string().trim().max(5000, "Note must be at most 5000 characters").nullable().optional(),
})

/**
 * Query string of a ticket list, validated with the same helper as a request
 * body: a bad `status` or `take` comes back as a 422 naming the key.
 */
const listTicketsQuerySchema = z.object({
    status: z.enum(TICKET_STATUSES).optional(),
    take: z.coerce.number().int().min(1).max(100).optional(),
})

/* ========== Helper ========== */

/** The action path that lists every ticket, rather than the caller's own. */
const ADMIN_PATH = "admin"

/** The action path an admin closes a ticket through. */
const REVIEW_PATH = "review"

/** Path segments below `/api/ticket`, e.g. `["abc", "review"]`. */
function getTicketSegments(req: NextRequest) {
    return req.nextUrl.pathname
        .replace(/^\/api\/ticket\/?/, "")
        .split("/")
        .filter(Boolean)
}

function notFound() {
    return exceptionResponse({ message: "Not Found", statusCode: 404 })
}

/**
 * Wraps a verb so it can only run for a signed-in user.
 *
 * Any signed-in user may open and read their own tickets, so this checks the session
 * but not a role — the same shape the user route uses.
 */
function withSessionGuard(handler: (user: Session["user"], req: NextRequest) => Promise<NextResponse>) {
    return async (req: NextRequest) => {
        try {
            const { user } = await requireSession()

            return await handler(user, req)
        } catch (error) {
            return handleRouteError(error)
        }
    }
}

/**
 * Wraps a verb so it can only run for a signed-in admin.
 *
 * Reviewing somebody else's ticket is moderation, so it needs the role — the same shape
 * the quality-check route uses.
 */
function withAdminGuard(handler: (user: Session["user"], req: NextRequest) => Promise<NextResponse>) {
    return async (req: NextRequest) => {
        try {
            const { user } = await requireSession()
            requireRole(user.roles, "admin")

            return await handler(user, req)
        } catch (error) {
            return handleRouteError(error)
        }
    }
}

/* ========== Handler ========== */

/** open a support ticket for the caller */
async function createTicketHandler(user: Session["user"], req: NextRequest) {
    const body = parseBody(createTicketSchema, await readJsonBody(req))
    const ticket = await createTicketService({ userId: user.id, ...body })

    return successResponse({ message: "Ticket created", statusCode: 201, data: { ticket } })
}

/** list the caller's own tickets, newest first */
async function listTicketsHandler(user: Session["user"], req: NextRequest) {
    const query = parseBody(listTicketsQuerySchema, Object.fromEntries(req.nextUrl.searchParams))
    const tickets = await listTicketsService({ userId: user.id, ...query })

    return successResponse({ message: "Tickets", data: { tickets } })
}

/** one ticket owned by the caller */
async function getTicketHandler(user: Session["user"], id: string) {
    const ticket = await getTicketService({ id, userId: user.id })

    return successResponse({ message: "Ticket", data: { ticket } })
}

/** the admin queue: every ticket, newest first */
async function listAllTicketsHandler(req: NextRequest) {
    const query = parseBody(listTicketsQuerySchema, Object.fromEntries(req.nextUrl.searchParams))
    const tickets = await listAllTicketsService(query)

    return successResponse({ message: "Tickets", data: { tickets } })
}

/** one ticket for an admin, with the requester and the review trail */
async function getTicketForAdminHandler(id: string) {
    const ticket = await getTicketForAdminService({ id })

    return successResponse({ message: "Ticket", data: { ticket } })
}

/** resolve or reject a ticket */
async function reviewTicketHandler(user: Session["user"], req: NextRequest, id: string) {
    const body = parseBody(reviewSchema, await readJsonBody(req))
    const ticket = await reviewTicketService({
        id,
        reviewerId: user.id,
        status: body.status,
        resolutionNote: body.resolutionNote,
    })

    return successResponse({ message: `Ticket ${body.status.toLowerCase()}`, data: { ticket } })
}

/* ========== Routing ========== */

export const GET = async (req: NextRequest) => {
    const segments = getTicketSegments(req)

    // The queue and one ticket in it are admin-only; the caller's own list and one of their
    // tickets only need a session.
    if (segments[0] === ADMIN_PATH) {
        if (segments.length === 1) return withAdminGuard((_user, req) => listAllTicketsHandler(req))(req)
        if (segments.length === 2) return withAdminGuard(() => getTicketForAdminHandler(segments[1]))(req)

        return notFound()
    }

    return withSessionGuard(async (user, req) => {
        if (segments.length === 0) return listTicketsHandler(user, req)
        if (segments.length === 1) return getTicketHandler(user, segments[0])

        return notFound()
    })(req)
}

export const POST = async (req: NextRequest) => {
    const segments = getTicketSegments(req)

    // Closing somebody else's ticket is an admin action; opening one is the caller's.
    if (segments.length === 2 && segments[1] === REVIEW_PATH) {
        return withAdminGuard((user, req) => reviewTicketHandler(user, req, segments[0]))(req)
    }

    return withSessionGuard(async (user, req) => {
        if (segments.length !== 0) return notFound()

        return createTicketHandler(user, req)
    })(req)
}
