import type { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { PARTICIPATION_STATUSES } from "@/lib/participation-status"
import { ROLES } from "@/lib/roles"
import { exceptionResponse, handleRouteError, parseBody, readJsonBody, successResponse } from "@/lib/server/api"
import { requireRole } from "@/lib/server/roles"
import {
    getAdminOverviewService,
    listAdminParticipationsService,
    listAdminUsersService,
    listAdminWithdrawalsService,
    settleWithdrawalService,
    updateUserRolesService,
} from "@/service/admin"
import { requireSession, type Session } from "@/service/auth"

/**
 * The admin back office.
 *
 * Every verb here needs the `admin` role, so the guard wraps the whole route rather than
 * each handler — a new endpoint cannot be added without it. The moderation queues that
 * already have their own routes (quality checks, reports, tickets, participation review)
 * are not repeated here; this covers the overview, the submission queue, withdrawals, and
 * user roles.
 */

/* ========== Validasi ========== */

/** Every status a payment can be filtered by. */
const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "EXPIRED", "REFUNDED"] as const

/**
 * Query strings, validated with the same helper as a body: a bad `status` or `take` comes
 * back as a 422 naming the key.
 */
const listQuerySchema = z.object({
    status: z.enum(PARTICIPATION_STATUSES).optional(),
    take: z.coerce.number().int().min(1).max(100).optional(),
})

const withdrawalsQuerySchema = z.object({
    status: z.enum(PAYMENT_STATUSES).optional(),
    take: z.coerce.number().int().min(1).max(100).optional(),
})

const usersQuerySchema = z.object({
    search: z.string().trim().max(255).optional(),
    take: z.coerce.number().int().min(1).max(100).optional(),
})

/** An admin settles a withdrawal one way or the other; nothing else is a decision. */
const settleSchema = z.object({
    decision: z.enum(["PAID", "FAILED"]),
})

/**
 * A user's complete role list, written as a whole.
 *
 * An empty list is allowed on purpose: it locks the account out of every role-gated screen
 * without deleting anything.
 */
const rolesSchema = z.object({
    roles: z.array(z.enum(ROLES)),
})

/* ========== Helper ========== */

/** Path segments below `/api/admin`, e.g. `["users", "abc", "roles"]`. */
function getAdminSegments(req: NextRequest) {
    return req.nextUrl.pathname
        .replace(/^\/api\/admin\/?/, "")
        .split("/")
        .filter(Boolean)
}

function notFound() {
    return exceptionResponse({ message: "Not Found", statusCode: 404 })
}

/** Wraps a verb so it can only run for a signed-in admin. */
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

/** what is waiting, in one read */
async function overviewHandler() {
    const overview = await getAdminOverviewService()

    return successResponse({ message: "Admin overview", data: { overview } })
}

/** the submission review queue */
async function participationsHandler(req: NextRequest) {
    const query = parseBody(listQuerySchema, Object.fromEntries(req.nextUrl.searchParams))
    const participations = await listAdminParticipationsService(query)

    return successResponse({ message: "Participations", data: { participations } })
}

/** the withdrawal queue */
async function withdrawalsHandler(req: NextRequest) {
    const query = parseBody(withdrawalsQuerySchema, Object.fromEntries(req.nextUrl.searchParams))
    const withdrawals = await listAdminWithdrawalsService(query)

    return successResponse({ message: "Withdrawals", data: { withdrawals } })
}

/** the user list */
async function usersHandler(req: NextRequest) {
    const query = parseBody(usersQuerySchema, Object.fromEntries(req.nextUrl.searchParams))
    const users = await listAdminUsersService(query)

    return successResponse({ message: "Users", data: { users } })
}

/** settle a withdrawal */
async function settleWithdrawalHandler(req: NextRequest, id: string) {
    const body = parseBody(settleSchema, await readJsonBody(req))
    const withdrawal = await settleWithdrawalService({ id, decision: body.decision })

    return successResponse({
        message: body.decision === "PAID" ? "Withdrawal paid" : "Withdrawal failed and refunded",
        data: { withdrawal },
    })
}

/** replace a user's roles */
async function updateUserRolesHandler(req: NextRequest, id: string) {
    const body = parseBody(rolesSchema, await readJsonBody(req))
    const user = await updateUserRolesService({ userId: id, roles: body.roles })

    return successResponse({ message: "Roles updated", data: { user } })
}

/* ========== Routing ========== */

export const GET = withAdminGuard(async (_user, req) => {
    const segments = getAdminSegments(req)

    if (segments.length === 1) {
        if (segments[0] === "overview") return overviewHandler()
        if (segments[0] === "participations") return participationsHandler(req)
        if (segments[0] === "withdrawals") return withdrawalsHandler(req)
        if (segments[0] === "users") return usersHandler(req)
    }

    return notFound()
})

export const POST = withAdminGuard(async (_user, req) => {
    const segments = getAdminSegments(req)

    if (segments.length === 3 && segments[0] === "withdrawals" && segments[2] === "settle") {
        return settleWithdrawalHandler(req, segments[1])
    }

    return notFound()
})

export const PATCH = withAdminGuard(async (_user, req) => {
    const segments = getAdminSegments(req)

    if (segments.length === 3 && segments[0] === "users" && segments[2] === "roles") {
        return updateUserRolesHandler(req, segments[1])
    }

    return notFound()
})
