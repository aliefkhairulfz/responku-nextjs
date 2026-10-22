import type { ResearchCategory } from "@/lib/research-category"
import { BadRequestException, ConflictException, NotFoundException } from "@/lib/server/http-exception"
import type { Prisma } from "@/prisma/generated/prisma/client"
import { type CriteriaOperator, QuestionType, ResearchStatus } from "@/prisma/generated/prisma/enums"
import type { ResearchModel } from "@/prisma/generated/prisma/models/Research"
import { prisma } from "@/prisma/prisma"

/* ========== Konstanta ========== */

/**
 * Deadline a new draft gets, counted from creation.
 *
 * `Research.deadline` is NOT NULL, so a value is required from the start; this is
 * the default until the researcher sets the real one.
 */
const DRAFT_DEADLINE_DAYS = 15

/**
 * Statuses whose definition is frozen.
 *
 * Editing one would change what respondents already saw, so the update and the
 * questionnaire endpoints refuse to touch a research in any of these states.
 */
const IMMUTABLE_STATUSES: ResearchStatus[] = [ResearchStatus.PUBLISHED]

/** Criteria operators the API accepts, mirroring the Prisma enum. */
export const CRITERIA_OPERATORS = ["EQ", "NEQ", "IN", "NOT_IN", "GT", "GTE", "LT", "LTE", "BETWEEN"] as const

/* ========== Tipe ========== */

export type ResearchCriterionInput = {
    field: string
    operator: CriteriaOperator
    value: string
}

export type ResearchChoiceInput = {
    pos: number
    n: string
    /** Optional for a `TEXT` question, required for every other type. */
    choiceText?: string | null
}

export type ResearchQuestionInput = {
    pos: number
    question: string
    questionType: QuestionType
    mustFill?: boolean
    choices?: ResearchChoiceInput[]
}

/** Fields the research editor owns; everything else moves through its own flow. */
export type UpdateResearchInput = {
    id: string
    researcherId: string
    title?: string
    description?: string
    /** `null` clears the category. */
    category?: ResearchCategory | null
    externalSurveyUrl?: string | null
    targetRespondentCount?: number
    estimatedDurationMinutes?: number
    deadline?: Date
    /** Replaces the research's whole criteria list when present. */
    criteria?: ResearchCriterionInput[]
}

/* ========== Helper ========== */

/**
 * Relations every detail read needs, ordered so the client can render straight
 * away without sorting anything itself.
 */
const RESEARCH_DETAIL_INCLUDE = {
    criteria: { orderBy: { createdAt: "asc" } },
    questions: {
        orderBy: { pos: "asc" },
        include: { choices: { orderBy: { pos: "asc" } } },
    },
} satisfies Prisma.ResearchInclude

type ResearchDetail = Prisma.ResearchGetPayload<{ include: typeof RESEARCH_DETAIL_INCLUDE }>

function draftDeadline(): Date {
    return new Date(Date.now() + DRAFT_DEADLINE_DAYS * 24 * 60 * 60 * 1000)
}

/** Refuses an edit once a research's definition is frozen. */
function assertEditable(research: { status: ResearchStatus }): void {
    if (IMMUTABLE_STATUSES.includes(research.status)) {
        throw new ConflictException(`A research with status ${research.status} can no longer be edited`)
    }
}

/**
 * Refuses to change a research's criteria or questionnaire once it has been
 * published.
 *
 * Both define what the research asks and of whom, so changing them would
 * invalidate what respondents already saw or joined. The questionnaire is also
 * technically impossible to replace afterwards: replacing it means deleting the
 * questions, and they cannot be soft-deleted because `ResearchQuestion` is unique
 * on `(researchId, pos)` — the replacements would collide with the old rows —
 * while deleting them outright fails once `ParticipationAnswer` rows point at them.
 */
function assertDefinitionEditable(research: { publishedAt: Date | null }): void {
    if (research.publishedAt !== null) {
        throw new ConflictException("A published research's criteria and questionnaire can no longer be changed")
    }
}

/** Swaps a research's criteria for the list given, inside an existing transaction. */
async function writeCriteria(tx: Prisma.TransactionClient, researchId: string, criteria: ResearchCriterionInput[]) {
    await tx.researchCriteria.deleteMany({ where: { researchId } })

    if (criteria.length > 0) {
        await tx.researchCriteria.createMany({
            data: criteria.map((criterion) => ({ researchId, ...criterion })),
        })
    }
}

/**
 * Whether a question type's options have to carry a label.
 *
 * An essay / short-answer question (`TEXT`) stores only answer codes, so its
 * `choiceText` may be empty; every other type needs one.
 */
