import type { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { QUALITY_DECISIONS } from '@/lib/quality-check'
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
    getQualityCheckService,
    listQualityChecksService,
    reviewQualityCheckService,
} from '@/service/quality-check'

/* ========== Validasi ========== */

/** An admin decides a check one way or the other; nothing else is a decision. */
const reviewSchema = z.object({
    decision: z.enum(['APPROVED', 'REJECTED']),
})

/**
 * Query string of the admin queue, validated with the same helper as a body: a bad
 * `decision` or `take` comes back as a 422 naming the key.
 */
const listQualityChecksQuerySchema = z.object({
    decision: z.enum(QUALITY_DECISIONS).optional(),
    take: z.coerce.number().int().min(1).max(100).optional(),
})

/* ========== Helper ========== */

/** The action path an admin decides a quality check on. */
const REVIEW_PATH = 'review'

/** Path segments below `/api/quality-check`, e.g. `["abc", "review"]`. */
function getQualityCheckSegments(req: NextRequest) {
    return req.nextUrl.pathname
        .replace(/^\/api\/quality-check\/?/, '')
        .split('/')
        .filter(Boolean)
}

function notFound() {
    return exceptionResponse({ message: 'Not Found', statusCode: 404 })
}

/**
 * Wraps a verb so it can only run for a signed-in admin.
 *
 * A quality check is moderation data about somebody else's submission, so every verb here
 * needs the role — the same shape the participation route uses for its review.
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

/** the admin queue, most recently created first */
async function listQualityChecksHandler(req: NextRequest) {
    const query = parseBody(
        listQualityChecksQuerySchema,
        Object.fromEntries(req.nextUrl.searchParams),
    )
    const qualityChecks = await listQualityChecksService(query)

    return successResponse({ message: 'Quality checks', data: { qualityChecks } })
}

/** one quality check, with the submission it is about */
async function getQualityCheckHandler(id: string) {
    const qualityCheck = await getQualityCheckService({ id })

    return successResponse({ message: 'Quality check', data: { qualityCheck } })
}

/** approve or reject a quality check */
async function reviewQualityCheckHandler(user: Session['user'], req: NextRequest, id: string) {
    const body = parseBody(reviewSchema, await readJsonBody(req))
    const qualityCheck = await reviewQualityCheckService({
        id,
        reviewerId: user.id,
        decision: body.decision,
    })

    return successResponse({
        message: `Quality check ${body.decision.toLowerCase()}`,
        data: { qualityCheck },
    })
}

/* ========== Routing ========== */

export const GET = withAdminGuard(async (_user, req) => {
    const segments = getQualityCheckSegments(req)

    // The bare collection is the queue; anything else addresses one check.
    if (segments.length === 0) return listQualityChecksHandler(req)
    if (segments.length === 1) return getQualityCheckHandler(segments[0])

    return notFound()
})

export const POST = withAdminGuard(async (user, req) => {
    const segments = getQualityCheckSegments(req)

    if (segments.length === 2 && segments[1] === REVIEW_PATH)
        return reviewQualityCheckHandler(user, req, segments[0])

    return notFound()
})
