import { ConflictException, NotFoundException } from '@/lib/server/http-exception'
import { type QualitySignalInput, screenSubmission } from '@/lib/server/quality'
import { toTiming } from '@/lib/server/timing'
import type { Prisma } from '@/prisma/generated/prisma/client'
import { QualityDecision } from '@/prisma/generated/prisma/enums'
import { prisma } from '@/prisma/prisma'

/**
 * The moderation side of a submission: the automatic signals it carries, and an admin's
 * decision on them.
 *
 * A quality check is one row per submission, written when the submission is sent in
 * (`createQualityCheckService`, called from the submit flow) and decided later by an admin.
 * The signals are heuristics — pace and answer pattern — so the row is a note that says
 * "read this one", not a verdict. Deciding it does not pay or reject the participation:
 * that is `reviewParticipationService`, and the two flows stay independent.
 */

/* ========== Konstanta ========== */

/** How many quality checks the admin queue returns. */
const DEFAULT_QUALITY_CHECK_LIMIT = 50

/* ========== Bentuk baca ========== */

/** What the queue needs: the check, plus the submission and research it is about. */
const LIST_INCLUDE = {
    participation: {
        select: {
            id: true,
            status: true,
            respondentId: true,
            researchId: true,
            submittedAt: true,
            respondent: { select: { name: true } },
            research: { select: { id: true, title: true } },
        },
    },
} satisfies Prisma.QualityCheckInclude

/**
 * What the detail view needs to inspect the submission, without bloating the queue.
 *
 * Everything an admin needs to judge one submission in a single read: the research as the
 * respondent saw it, the two timestamps the pace was measured between, the reward at stake,
 * and the answers themselves.
 */
const DETAIL_INCLUDE = {
    participation: {
        select: {
            id: true,
            status: true,
            respondentId: true,
            researchId: true,
            screeningScore: true,
            autoScreeningResult: true,
            startedAt: true,
            submittedAt: true,
            createdAt: true,
            respondent: { select: { name: true, email: true } },
            reward: { select: { respondentTokenAmount: true, status: true, paidAt: true } },
            research: {
                select: {
                    id: true,
                    title: true,
                    description: true,
                    category: true,
                    tokenPerRespondent: true,
                    estimatedDurationMinutes: true,
                    deadline: true,
                    status: true,
                    researcher: { select: { name: true } },
                    questions: {
                        where: { deletedAt: null },
                        orderBy: { pos: 'asc' },
                        select: {
                            id: true,
                            pos: true,
                            question: true,
                            questionType: true,
                            mustFill: true,
                            choices: {
                                where: { deletedAt: null },
                                orderBy: { pos: 'asc' },
                                select: { id: true, pos: true, n: true, choiceText: true },
                            },
                        },
                    },
                },
            },
            answers: {
                where: { deletedAt: null },
                select: { researchQuestionId: true, choiceIds: true, answerText: true },
            },
        },
    },
} satisfies Prisma.QualityCheckInclude

type QualityCheckRow = Prisma.QualityCheckGetPayload<{ include: typeof LIST_INCLUDE }>
type QualityCheckDetailRow = Prisma.QualityCheckGetPayload<{ include: typeof DETAIL_INCLUDE }>

/* ========== Helper ========== */

/** The signal flags of a stored row, ignoring anything that is not a string. */
function toSignalFlags(value: unknown): string[] {
    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string')
        : []
}

/** The choice ids of a stored answer, ignoring anything that is not a string. */
function toChoiceIds(value: unknown): string[] {
    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string')
        : []
}

/** Public view of a quality check, without the soft-delete bookkeeping. */
function toQualityCheckResponse(check: QualityCheckRow | QualityCheckDetailRow) {
    return {
        id: check.id,
        participationId: check.participationId,
        decision: check.decision,
        signalFlags: toSignalFlags(check.signalFlags),
        autoScore: check.autoScore === null ? null : Number(check.autoScore),
        reviewedBy: check.reviewedBy,
        createdAt: check.createdAt,
        // The row has no `reviewedAt` of its own; the decision is the last write, so this is
        // when it was made.
        updatedAt: check.updatedAt,
        participation: {
            id: check.participation.id,
            status: check.participation.status,
            respondentId: check.participation.respondentId,
            respondentName: check.participation.respondent.name,
            researchId: check.participation.researchId,
            researchTitle: check.participation.research.title,
            submittedAt: check.participation.submittedAt,
        },
    }
}

/** Reads one quality check, or throws a 404. */
async function findQualityCheck(id: string) {
    const check = await prisma.qualityCheck.findFirst({
        where: { id, deletedAt: null },
        include: LIST_INCLUDE,
    })

    if (check === null) throw new NotFoundException('Quality check not found')

    return check
}

/* ========== Auto-screening ========== */

