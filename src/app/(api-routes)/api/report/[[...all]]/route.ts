import type { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { REPORT_ACTIONS, REPORT_DECISIONS, REPORT_STATUSES } from '@/lib/report'
import {
    exceptionResponse,
    handleRouteError,
    parseBody,
    readJsonBody,
    successResponse,
} from '@/lib/server/api'
import { requireRole } from '@/lib/server/roles'
import { requireSession, type Session } from '@/service/auth'
import {
    createReportService,
    getReportService,
    listReportsService,
    reviewReportService,
} from '@/service/report'

/* ========== Validasi ========== */

/**
 * A new report. `status` is absent on purpose — a report always opens `OPEN`; only an admin
 * review moves it on.
 *
 * The reason has a floor because a report an admin cannot act on is noise: a bare "spam"
 * gives them nothing to check.
 */
const createReportSchema = z.object({
    researchId: z.string().trim().min(1, 'Research id is required'),
    reason: z
        .string()
        .trim()
        .min(20, 'Reason must be at least 20 characters')
        .max(5000, 'Reason must be at most 5000 characters'),
})

/** An admin decides a report one way or the other; nothing else is a decision. */
const reviewSchema = z.object({
    status: z.enum(REPORT_DECISIONS),
    actionTaken: z.enum(REPORT_ACTIONS).optional(),
})

/**
 * Query string of the admin queue, validated with the same helper as a body: a bad `status`
 * or `take` comes back as a 422 naming the key.
 */
const listReportsQuerySchema = z.object({
    status: z.enum(REPORT_STATUSES).optional(),
    take: z.coerce.number().int().min(1).max(100).optional(),
})

/* ========== Helper ========== */

/** The action path an admin decides a report on. */
const REVIEW_PATH = 'review'

/** Path segments below `/api/report`, e.g. `["abc", "review"]`. */
function getReportSegments(req: NextRequest) {
    return req.nextUrl.pathname
        .replace(/^\/api\/report\/?/, '')
        .split('/')
        .filter(Boolean)
}

function notFound() {
    return exceptionResponse({ message: 'Not Found', statusCode: 404 })
}

/**
 * Wraps a verb so it can only run for a signed-in respondent.
 *
 * Filing a report is the respondent's own action, so it needs the role — the same shape the
 * participation route uses for its respondent guard.
 */
function withRespondentGuard(
    handler: (user: Session['user'], req: NextRequest) => Promise<NextResponse>,
) {
    return async (req: NextRequest) => {
        try {
            const { user } = await requireSession()
            requireRole(user.roles, 'respondent')

            return await handler(user, req)
        } catch (error) {
            return handleRouteError(error)
        }
    }
}

/**
 * Wraps a verb so it can only run for a signed-in admin.
 *
 * A report is moderation data about somebody else's research, so reading and deciding it
 * both need the role.
 */
function withAdminGuard(
    handler: (user: Session['user'], req: NextRequest) => Promise<NextResponse>,
) {
    return async (req: NextRequest) => {
        try {
            const { user } = await requireSession()
            requireRole(user.roles, 'admin')

            return await handler(user, req)
        } catch (error) {
            return handleRouteError(error)
        }
    }
}

/* ========== Handler ========== */

/** file a report against a research */
async function createReportHandler(user: Session['user'], req: NextRequest) {
    const body = parseBody(createReportSchema, await readJsonBody(req))
    const report = await createReportService({ reportedBy: user.id, ...body })

    return successResponse({ message: 'Report filed', statusCode: 201, data: { report } })
}

/** the admin queue, most recently filed first */
async function listReportsHandler(req: NextRequest) {
    const query = parseBody(listReportsQuerySchema, Object.fromEntries(req.nextUrl.searchParams))
    const reports = await listReportsService(query)

    return successResponse({ message: 'Reports', data: { reports } })
}

/** one report, with the research and reporter it is about */
async function getReportHandler(id: string) {
    const report = await getReportService({ id })

    return successResponse({ message: 'Report', data: { report } })
}

/** resolve or dismiss a report */
async function reviewReportHandler(user: Session['user'], req: NextRequest, id: string) {
    const body = parseBody(reviewSchema, await readJsonBody(req))
    const report = await reviewReportService({
        id,
        reviewerId: user.id,
        status: body.status,
        actionTaken: body.actionTaken,
    })

    return successResponse({
        message: `Report ${body.status.toLowerCase()}`,
        data: { report },
    })
}

/* ========== Routing ========== */

export const GET = withAdminGuard(async (_user, req) => {
    const segments = getReportSegments(req)

    // The bare collection is the queue; anything else addresses one report.
    if (segments.length === 0) return listReportsHandler(req)
    if (segments.length === 1) return getReportHandler(segments[0])

    return notFound()
})

export const POST = async (req: NextRequest) => {
    const segments = getReportSegments(req)

    // Deciding somebody else's report is an admin action; filing one is the respondent's.
    if (segments.length === 2 && segments[1] === REVIEW_PATH) {
        return withAdminGuard((user, req) => reviewReportHandler(user, req, segments[0]))(req)
    }

    return withRespondentGuard(async (user, req) => {
        if (segments.length !== 0) return notFound()

        return createReportHandler(user, req)
    })(req)
}
