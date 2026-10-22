import type { TicketCategory, TicketStatus } from "@/lib/ticket"
import type { SupportTicketModel } from "@/prisma/generated/prisma/models/SupportTicket"
import { prisma } from "@/prisma/prisma"

/* ========== Konstanta ========== */

/** How many tickets the history returns when the caller does not say. */
const DEFAULT_TICKET_LIMIT = 50

/* ========== Helper ========== */

/** Public view of a ticket. Review columns are internal and left out. */
function toTicketResponse(ticket: SupportTicketModel) {
    return {
        id: ticket.id,
        category: ticket.category,
        subject: ticket.subject,
        description: ticket.description,
        status: ticket.status,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
    }
}

/* ========== Tulis ========== */

/**
 * Opens a support ticket for the caller.
 *
 * `status` is never taken from the client: a new ticket always starts `REVIEW`, and
 * only an admin review moves it on.
 */
export async function createTicketService({
    userId,
    category,
    subject,
    description,
}: {
    userId: string
    category: TicketCategory
    subject: string
    description: string
}) {
    const ticket = await prisma.supportTicket.create({
        data: { userId, category, subject, description },
    })

    return toTicketResponse(ticket)
}

/* ========== Baca ========== */

/**
 * Lists the caller's own tickets, newest first.
 *
 * Scoped to `userId`, so one account's history is never visible to another. Capped
 * rather than cursor-paginated: a support history does not need more yet.
 */
export async function listTicketsService({ userId, status, take }: { userId: string; status?: TicketStatus; take?: number }) {
    const tickets = await prisma.supportTicket.findMany({
        where: { userId, deletedAt: null, ...(status === undefined ? {} : { status }) },
        orderBy: { createdAt: "desc" },
        take: take ?? DEFAULT_TICKET_LIMIT,
    })

    return tickets.map(toTicketResponse)
}
