import type { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { RESEARCH_CATEGORIES } from "@/lib/research-category"
import { QUESTION_TYPES } from "@/lib/research-question"
import { exceptionResponse, handleRouteError, parseBody, readJsonBody, successResponse } from "@/lib/server/api"
import { requireRole } from "@/lib/server/roles"
import { requireSession, type Session } from "@/service/auth"
import {
    CRITERIA_OPERATORS,
    choiceTextRequired,
    createResearchDraftService,
    deleteResearchService,
    getResearchService,
    publishResearchService,
    replaceResearchCriteriaService,
    replaceResearchQuestionsService,
    updateResearchService,
} from "@/service/research"

/* ========== Validasi ========== */

/** One screening rule. Shared by PATCH and the dedicated criteria endpoint. */
const criterionSchema = z.object({
    field: z.string().trim().min(1, "Field cannot be empty").max(100, "Field must be at most 100 characters"),
    operator: z.enum(CRITERIA_OPERATORS),
    value: z.string().trim().min(1, "Value cannot be empty").max(512, "Value must be at most 512 characters"),
})

/**
 * The fields the research editor owns, all optional (PATCH semantics: an omitted
 * field is left untouched).
 *
 * `status`, `publishedAt`, and the token counters are absent on purpose —
 * publishing and the token ledger move through their own flows. `deadline` is not
 * nullable either, because the column is NOT NULL. `criteria` is replaced as a
 * whole when sent, since the editor submits the complete list.
 */
const updateResearchSchema = z
    .object({
        title: z.string().trim().min(1, "Title cannot be empty").max(255, "Title must be at most 255 characters").optional(),
        description: z.string().trim().max(1000, "Description must be at most 1000 characters").optional(),
        category: z.enum(RESEARCH_CATEGORIES).nullable().optional(),
        externalSurveyUrl: z.url("A valid URL is required").max(2048, "URL must be at most 2048 characters").nullable().optional(),
        targetRespondentCount: z.number().int("Target must be a whole number").min(0, "Target cannot be negative").optional(),
        estimatedDurationMinutes: z
            .number()
            .int("Duration must be a whole number")
            .min(1, "Duration must be at least 1 minute")
            .max(180, "Duration must be at most 180 minutes")
            .optional(),
        deadline: z.coerce.date().optional(),
        criteria: z.array(criterionSchema).optional(),
    })
    .refine((value) => Object.values(value).some((field) => field !== undefined), {
        error: "Provide at least one research field to update",
    })

/**
 * The whole questionnaire, sent in one go. Posting it replaces what is stored, so
 * positions have to be unique within the payload — the same constraint the
 * database enforces on `(researchId, pos)` and `(questionId, pos)`.
 */
const createQuestionsSchema = z.object({
    questions: z
        .array(
            z
                .object({
                    pos: z.number().int("Question position must be a whole number").min(0, "Question position cannot be negative"),
                    question: z.string().trim().min(1, "Question cannot be empty"),
                    questionType: z.enum(QUESTION_TYPES),
                    mustFill: z.boolean().optional(),
                    choices: z
                        .array(
                            z.object({
                                pos: z.number().int("Choice position must be a whole number").min(0, "Choice position cannot be negative"),
                                n: z.string().trim().min(1, "Choice code cannot be empty").max(20, "Choice code must be at most 20 characters"),
                                choiceText: z.string().trim().nullable().optional(),
                            }),
                        )
                        .optional(),
                })
                .refine(
                    (question) => {
                        const positions = (question.choices ?? []).map((choice) => choice.pos)
                        return new Set(positions).size === positions.length
                    },
                    { path: ["choices"], error: "Choice positions must be unique" },
                )
                .refine(
                    (question) =>
                        !choiceTextRequired(question.questionType) ||
                        (question.choices ?? []).every((choice) => (choice.choiceText ?? "").length > 0),
                    { path: ["choices"], error: "Choice text is required for this question type" },
                ),
        )
        .min(1, "At least one question is required")
        .refine((questions) => new Set(questions.map((question) => question.pos)).size === questions.length, {
            error: "Question positions must be unique",
        }),
})

/**
 * The whole criteria list, sent in one go. Posting it replaces what is stored; an
 * empty list means the research targets everyone.
 */
const createCriteriaSchema = z.object({
    criteria: z.array(criterionSchema),
})

/* ========== Helper ========== */

/** The action path that creates a draft, as opposed to addressing one by id. */
const CREATE_PATH = "create"

/** The action path that replaces a research's criteria. */
const CREATE_CRITERIA_PATH = "create-criteria"

/** The action path that replaces a research's questionnaire. */
const CREATE_QUESTIONS_PATH = "create-questions"

/** The action path that publishes a draft. */
const PUBLISH_PATH = "publish"

/**
 * Whether a segment addresses a research rather than being an action name. Ids are
 * cuids, so an action name in that position is always a mistake.
 */
function isResearchId(segment: string | undefined): segment is string {
    return segment !== undefined && segment !== "" && segment !== CREATE_PATH
}

/** Path below `/api/research`, e.g. `create` for `/api/research/create`. */
function getResearchPath(req: NextRequest) {
    return req.nextUrl.pathname.replace(/^\/api\/research\/?/, "")
}

/** Path segments, e.g. `["res_1", "create-questions"]`. */
function getResearchSegments(req: NextRequest) {
    return getResearchPath(req).split("/").filter(Boolean)
}

/** The research id in the URL, or `null` when the path is not a single id. */
function getResearchId(req: NextRequest) {
    const segments = getResearchSegments(req)

    return segments.length === 1 && isResearchId(segments[0]) ? segments[0] : null
}

function notFound() {
    return exceptionResponse({ message: "Not Found", statusCode: 404 })
}

/**
 * Wraps a verb so it can only run for a signed-in researcher.
 *
 * Both checks live here instead of in every verb, so a new endpoint cannot be
 * added without them.
 */
function withResearcherGuard(handler: (user: Session["user"], req: NextRequest) => Promise<NextResponse>) {
    return async (req: NextRequest) => {
        try {
            const { user } = await requireSession()
            // Array membership on the `roles` JSON list, not a string match.
            requireRole(user.roles, "researcher")

            return await handler(user, req)
        } catch (error) {
            return handleRouteError(error)
        }
    }
}

/* ========== Handler ========== */

/** create a research draft */
async function createResearchHandler(user: Session["user"]) {
    const research = await createResearchDraftService({ researcherId: user.id })

    return successResponse({ message: "Research draft created", statusCode: 201, data: { research } })
}

/** get one research owned by the caller, with its criteria and questionnaire */
async function getResearchHandler(user: Session["user"], id: string) {
    const research = await getResearchService({ id, researcherId: user.id })

    return successResponse({ message: "Research detail", data: { research } })
}

/** update one research owned by the caller */
async function updateResearchHandler(user: Session["user"], req: NextRequest, id: string) {
    const body = parseBody(updateResearchSchema, await readJsonBody(req))
    const research = await updateResearchService({ id, researcherId: user.id, ...body })

    return successResponse({ message: "Research updated", data: { research } })
}

/** replace the questionnaire of one research owned by the caller */
async function createQuestionsHandler(user: Session["user"], req: NextRequest, id: string) {
    const body = parseBody(createQuestionsSchema, await readJsonBody(req))
    const research = await replaceResearchQuestionsService({ id, researcherId: user.id, questions: body.questions })

    return successResponse({ message: "Research questions saved", data: { research } })
}

/** delete one research owned by the caller */
async function deleteResearchHandler(user: Session["user"], id: string) {
    const result = await deleteResearchService({ id, researcherId: user.id })

    return successResponse({ message: result.softDeleted ? "Research archived" : "Research deleted", data: result })
}

/** replace the criteria of one research owned by the caller */
async function createCriteriaHandler(user: Session["user"], req: NextRequest, id: string) {
    const body = parseBody(createCriteriaSchema, await readJsonBody(req))
    const research = await replaceResearchCriteriaService({ id, researcherId: user.id, criteria: body.criteria })

    return successResponse({ message: "Research criteria saved", data: { research } })
}

/** publish one research owned by the caller */
async function publishResearchHandler(user: Session["user"], id: string) {
    const research = await publishResearchService({ id, researcherId: user.id })

    return successResponse({ message: "Research published", data: { research } })
}

export const POST = withResearcherGuard(async (user, req) => {
    const segments = getResearchSegments(req)

    if (segments.length === 1 && segments[0] === CREATE_PATH) return createResearchHandler(user)

    if (segments.length === 2 && isResearchId(segments[0])) {
        if (segments[1] === CREATE_CRITERIA_PATH) return createCriteriaHandler(user, req, segments[0])
        if (segments[1] === CREATE_QUESTIONS_PATH) return createQuestionsHandler(user, req, segments[0])
        if (segments[1] === PUBLISH_PATH) return publishResearchHandler(user, segments[0])
    }

    return notFound()
})

export const GET = withResearcherGuard(async (user, req) => {
    const id = getResearchId(req)

    return id === null ? notFound() : getResearchHandler(user, id)
})

export const PATCH = withResearcherGuard(async (user, req) => {
    const id = getResearchId(req)

    return id === null ? notFound() : updateResearchHandler(user, req, id)
})

export const DELETE = withResearcherGuard(async (user, req) => {
    const id = getResearchId(req)

    return id === null ? notFound() : deleteResearchHandler(user, id)
})
