import type { ResearchCategory } from "@/lib/research-category"
import { BadRequestException, ConflictException, NotFoundException } from "@/lib/server/http-exception"
import { IDR_PER_TOKEN } from "@/lib/server/token-price"
import type { Prisma } from "@/prisma/generated/prisma/client"
import {
    type CriteriaOperator,
    ParticipationStatus,
    QuestionType,
    ResearchStatus,
    RewardStatus,
    TokenTransactionType,
} from "@/prisma/generated/prisma/enums"
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

/** Cap on the reward budget, mirroring the editor's own limit. */
const TOKEN_TOTAL_LIMIT = 1_000_000

/** How many rows a list returns when the caller does not say. */
const DEFAULT_RESEARCH_LIMIT = 50

const DAY_MS = 86_400_000

/**
 * Whole days until a deadline, never negative.
 *
 * Derived on the server for the same reason the reward is: it reads a clock, and a
 * component that reads one during render is not a pure component.
 */
function daysUntil(deadline: Date): number {
    return Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / DAY_MS))
}

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
    /** Reward per respondent; the reservation at publish is target × this. */
    tokenPerRespondent?: number
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
 * Hands whatever is still held back to the researcher's wallet.
 *
 * Publishing reserves the whole reward budget up front, so when a research stops
 * asking for respondents the share nobody consumed must not stay in limbo. The
 * ledger row is keyed by the research, which makes a second release — closing and
 * then archiving — a no-op rather than a double refund.
 *
 * Submissions still waiting for a review are closed out here as well. Their reward would
 * have been paid from the very budget this hands back, so leaving them `PENDING` would
 * promise tokens that no longer exist — and an approval after the fact would mint them.
 * `EXPIRED` is the honest status for the participation: the research ended before the work
 * was decided.
 */
async function releaseReservation(
    tx: Prisma.TransactionClient,
    research: { id: string; researcherId: string; tokensReserved: number; tokensConsumed: number },
) {
    await tx.reward.updateMany({
        where: { participation: { researchId: research.id }, status: RewardStatus.PENDING },
        data: { status: RewardStatus.CANCELLED },
    })

    await tx.respondentParticipation.updateMany({
        where: { researchId: research.id, status: { in: [ParticipationStatus.SUBMITTED, ParticipationStatus.UNDER_REVIEW] } },
        data: { status: ParticipationStatus.EXPIRED },
    })

    const amount = research.tokensReserved - research.tokensConsumed
    if (amount <= 0) return 0

    const wallet = await tx.tokenWallet.upsert({
        where: { userId: research.researcherId },
        // Accounts created before wallets were made at registration have none.
        create: { userId: research.researcherId, balance: amount },
        update: { balance: { increment: amount } },
        select: { id: true },
    })

    await tx.tokenTransaction.create({
        data: {
            walletId: wallet.id,
            researchId: research.id,
            type: TokenTransactionType.RELEASE,
            // Credits are positive, the mirror of the reserve's negative debit.
            amount,
            idempotencyKey: `research-release:${research.id}`,
        },
    })

    // Nothing is held for this research any more. `tokensConsumed` is left alone, so
    // whatever respondents already earned stays accounted for.
    await tx.research.update({ where: { id: research.id }, data: { tokensReserved: 0 } })

    return amount
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
        tokenPerRespondent: research.tokenPerRespondent,
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
        select: { id: true, status: true, publishedAt: true, tokensReserved: true, tokensConsumed: true },
    })

    if (research === null) throw new NotFoundException("Research not found")

    return research
}

/** Everything the publish checklist looks at. */
type PublishChecklist = {
    title: string
    category: string | null
    targetRespondentCount: number
    deadline: Date
    _count: { questions: number }
}

