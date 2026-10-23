import { ConflictException, NotFoundException } from "@/lib/server/http-exception"
import { type QualitySignalInput, screenSubmission } from "@/lib/server/quality"
import { toTiming } from "@/lib/server/timing"
import type { Prisma } from "@/prisma/generated/prisma/client"
import { ParticipationStatus, QualityDecision, RewardStatus, TokenTransactionType } from "@/prisma/generated/prisma/enums"
import { prisma } from "@/prisma/prisma"

/**
 * The decision point for a submission: the automatic signals it carries, and the admin's
 * final verdict on it.
 *
 * A quality check is one row per submission, written when the submission is sent in
 * (`createQualityCheckService`, called from the submit flow). Deciding it decides the whole
 * submission — the participation's status, the reward, and the wallet credit all move with
 * it, in one transaction (`reviewQualityCheckService`).
 *
 * The signals are heuristics — pace and answer pattern — so they are supporting information,
 * not a verdict: every submission is queued, clean or flagged, and an admin reads it before
 * deciding. Nothing pays out on its own.
 */

/* ========== Konstanta ========== */

/** How many quality checks the admin queue returns. */
const DEFAULT_QUALITY_CHECK_LIMIT = 50

/* ========== Bentuk baca ========== */

/**
 * What the queue needs: the check, plus the submission and research it is about.
 *
 * The demographic screening travels with it — `screeningScore` and `autoScreeningResult` —
 * because it is supporting information an admin reads alongside the signals. It is a
 * different thing from the check: screening decides whether somebody could join, the check
 * decides whether their answers are good enough to pay for.
 */