export function choiceTextRequired(questionType: QuestionType): boolean {
    return questionType !== QuestionType.TEXT
}

/**
 * Maps the stored research onto what the client needs, without the soft-delete
 * bookkeeping.
 */
function toResearchResponse(research: ResearchModel) {
    return {
        id: research.id,
        researcherId: research.researcherId,
        title: research.title,
        description: research.description,
        category: research.category,
        externalSurveyUrl: research.externalSurveyUrl,
        targetRespondentCount: research.targetRespondentCount,
        estimatedDurationMinutes: research.estimatedDurationMinutes,
        deadline: research.deadline,
        status: research.status,
        tokensReserved: research.tokensReserved,
        tokensConsumed: research.tokensConsumed,
        publishedAt: research.publishedAt,
        createdAt: research.createdAt,
        updatedAt: research.updatedAt,
    }
}

/** The scalars plus the criteria and questionnaire the editor loads. */
function toResearchDetail(research: ResearchDetail) {
    return {
        ...toResearchResponse(research),
        criteria: research.criteria.map((criterion) => ({
            id: criterion.id,
            field: criterion.field,
            operator: criterion.operator,
            value: criterion.value,
        })),
        questions: research.questions.map((question) => ({
            id: question.id,
            pos: question.pos,
            question: question.question,
            questionType: question.questionType,
            mustFill: question.mustFill,
            choices: question.choices.map((choice) => ({
                id: choice.id,
                pos: choice.pos,
                n: choice.n,
                choiceText: choice.choiceText,
            })),
        })),
    }
}

/** Re-reads a research the caller has already been allowed to see. */
async function readResearchDetail(id: string) {
    const research = await prisma.research.findUniqueOrThrow({ where: { id }, include: RESEARCH_DETAIL_INCLUDE })

    return toResearchDetail(research)
}

/** Finds a research by id, scoped to its owner, or throws a 404. */
async function findOwnedResearch(id: string, researcherId: string) {
    const research = await prisma.research.findFirst({
        where: { id, researcherId, deletedAt: null },
        select: { id: true, status: true, publishedAt: true },
    })

    if (research === null) throw new NotFoundException("Research not found")

    return research
}

/** Refuses to publish a research that is not complete enough to be shown. */
async function assertPublishable(id: string): Promise<void> {
    const research = await prisma.research.findUniqueOrThrow({
        where: { id },
        select: {
            title: true,
            category: true,
            targetRespondentCount: true,
            deadline: true,
            _count: { select: { questions: true } },
        },
    })

    const errors: Record<string, string> = {}

    if (research.title.trim().length === 0) errors.title = "A title is required before publishing."
    if (research.category === null) errors.category = "Pick a topic category before publishing."
    if (research.targetRespondentCount < 1) errors.targetRespondentCount = "Ask for at least one respondent."
    if (research.deadline.getTime() <= Date.now()) errors.deadline = "The deadline has already passed."
    if (research._count.questions === 0) errors.questions = "Add at least one question first."

    if (Object.keys(errors).length > 0) {
        throw new BadRequestException("This research is not ready to publish", errors)
    }
}

/* ========== Create draft ========== */

/**
 * Creates the empty draft a researcher then fills in.
 *
 * The client deliberately sends no body: the skeleton is owned by the backend so
 * every research starts from the same known state, and the caller only needs the
 * returned `id` to keep filling it in.
 */
export async function createResearchDraftService({ researcherId }: { researcherId: string }) {
    const research = await prisma.research.create({
        data: {
            researcherId,
            title: "",
            description: "",
            externalSurveyUrl: null,
            targetRespondentCount: 0,
            estimatedDurationMinutes: 1,
            deadline: draftDeadline(),
            status: ResearchStatus.DRAFT,
            tokensReserved: 0,
            tokensConsumed: 0,
            publishedAt: null,
        },
    })

    return toResearchResponse(research)
}

/* ========== Read ========== */

/**
 * Returns one research owned by `researcherId`, with its criteria and
 * questionnaire.
 *
 * Scoped to the owner: a draft is private, and looking up by id alone would let
 * any researcher read somebody else's work in progress.
 */
export async function getResearchService({ id, researcherId }: { id: string; researcherId: string }) {
    const research = await prisma.research.findFirst({
        where: { id, researcherId, deletedAt: null },
        include: RESEARCH_DETAIL_INCLUDE,
    })

    if (research === null) throw new NotFoundException("Research not found")

    return toResearchDetail(research)
}

/* ========== Update ========== */

/**
 * Applies a partial update to one research owned by `researcherId`.
 *
 * Only the fields the editor owns are writable: status transitions (publishing)
 * and the token ledger move through their own flows. Criteria are replaced as a
 * whole when sent, because the editor submits the complete list.
 */