/**
 * Records the automatic signals for a submission.
 *
 * Called from the submit flow, inside its transaction, so a submission and the check it
 * produces are written together: a submission that is never screened is one an admin would
 * have to remember to screen by hand. The row starts `PENDING`, waiting for a decision.
 */
export async function createQualityCheckService(
    tx: Prisma.TransactionClient,
    { participationId, ...input }: { participationId: string } & QualitySignalInput,
) {
    const { signalFlags, autoScore } = screenSubmission(input)

    return tx.qualityCheck.create({
        data: { participationId, signalFlags, autoScore },
        select: { id: true },
    })
}

/* ========== Baca ========== */

/** Lists quality checks for the admin queue, most recently created first. */
export async function listQualityChecksService({
    decision,
    take,
}: {
    decision?: QualityDecision
    take?: number
}) {
    const checks = await prisma.qualityCheck.findMany({
        where: { deletedAt: null, ...(decision === undefined ? {} : { decision }) },
        orderBy: { createdAt: 'desc' },
        take: take ?? DEFAULT_QUALITY_CHECK_LIMIT,
        include: LIST_INCLUDE,
    })

    return checks.map(toQualityCheckResponse)
}

/**
 * One quality check, with everything needed to judge the submission it is about.
 *
 * The queue carries a summary; this carries the whole picture — the research as the
 * respondent saw it, when they started and sent it in, how long that took against the
 * estimate the `SPEEDING` flag was computed from, the reward at stake, and every answer.
 */
export async function getQualityCheckService({ id }: { id: string }) {
    const check = await prisma.qualityCheck.findFirst({
        where: { id, deletedAt: null },
        include: DETAIL_INCLUDE,
    })

    if (check === null) throw new NotFoundException('Quality check not found')

    const base = toQualityCheckResponse(check)
    const { participation } = check
    const answersByQuestion = new Map(
        participation.answers.map((answer) => [answer.researchQuestionId, answer]),
    )

    return {
        ...base,
        participation: {
            ...base.participation,
            respondentEmail: participation.respondent.email,
            screeningScore: participation.screeningScore,
            screeningResult: participation.autoScreeningResult,
            startedAt: participation.startedAt,
            createdAt: participation.createdAt,
            timing: toTiming({
                // Rows that predate the column have no start of their own, so their join is
                // the closest honest one — the same fallback the screening used.
                startedAt: participation.startedAt ?? participation.createdAt,
                completedAt: participation.submittedAt,
                estimatedDurationMinutes: participation.research.estimatedDurationMinutes,
                totalQuestions: participation.research.questions.length,
            }),
            reward:
                participation.reward === null
                    ? null
                    : {
                          tokenAmount: Number(participation.reward.respondentTokenAmount),
                          status: participation.reward.status,
                          paidAt: participation.reward.paidAt,
                      },
            research: {
                id: participation.research.id,
                title: participation.research.title,
                description: participation.research.description,
                category: participation.research.category,
                researcherName: participation.research.researcher.name,
                tokenPerRespondent: participation.research.tokenPerRespondent,
                estimatedDurationMinutes: participation.research.estimatedDurationMinutes,
                deadline: participation.research.deadline,
                status: participation.research.status,
            },
            questions: participation.research.questions.map((question) => {
                const answer = answersByQuestion.get(question.id)

                return {
                    id: question.id,
                    pos: question.pos,
                    question: question.question,
                    questionType: question.questionType,
                    mustFill: question.mustFill,
                    choices: question.choices,
                    answer: {
                        selected: toChoiceIds(answer?.choiceIds),
                        text: answer?.answerText ?? null,
                    },
                }
            }),
        },
    }
}

/* ========== Tinjau ========== */

/** The two decisions an admin can make on a quality check. */
export type QualityReviewDecision = 'APPROVED' | 'REJECTED'

/**
 * Decides a quality check.
 *
 * A check is decided once: anything past `PENDING` is refused rather than overwritten, so
 * the first decision is the one that stands. The decision is a moderation note about the
 * submission — it does not pay or reject the participation, which keeps its own flow.
 */
export async function reviewQualityCheckService({
    id,
    reviewerId,
    decision,
}: {
    id: string
    reviewerId: string
    decision: QualityReviewDecision
}) {
    const result = await prisma.qualityCheck.updateMany({
        where: { id, deletedAt: null, decision: QualityDecision.PENDING },
        data: { decision, reviewedBy: reviewerId },
    })

    if (result.count === 0) {
        const check = await prisma.qualityCheck.findFirst({
            where: { id, deletedAt: null },
            select: { decision: true },
        })

        if (check === null) throw new NotFoundException('Quality check not found')

        throw new ConflictException(
            `This quality check is ${check.decision} and has already been decided`,
        )
    }

    return toQualityCheckResponse(await findQualityCheck(id))
}