/** Refuses to publish a research that is not complete enough to be shown. */
function assertPublishable(research: PublishChecklist): void {
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

/* ========== Available to respondents ========== */

/** The research header the respondent's feed and its detail page share. */
const AVAILABLE_RESEARCH_SELECT = {
    id: true,
    title: true,
    description: true,
    category: true,
    tokenPerRespondent: true,
    estimatedDurationMinutes: true,
    deadline: true,
    targetRespondentCount: true,
    researcher: { select: { name: true } },
    _count: {
        select: {
            // Same rule as the researcher's list: only answers actually sent in.
            participations: { where: { submittedAt: { not: null } } },
        },
    },
} satisfies Prisma.ResearchSelect

/**
 * The same header plus the caller's own participation.
 *
 * Both places that read a research need to know whether the respondent has already started
 * it — the feed so its card can offer to carry on, the detail page so its button can say so.
 * Spread from the static base so Prisma keeps the literal types it needs to type the result.
 */
function availableResearchSelect(respondentId: string) {
    return {
        ...AVAILABLE_RESEARCH_SELECT,
        participations: { where: { respondentId, deletedAt: null }, select: { id: true, status: true }, take: 1 },
    } satisfies Prisma.ResearchSelect
}

type AvailableResearchRow = Prisma.ResearchGetPayload<{ select: typeof AVAILABLE_RESEARCH_SELECT }>

/** Maps a research onto what a respondent's card and detail page read. */
function toAvailableResearchResponse(research: AvailableResearchRow) {
    return {
        id: research.id,
        title: research.title,
        description: research.description,
        category: research.category,
        researcherName: research.researcher.name,
        tokenPerRespondent: research.tokenPerRespondent,
        // Priced here rather than in the browser: the token price is a server variable,
        // and a client should not have to know it to show a reward.
        rewardIdr: research.tokenPerRespondent * IDR_PER_TOKEN,
        estimatedDurationMinutes: research.estimatedDurationMinutes,
        deadline: research.deadline,
        daysLeft: daysUntil(research.deadline),
        respondentCount: research._count.participations,
        targetRespondentCount: research.targetRespondentCount,
    }
}

/**
 * Lists the research a respondent can still take.
 *
 * Published only, never their own, and never one they have already **sent in** — a research
 * they have begun but not finished stays in the feed, so the card can offer to carry on
 * instead of the work quietly becoming unreachable. A deadline that has passed drops out on
 * its own, since such a research is no longer taking answers even though its status is still
 * `PUBLISHED`.
 */
export async function listAvailableResearchService({
    respondentId,
    category,
    take,
}: {
    respondentId: string
    category?: ResearchCategory
    take?: number
}) {
    const researches = await prisma.research.findMany({
        where: {
            status: ResearchStatus.PUBLISHED,
            deletedAt: null,
            deadline: { gt: new Date() },
            researcherId: { not: respondentId },
            ...(category === undefined ? {} : { category }),
            participations: { none: { respondentId, deletedAt: null, submittedAt: { not: null } } },
        },
        orderBy: { publishedAt: "desc" },
        take: take ?? DEFAULT_RESEARCH_LIMIT,
        select: availableResearchSelect(respondentId),
    })

    return researches.map((research) => ({
        ...toAvailableResearchResponse(research),
        participation: research.participations[0] ?? null,
    }))
}

/**
 * One research from the respondent's pool, for its detail page.
 *
 * The availability rules are the feed's, applied to a single id, so the detail page
 * cannot show something the feed would have hidden. The one deliberate difference is
 * that a research the caller has already joined is still returned, together with their
 * participation: that is exactly the case where the page should offer to carry on
 * rather than to start.
 *
 * The criteria travel as the stored rules; how they read is the client's business.
 */
export async function getAvailableResearchService({ id, respondentId }: { id: string; respondentId: string }) {
    const research = await prisma.research.findFirst({
        where: {
            id,
            status: ResearchStatus.PUBLISHED,
            deletedAt: null,
            deadline: { gt: new Date() },
            researcherId: { not: respondentId },
        },
        select: {
            ...availableResearchSelect(respondentId),
            criteria: { select: { id: true, field: true, operator: true, value: true } },
        },
    })

    // Not published, past its deadline, archived, their own, or simply unknown: all the
    // same answer, so a respondent never learns that a research exists but is not theirs.
    if (research === null) throw new NotFoundException("Research not found")

    return {
        research: {
            ...toAvailableResearchResponse(research),
            criteria: research.criteria.map((criterion) => ({
                id: criterion.id,
                field: criterion.field,
                operator: criterion.operator,
                value: criterion.value,
            })),
        },
        participation: research.participations[0] ?? null,
    }
}

/* ========== Read ========== */

/**
 * Lists the researches owned by `researcherId`, most recently touched first.
 *
 * Scoped to the owner and to rows that are not archived, so a list can never show
 * somebody else's work or a deleted one. Only the fields a list needs are read —
 * the questionnaire and criteria are several queries of their own.
 */
export async function listResearchesService({ researcherId, status, take }: { researcherId: string; status?: ResearchStatus; take?: number }) {
    const researches = await prisma.research.findMany({
        where: { researcherId, deletedAt: null, ...(status === undefined ? {} : { status }) },
        orderBy: { updatedAt: "desc" },
        take: take ?? DEFAULT_RESEARCH_LIMIT,
        select: {
            id: true,
            title: true,
            status: true,
            updatedAt: true,
            targetRespondentCount: true,
            tokensReserved: true,
            tokensConsumed: true,
            _count: {
                select: {
                    questions: true,
                    // Only answers that were actually sent in; joining is not filling it out.
                    participations: { where: { submittedAt: { not: null } } },
                },
            },
        },
    })

    return researches.map((research) => ({
        id: research.id,
        title: research.title,
        status: research.status,
        questionCount: research._count.questions,
        targetRespondentCount: research.targetRespondentCount,
        tokensReserved: research.tokensReserved,
        tokensConsumed: research.tokensConsumed,
        respondentCount: research._count.participations,
        updatedAt: research.updatedAt,
    }))
}

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
                tokenPerRespondent: patch.tokenPerRespondent,
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
 * A research that has been published may already be referenced by participations,
 * answers and token transactions, so it is only archived — the row stays and every
 * read already filters `deletedAt`. Archiving also returns the unused part of its
 * reward budget, so a removed research does not sit on the researcher's tokens.
 *
 * A draft that was never published is referenced by nothing, so it is removed for
 * good, taking its criteria and questions with it.
 */
export async function deleteResearchService({ id, researcherId }: { id: string; researcherId: string }) {
    const research = await findOwnedResearch(id, researcherId)

    if (research.publishedAt === null) {
        await prisma.research.delete({ where: { id } })

        return { id, softDeleted: false, tokensReleased: 0 }
    }

    const tokensReleased = await prisma.$transaction(async (tx) => {
        const released = await releaseReservation(tx, {
            id,
            researcherId,
            tokensReserved: research.tokensReserved,
            tokensConsumed: research.tokensConsumed,
        })

        await tx.research.update({ where: { id }, data: { deletedAt: new Date() } })

        return released
    })

    return { id, softDeleted: true, tokensReleased }
}

/* ========== Publish ========== */

/**
 * Publishes a draft so respondents can take it.
 *
 * Only a draft can be published, and only once it is complete enough to be shown.
 * Publishing is also where the reward budget is committed: `targetRespondentCount
 * × tokenPerRespondent` tokens are reserved out of the researcher's wallet, so the
 * money is provably set aside before anybody can join.
 *
 * The reservation, its ledger row, and the status change share one transaction,
 * and the ledger row carries a deterministic idempotency key — retrying a publish
 * can therefore never reserve twice.
 *
 * Releasing the remainder (`closeResearchService`) and paying respondents are
 * separate flows, not part of this.
 */
export async function publishResearchService({ id, researcherId }: { id: string; researcherId: string }) {
    const owned = await findOwnedResearch(id, researcherId)

    if (owned.status !== ResearchStatus.DRAFT) {
        throw new ConflictException(`Only a draft can be published, this research is ${owned.status}`)
    }

    await prisma.$transaction(async (tx) => {
        const research = await tx.research.findUniqueOrThrow({
            where: { id },
            select: {
                status: true,
                title: true,
                category: true,
                targetRespondentCount: true,
                tokenPerRespondent: true,
                deadline: true,
                _count: { select: { questions: true } },
            },
        })

        // Re-checked inside the transaction, so two simultaneous publishes cannot
        // both get past it and reserve twice.
        if (research.status !== ResearchStatus.DRAFT) {
            throw new ConflictException(`Only a draft can be published, this research is ${research.status}`)
        }

        assertPublishable(research)

        const amount = research.targetRespondentCount * research.tokenPerRespondent

        if (amount > TOKEN_TOTAL_LIMIT) {
            throw new BadRequestException("Token allocation is too large", {
                tokenPerRespondent: `The total may not exceed ${TOKEN_TOTAL_LIMIT.toLocaleString("en-US")} tokens.`,
            })
        }

        const wallet = await tx.tokenWallet.findUnique({
            where: { userId: researcherId },
            select: { id: true, balance: true },
        })

        const insufficient = () =>
            new BadRequestException("Not enough tokens to publish", {
                _root: `This research needs ${amount} tokens, the wallet holds ${wallet?.balance ?? 0}.`,
            })

        // A missing wallet simply means there is nothing to reserve from.
        if (wallet === null) throw insufficient()

        // The ceiling travels with the decrement. A plain read-then-check would let
        // two publishes racing on the same wallet both pass it and overdraw.
        const reserved = await tx.tokenWallet.updateMany({
            where: { id: wallet.id, balance: { gte: amount } },
            data: { balance: { decrement: amount } },
        })

        if (reserved.count === 0) throw insufficient()

        await tx.tokenTransaction.create({
            data: {
                walletId: wallet.id,
                researchId: id,
                type: TokenTransactionType.RESERVE,
                // Debits are negative, which is how the wallet view reads them.
                amount: -amount,
                idempotencyKey: `research-reserve:${id}`,
            },
        })

        await tx.research.update({
            where: { id },
            data: { status: ResearchStatus.PUBLISHED, publishedAt: new Date(), tokensReserved: amount },
        })
    })

    return readResearchDetail(id)
}

/* ========== Close ========== */

/**
 * Closes a published research: it stops taking respondents, and the part of its
 * reward budget nobody consumed goes back to the researcher.
 *
 * A draft never reserved anything, so closing one is not offered — delete it instead.
 */
export async function closeResearchService({ id, researcherId }: { id: string; researcherId: string }) {
    const tokensReleased = await prisma.$transaction(async (tx) => {
        const research = await tx.research.findFirst({
            where: { id, researcherId, deletedAt: null },
            select: { id: true, researcherId: true, status: true, tokensReserved: true, tokensConsumed: true },
        })

        if (research === null) throw new NotFoundException("Research not found")

        if (research.status !== ResearchStatus.PUBLISHED) {
            throw new ConflictException(`Only a published research can be closed, this one is ${research.status}`)
        }

        const released = await releaseReservation(tx, research)

        await tx.research.update({ where: { id }, data: { status: ResearchStatus.CLOSED } })

        return released
    })

    return { research: await readResearchDetail(id), tokensReleased }
}
