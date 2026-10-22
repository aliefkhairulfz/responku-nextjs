import type { NextRequest } from "next/server"
import { z } from "zod"
import { TICKET_CATEGORIES, TICKET_STATUSES } from "@/lib/ticket"
import { exceptionResponse, handleRouteError, parseBody, readJsonBody, successResponse } from "@/lib/server/api"
import { requireSession } from "@/service/auth"
import { createTicketService, listTicketsService } from "@/service/ticket"

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

/**
 * Query string of the ticket history, validated with the same helper as a request
 * body: a bad `status` or `take` comes back as a 422 naming the key.
 */
const listTicketsQuerySchema = z.object({
    status: z.enum(TICKET_STATUSES).optional(),
    take: z.coerce.number().int().min(1).max(100).optional(),
})

/* ========== Helper ========== */

/** Path below `/api/ticket`, e.g. `""` for the collection. */
function getTicketPath(req: NextRequest) {
    return req.nextUrl.pathname.replace(/^\/api\/ticket\/?/, "")
}

function notFound() {
    return exceptionResponse({ message: "Not Found", statusCode: 404 })
}

/* ========== Handler ========== */

/** open a support ticket for the caller */
async function createTicketHandler(req: NextRequest) {
    try {
        const { user } = await requireSession()
        const body = parseBody(createTicketSchema, await readJsonBody(req))
        const ticket = await createTicketService({ userId: user.id, ...body })

        return successResponse({ message: "Ticket created", statusCode: 201, data: { ticket } })
    } catch (error) {
        return handleRouteError(error)
    }
}

/** list the caller's own tickets, newest first */
async function listTicketsHandler(req: NextRequest) {
    try {
        const { user } = await requireSession()
        const query = parseBody(listTicketsQuerySchema, Object.fromEntries(req.nextUrl.searchParams))
        const tickets = await listTicketsService({ userId: user.id, ...query })

        return successResponse({ message: "Tickets", data: { tickets } })
    } catch (error) {
        return handleRouteError(error)
    }
}

/**
 * Any signed-in user may open a ticket, so this route is session-guarded but not
 * role-guarded. There is no sub-resource yet, so any path but the collection is a
 * 404 rather than a silent create/list.
 */
export async function POST(req: NextRequest) {
    return getTicketPath(req) === "" ? createTicketHandler(req) : notFound()
}

export async function GET(req: NextRequest) {
    return getTicketPath(req) === "" ? listTicketsHandler(req) : notFound()
}