const LIST_INCLUDE = {
    participation: {
        select: {
            id: true,
            status: true,
            respondentId: true,
            researchId: true,
            screeningScore: true,
            autoScreeningResult: true,
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
                        orderBy: { pos: "asc" },
                        select: {
                            id: true,
                            pos: true,
                            question: true,
                            questionType: true,
                            mustFill: true,
                            choices: {
                                where: { deletedAt: null },
                                orderBy: { pos: "asc" },
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
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

/** The choice ids of a stored answer, ignoring anything that is not a string. */
function toChoiceIds(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
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
            // Demographic screening, carried as supporting information.
            screeningScore: check.participation.screeningScore,
            screeningResult: check.participation.autoScreeningResult,
        },
    }
}

/** Reads one quality check, or throws a 404. */
async function findQualityCheck(id: string) {
    const check = await prisma.qualityCheck.findFirst({
        where: { id, deletedAt: null },
        include: LIST_INCLUDE,
    })

    if (check === null) throw new NotFoundException("Quality check not found")

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

    const check = await tx.qualityCheck.create({
        data: { participationId, signalFlags, autoScore },
        select: { id: true },
    })

    // Hand the computed signals back with the row: the submit flow derives the participation's
    // own screening verdict from these very values, so it never screens the submission twice.
    return { ...check, signalFlags, autoScore }
}

/* ========== Baca ========== */

/** Lists quality checks for the admin queue, most recently created first. */
export async function listQualityChecksService({ decision, take }: { decision?: QualityDecision; take?: number }) {
    const checks = await prisma.qualityCheck.findMany({
        where: { deletedAt: null, ...(decision === undefined ? {} : { decision }) },
        orderBy: { createdAt: "desc" },
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

    if (check === null) throw new NotFoundException("Quality check not found")

    const base = toQualityCheckResponse(check)
    const { participation } = check
    const answersByQuestion = new Map(participation.answers.map((answer) => [answer.researchQuestionId, answer]))

    return {
        ...base,
        participation: {
            ...base.participation,
            respondentEmail: participation.respondent.email,
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

/** The two decisions an admin can make on a submission. */
export type QualityReviewDecision = "APPROVED" | "REJECTED"

/**
 * Statuses a submission is still awaiting a decision in.
 *
 * Anything already approved or rejected is past reviewing, so this doubles as a guard: a
 * second decision on the same submission is refused rather than paying it twice.
 */
const REVIEWABLE_STATUSES: ParticipationStatus[] = [ParticipationStatus.SUBMITTED, ParticipationStatus.UNDER_REVIEW]

/**
 * Decides a submission: the quality check, the participation, and the reward, together.
 *
 * This is the only place a submission is decided, and the only place a respondent is paid.
 * The check is the vehicle — it carries the signals an admin reads — but the decision it
 * records is the final one for the submission, so the two can never disagree.
 *
 * `APPROVED` pays: the wallet is credited, a `REWARD` ledger row is written, the reward is
 * marked `PAID`, and the researcher's consumed counter moves — all in one transaction, so the
 * balance and the ledger cannot end up disagreeing. `REJECTED` cancels the reward and pays
 * nothing; the reservation is left alone, so the researcher's unused budget is still released
 * when the research closes.
 *
 * A submission is decided once. The check is claimed with a conditional update first, which
 * is what makes two concurrent decisions safe: the second matches no row and is refused
 * instead of paying twice. The ledger row's unique key is the second lock.
 */
export async function reviewQualityCheckService({ id, reviewerId, decision }: { id: string; reviewerId: string; decision: QualityReviewDecision }) {
    await prisma.$transaction(async (tx) => {
        // Claim the check. Only a `PENDING` one can be decided, so a second decision — or a
        // concurrent one — matches nothing and is refused below.
        const claimed = await tx.qualityCheck.updateMany({
            where: { id, deletedAt: null, decision: QualityDecision.PENDING },
            data: { decision, reviewedBy: reviewerId },
        })

        if (claimed.count === 0) {
            const existing = await tx.qualityCheck.findFirst({
                where: { id, deletedAt: null },
                select: { decision: true },
            })

            if (existing === null) throw new NotFoundException("Quality check not found")

            throw new ConflictException(`This submission is ${existing.decision} and has already been decided`)
        }

        const check = await tx.qualityCheck.findUniqueOrThrow({
            where: { id },
            select: {
                participation: {
                    select: {
                        id: true,
                        respondentId: true,
                        status: true,
                        researchId: true,
                        reward: { select: { status: true } },
                        research: {
                            select: {
                                tokenPerRespondent: true,
                                tokensReserved: true,
                                tokensConsumed: true,
                            },
                        },
                    },
                },
            },
        })

        const { participation } = check

        if (!REVIEWABLE_STATUSES.includes(participation.status)) {
            throw new ConflictException(`This participation is ${participation.status} and is no longer awaiting review`)
        }

        // A reward that is no longer pending was either cancelled by an earlier decision or
        // paid already — nothing either way for this to settle.
        if (participation.reward !== null && participation.reward.status !== RewardStatus.PENDING) {
            throw new ConflictException(`This participation's reward is ${participation.reward.status}`)
        }

        const reviewedAt = new Date()

        if (decision === "REJECTED") {
            await tx.reward.updateMany({
                where: { participationId: participation.id, status: RewardStatus.PENDING },
                data: { status: RewardStatus.CANCELLED },
            })

            await tx.respondentParticipation.update({
                where: { id: participation.id },
                data: {
                    status: ParticipationStatus.REJECTED,
                    adminReviewedBy: reviewerId,
                    adminReviewedAt: reviewedAt,
                },
            })

            return
        }

        const amount = participation.research.tokenPerRespondent
        const remaining = participation.research.tokensReserved - participation.research.tokensConsumed

        // The reservation is the ceiling. Paying past it would credit tokens the researcher
        // never funded, so the approval is refused instead.
        if (amount > remaining) {
            throw new ConflictException("This research's reward budget is used up")
        }

        const wallet = await tx.tokenWallet.upsert({
            where: { userId: participation.respondentId },
            // Accounts created before wallets were made at registration have none.
            create: { userId: participation.respondentId, balance: amount },
            update: { balance: { increment: amount } },
            select: { id: true },
        })

        await tx.tokenTransaction.create({
            data: {
                walletId: wallet.id,
                researchId: participation.researchId,
                respondentParticipationId: participation.id,
                type: TokenTransactionType.REWARD,
                // Credits are positive, the mirror of the reserve's negative debit.
                amount,
                idempotencyKey: `participation-reward:${participation.id}`,
            },
        })

        // The platform's cut is recorded as zero: the token split has no account to land in,
        // and inventing a balance for it would move tokens out of the ledger. The whole
        // `tokenPerRespondent` the researcher reserved is what gets paid out.
        await tx.reward.updateMany({
            where: { participationId: participation.id, status: RewardStatus.PENDING },
            data: { status: RewardStatus.PAID, paidAt: reviewedAt },
        })

        await tx.research.update({
            where: { id: participation.researchId },
            data: { tokensConsumed: { increment: amount } },
        })

        await tx.respondentParticipation.update({
            where: { id: participation.id },
            data: {
                status: ParticipationStatus.APPROVED,
                adminReviewedBy: reviewerId,
                adminReviewedAt: reviewedAt,
                rewardedAt: reviewedAt,
            },
        })
    })

    return toQualityCheckResponse(await findQualityCheck(id))
}
