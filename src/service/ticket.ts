import type { TicketCategory, TicketStatus } from "@/lib/ticket"
import { ConflictException, NotFoundException } from "@/lib/server/http-exception"
import type { Prisma } from "@/prisma/generated/prisma/client"
import { TicketStatus as TicketStatusEnum } from "@/prisma/generated/prisma/enums"
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

/** What an admin read needs: the ticket, plus who filed it. */
const ADMIN_INCLUDE = {
    user: { select: { id: true, name: true, email: true } },
} satisfies Prisma.SupportTicketInclude

type TicketAdminRow = Prisma.SupportTicketGetPayload<{ include: typeof ADMIN_INCLUDE }>

/**
 * Admin view of a ticket: the public shape plus the review trail and the requester.
 *
 * The trail is internal — `resolutionNote` is the admin's own note — so it is only ever
 * returned on the admin endpoints, never to the ticket's owner.
 */
function toTicketAdminResponse(ticket: TicketAdminRow) {
    return {
        ...toTicketResponse(ticket),
        userId: ticket.userId,
        requester: { id: ticket.user.id, name: ticket.user.name, email: ticket.user.email },
        reviewedBy: ticket.reviewedBy,
        reviewedAt: ticket.reviewedAt,
        resolutionNote: ticket.resolutionNote,
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

/** One ticket owned by the caller, or a 404 when it is not theirs. */
export async function getTicketService({ id, userId }: { id: string; userId: string }) {
    const ticket = await prisma.supportTicket.findFirst({ where: { id, userId, deletedAt: null } })

    if (ticket === null) throw new NotFoundException("Ticket not found")

    return toTicketResponse(ticket)
}

/**
 * The admin queue: every ticket, newest first.
 *
 * Not scoped to an owner — an admin reviews the whole queue — so it is only ever reached
 * through the admin-guarded endpoints.
 */
export async function listAllTicketsService({ status, take }: { status?: TicketStatus; take?: number }) {
    const tickets = await prisma.supportTicket.findMany({
        where: { deletedAt: null, ...(status === undefined ? {} : { status }) },
        orderBy: { createdAt: "desc" },
        take: take ?? DEFAULT_TICKET_LIMIT,
        include: ADMIN_INCLUDE,
    })

    return tickets.map(toTicketAdminResponse)
}

/** One ticket for an admin, with the requester and the review trail. */
export async function getTicketForAdminService({ id }: { id: string }) {
    const ticket = await prisma.supportTicket.findFirst({
        where: { id, deletedAt: null },
        include: ADMIN_INCLUDE,
    })

    if (ticket === null) throw new NotFoundException("Ticket not found")

    return toTicketAdminResponse(ticket)
}

/* ========== Tinjau ========== */

/**
 * Decides a ticket, which is what closes it out.
 *
 * A ticket is reviewed once: anything past `REVIEW` is refused rather than overwritten, so
 * the first decision is the one that stands. The note is optional — a rejection usually has
 * one, a plain resolution may not.
 */
export async function reviewTicketService({
    id,
    reviewerId,
    status,
    resolutionNote,
}: {
    id: string
    reviewerId: string
    status: Exclude<TicketStatus, "REVIEW">
    resolutionNote?: string | null
}) {
    const result = await prisma.supportTicket.updateMany({
        where: { id, deletedAt: null, status: TicketStatusEnum.REVIEW },
        data: {
            status,
            reviewedBy: reviewerId,
            reviewedAt: new Date(),
            resolutionNote: resolutionNote ?? null,
        },
    })

    if (result.count === 0) {
        const ticket = await prisma.supportTicket.findFirst({
            where: { id, deletedAt: null },
            select: { status: true },
        })

        if (ticket === null) throw new NotFoundException("Ticket not found")

        throw new ConflictException(`This ticket is ${ticket.status} and has already been reviewed`)
    }

    return getTicketForAdminService({ id })
}
