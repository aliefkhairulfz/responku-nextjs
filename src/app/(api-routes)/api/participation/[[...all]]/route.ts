import type { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { PARTICIPATION_STATUSES } from "@/lib/participation-status"
import { exceptionResponse, handleRouteError, parseBody, readJsonBody, readOptionalJsonBody, successResponse } from "@/lib/server/api"
import { requireRole } from "@/lib/server/roles"
import { requireSession, type Session } from "@/service/auth"
import { getParticipationService, listParticipationsService, saveAnswersService, submitParticipationService } from "@/service/participation"

/* ========== Validasi ========== */

/**
 * One answer, in either form: choice ids, free text, or neither.
 *
 * Which form a question expects follows from its type, and the service refuses an
 * answer naming a choice its question does not offer — so the two are not fought over
 * here.
 */
const answerSchema = z.object({
    questionId: z.string().trim().min(1, "Question id is required"),
    selected: z.array(z.string().trim().min(1, "A choice id cannot be empty")).optional(),
    text: z.string().max(5000, "An answer must be at most 5000 characters").nullable().optional(),
})

const saveAnswersSchema = z.object({
    answers: z.array(answerSchema),
})

/** Sending a research in does not have to carry the answers again. */
const submitSchema = z.object({
    answers: z.array(answerSchema).optional(),
})

/**
 * Query string of the respondent's own list, validated with the same helper as a body:
 * a bad `status` or `take` comes back as a 422 naming the key.
 */
const listParticipationsQuerySchema = z.object({
    status: z.enum(PARTICIPATION_STATUSES).optional(),
    take: z.coerce.number().int().min(1).max(100).optional(),
})

/* ========== Helper ========== */

/** The action path that replaces a participation's answers. */
const ANSWERS_PATH = "answers"

/** The action path that sends a participation in. */
const SUBMIT_PATH = "submit"

/** Path segments below `/api/participation`, e.g. `["abc", "submit"]`. */
function getParticipationSegments(req: NextRequest) {
    return req.nextUrl.pathname
        .replace(/^\/api\/participation\/?/, "")
        .split("/")
        .filter(Boolean)
}

function notFound() {
    return exceptionResponse({ message: "Not Found", statusCode: 404 })
}

/**
 * Wraps a verb so it can only run for a signed-in respondent.
 *
 * Both checks live here instead of in every verb, so a new endpoint cannot be added
 * without them — the same shape the research route uses for its researcher guard.
 */
function withRespondentGuard(handler: (user: Session["user"], req: NextRequest) => Promise<NextResponse>) {
    return async (req: NextRequest) => {
        try {
            const { user } = await requireSession()
            requireRole(user.roles, "respondent")

            return await handler(user, req)
        } catch (error) {
            return handleRouteError(error)
        }
    }
}

/* ========== Handler ========== */

/** the caller's own participations, most recently started first */
async function listParticipationsHandler(user: Session["user"], req: NextRequest) {
    const query = parseBody(listParticipationsQuerySchema, Object.fromEntries(req.nextUrl.searchParams))
    const participations = await listParticipationsService({ respondentId: user.id, ...query })

    return successResponse({ message: "Participations", data: { participations } })
}

/** one participation of the caller's, with its questionnaire and saved answers */
async function getParticipationHandler(user: Session["user"], id: string) {
    const participation = await getParticipationService({ id, respondentId: user.id })

    return successResponse({ message: "Participation", data: { participation } })
}

/** replace the caller's answers without sending them in */
async function saveAnswersHandler(user: Session["user"], req: NextRequest, id: string) {
    const body = parseBody(saveAnswersSchema, await readJsonBody(req))
    const participation = await saveAnswersService({ id, respondentId: user.id, answers: body.answers })

    return successResponse({ message: "Answers saved", data: { participation } })
}

/** send the caller's answers in, which puts them in the review queue */
async function submitHandler(user: Session["user"], req: NextRequest, id: string) {
    // Read through the tolerant helper: sending a research in with nothing to add is a
    // normal request, and `req.json()` would turn it into a validation error.
    const body = parseBody(submitSchema, await readOptionalJsonBody(req))
    const participation = await submitParticipationService({ id, respondentId: user.id, answers: body.answers })

    return successResponse({ message: "Research submitted", data: { participation } })
}

/* ========== Routing ========== */

export const GET = withRespondentGuard(async (user, req) => {
    const segments = getParticipationSegments(req)

    // The bare collection is the list; anything else addresses one participation.
    if (segments.length === 0) return listParticipationsHandler(user, req)
    if (segments.length === 1) return getParticipationHandler(user, segments[0])

    return notFound()
})

export const POST = withRespondentGuard(async (user, req) => {
    const segments = getParticipationSegments(req)

    if (segments.length !== 2) return notFound()

    if (segments[1] === ANSWERS_PATH) return saveAnswersHandler(user, req, segments[0])
    if (segments[1] === SUBMIT_PATH) return submitHandler(user, req, segments[0])

    return notFound()
})