export async function updateResearchService({ id, researcherId, criteria, ...patch }: UpdateResearchInput) {
    const research = await findOwnedResearch(id, researcherId)

    assertEditable(research)
    // Criteria are part of the definition, so they freeze with the questionnaire.
    if (criteria !== undefined) assertDefinitionEditable(research)

    await prisma.$transaction(async (tx) => {
        await tx.research.update({
            where: { id },
            data: {
                title: patch.title,
                description: patch.description,
                category: patch.category,
                externalSurveyUrl: patch.externalSurveyUrl,
                targetRespondentCount: patch.targetRespondentCount,
                estimatedDurationMinutes: patch.estimatedDurationMinutes,
                deadline: patch.deadline,
            },
        })

        if (criteria !== undefined) await writeCriteria(tx, id, criteria)
    })

    return readResearchDetail(id)
}

/* ========== Criteria ========== */

/**
 * Replaces the whole criteria list of one research owned by `researcherId`.
 *
 * An empty list is valid — it means the research targets everyone.
 */
export async function replaceResearchCriteriaService({
    id,
    researcherId,
    criteria,
}: {
    id: string
    researcherId: string
    criteria: ResearchCriterionInput[]
}) {
    const research = await findOwnedResearch(id, researcherId)

    assertEditable(research)
    assertDefinitionEditable(research)

    await prisma.$transaction(async (tx) => {
        await writeCriteria(tx, id, criteria)
    })

    return readResearchDetail(id)
}

/* ========== Questions ========== */

/**
 * Replaces the questionnaire of one research owned by `researcherId`.
 *
 * The endpoint is named `create-questions`, but it replaces rather than appends:
 * the editor submits the whole questionnaire, and both `ResearchQuestion` and
 * `ResearchQuestionChoice` are unique on their `(parent, pos)` pair, so a second
 * save would collide instead of adding anything.
 *
 * Choices are written nested inside their question, so Prisma fills in the
 * `questionId` foreign key.
 */
export async function replaceResearchQuestionsService({
    id,
    researcherId,
    questions,
}: {
    id: string
    researcherId: string
    questions: ResearchQuestionInput[]
}) {
    const research = await findOwnedResearch(id, researcherId)

    assertEditable(research)
    assertDefinitionEditable(research)

    await prisma.$transaction(async (tx) => {
        // Choices cascade with the question they belong to.
        await tx.researchQuestion.deleteMany({ where: { researchId: id } })

        await tx.research.update({
            where: { id },
            data: {
                questions: {
                    create: questions.map((question) => ({
                        pos: question.pos,
                        question: question.question,
                        questionType: question.questionType,
                        mustFill: question.mustFill ?? true,
                        choices: {
                            create: (question.choices ?? []).map((choice) => ({
                                pos: choice.pos,
                                n: choice.n,
                                choiceText: choice.choiceText ?? null,
                            })),
                        },
                    })),
                },
            },
        })
    })

    return readResearchDetail(id)
}

/* ========== Delete ========== */

/**
 * Deletes one research owned by `researcherId`.
 *
 * A research that has been published may already be referenced by
 * participations, answers and token transactions, so it is only archived — the
 * row stays and every read already filters `deletedAt`. A draft that was never
 * published is referenced by nothing, so it is removed for good, taking its
 * criteria and questions with it.
 */
export async function deleteResearchService({ id, researcherId }: { id: string; researcherId: string }) {
    const research = await findOwnedResearch(id, researcherId)

    if (research.publishedAt !== null) {
        await prisma.research.update({ where: { id }, data: { deletedAt: new Date() } })

        return { id, softDeleted: true }
    }

    await prisma.research.delete({ where: { id } })

    return { id, softDeleted: false }
}

/* ========== Publish ========== */

/**
 * Publishes a draft so respondents can take it.
 *
 * Only a draft can be published, and only once it is complete enough to be shown.
 * Publishing stamps `publishedAt`, which is what later freezes the questionnaire
 * and turns a delete into an archive.
 *
 * Reserving tokens is not done here — the token ledger has its own flow.
 */
export async function publishResearchService({ id, researcherId }: { id: string; researcherId: string }) {
    const research = await findOwnedResearch(id, researcherId)

    if (research.status !== ResearchStatus.DRAFT) {
        throw new ConflictException(`Only a draft can be published, this research is ${research.status}`)
    }

    await assertPublishable(id)

    await prisma.research.update({
        where: { id },
        data: { status: ResearchStatus.PUBLISHED, publishedAt: new Date() },
    })

    return readResearchDetail(id)
}
