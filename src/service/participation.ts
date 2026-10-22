import { BadRequestException, ConflictException, NotFoundException } from "@/lib/server/http-exception"
import { PARTICIPATION_DONE_STATUSES } from "@/lib/participation-status"
import { type ScreenableField, screenCriteria } from "@/lib/server/screening"
import type { Prisma } from "@/prisma/generated/prisma/client"
import { AutoScreeningResult, ParticipationStatus, ResearchStatus, RewardStatus, TokenTransactionType } from "@/prisma/generated/prisma/enums"
import { prisma } from "@/prisma/prisma"

/**
 * The respondent side of a research: joining one, answering it, and sending it in.
 *
 * A participation is one respondent's attempt at one research — the unique
 * `(researchId, respondentId)` pair is what makes "join" idempotent. Answers live in
 * `ParticipationAnswer`, one row per question, replaced as a whole whenever the client
 * sends its form (the same shape the questionnaire itself is written with).
 *
 * Sending a research in is the only place a respondent is paid, and it is the mirror of
 * publishing: publishing reserved `target × tokenPerRespondent` from the researcher's
 * wallet, and each submission consumes exactly `tokenPerRespondent` of that reservation.
 * The two together are why `tokensConsumed` may never exceed `tokensReserved` — past
 * that point the payout would be minting tokens nobody funded.
 */

/* ========== Konstanta ========== */

/** How many participations the respondent's own list returns. */
const DEFAULT_PARTICIPATION_LIMIT = 50

/**
 * Statuses that are past answering, taken from the shared list so the client and the
 * server cannot disagree about which ones are closed.
 */
const ANSWERED_STATUSES: ParticipationStatus[] = [...PARTICIPATION_DONE_STATUSES]

/**
 * How much of the estimated time a submission has to use up before it stops being
 * flagged as too fast — see `toTiming`.
 *
 * A third, deliberately generous: the estimate is a rule of thumb from the questionnaire's
 * length, and people are routinely quicker than a rule of thumb, so the flag has to mean
 * "implausibly quick" rather than "quicker than expected". It is a heuristic to tune, not a
 * verdict.
 */
const TOO_FAST_PACE_PERCENT = 33

/* ========== Tipe ========== */

/** One answer as the client sends it: choice ids, free text, or neither. */
export type ParticipationAnswerInput = {
    questionId: string
    /** Choice ids for a choice question. Empty or absent for a free-text one. */
    selected?: string[]
    /** Free text for an essay or numeric question. Empty or absent for a choice one. */
    text?: string | null
}

/* ========== Bentuk baca ========== */

/** The research header both reads carry. */
const RESEARCH_SUMMARY_SELECT = {
    id: true,
    title: true,
    description: true,
    category: true,
    externalSurveyUrl: true,
    estimatedDurationMinutes: true,
    tokenPerRespondent: true,
    deadline: true,
    status: true,
    researcher: { select: { name: true } },
} satisfies Prisma.ResearchSelect

const REWARD_SELECT = { respondentTokenAmount: true, platformTokenAmount: true, status: true, paidAt: true } satisfies Prisma.RewardSelect

/** What the list needs: the research as a card, plus what it paid. */
const LIST_INCLUDE = {
    research: { select: RESEARCH_SUMMARY_SELECT },
    reward: { select: REWARD_SELECT },
} satisfies Prisma.RespondentParticipationInclude

/** What the detail needs: the questionnaire as well, since that is what gets answered. */
const DETAIL_INCLUDE = {
    research: {
        select: {
            ...RESEARCH_SUMMARY_SELECT,
            questions: {
                orderBy: { pos: "asc" },
                include: { choices: { orderBy: { pos: "asc" } } },
            },
        },
    },
    answers: true,
    reward: { select: REWARD_SELECT },
} satisfies Prisma.RespondentParticipationInclude

type ParticipationListRow = Prisma.RespondentParticipationGetPayload<{ include: typeof LIST_INCLUDE }>
type ParticipationDetailRow = Prisma.RespondentParticipationGetPayload<{ include: typeof DETAIL_INCLUDE }>
type QuestionWithChoices = ParticipationDetailRow["research"]["questions"][number]

/* ========== Helper ========== */

/**
 * How long the questionnaire took, measured against how long it was expected to take.
 *
 * The clock runs between the two server timestamps the participation already carries:
 * `createdAt`, set when the respondent joined, and `submittedAt`, set when they sent it
 * in. Neither is written by a client, and nothing derived is stored — these numbers are
 * recomputed on every read, so a duration can never drift from the timestamps it came
 * from.
 *
 * The estimate is spread evenly over the questions: `estimatedDurationMinutes * 60 /
 * totalQuestions`, in seconds per question. A questionnaire with no questions has no
 * per-question estimate at all, which is a `null` rather than a division by zero.
 *
 * `tooFast` is the initial indicator, and no more than that: `createdAt` is when the
 * respondent *joined*, so the window includes any time they spent away from the page,
 * which makes it a conservative test — it only fires on a submission finished almost
 * immediately. A flagged submission is one worth reading, not one to reject.
 */
function toTiming({
    startedAt,
    completedAt,
    estimatedDurationMinutes,
    totalQuestions,
}: {
    startedAt: Date
    completedAt: Date | null
    estimatedDurationMinutes: number
    totalQuestions: number
}) {
    const estimatedSeconds = estimatedDurationMinutes * 60
    const estimatedSecondsPerQuestion = totalQuestions > 0 ? Math.round(estimatedSeconds / totalQuestions) : null

    if (completedAt === null) {
        return {
            actualSeconds: null,
            actualSecondsPerQuestion: null,
            estimatedSeconds,
            estimatedSecondsPerQuestion,
            tooFast: null,
        }
    }

    // Clamped at zero: a clock change between the two stamps must not read as negative
    // work.
    const actualSeconds = Math.max(0, Math.round((completedAt.getTime() - startedAt.getTime()) / 1000))

    return {
        actualSeconds,
        actualSecondsPerQuestion: totalQuestions > 0 ? Math.round(actualSeconds / totalQuestions) : null,
        estimatedSeconds,
        estimatedSecondsPerQuestion,
        tooFast: estimatedSeconds > 0 && actualSeconds < (estimatedSeconds * TOO_FAST_PACE_PERCENT) / 100,
    }
}

/** The choice ids of a stored answer, or an empty list for a free-text one. */
function toChoiceIds(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

/** The research header, as the respondent sees it. */
function toResearchSummary(research: ParticipationListRow["research"] | ParticipationDetailRow["research"]) {
    return {
        id: research.id,
        title: research.title,
        description: research.description,
        category: research.category,
        externalSurveyUrl: research.externalSurveyUrl,
        researcherName: research.researcher.name,
        estimatedDurationMinutes: research.estimatedDurationMinutes,
        tokenPerRespondent: research.tokenPerRespondent,
        deadline: research.deadline,
        status: research.status,
    }
}

/** What was paid for a participation, or `null` while there is nothing to show. */
function toRewardResponse(reward: ParticipationListRow["reward"]) {
    return reward === null ? null : { tokenAmount: Number(reward.respondentTokenAmount), status: reward.status, paidAt: reward.paidAt }
}

/** Public view of a participation, without the soft-delete bookkeeping. */
function toParticipationResponse(participation: ParticipationListRow) {
    return {
        id: participation.id,
        researchId: participation.researchId,
        status: participation.status,
        screeningScore: participation.screeningScore,
        screeningResult: participation.autoScreeningResult,
        startedAt: participation.startedAt,
        submittedAt: participation.submittedAt,
        createdAt: participation.createdAt,
        research: toResearchSummary(participation.research),
        reward: toRewardResponse(participation.reward),
    }
}

/**
 * The participation plus its questionnaire, each question carrying whatever the
 * respondent already saved — which is what lets a half-filled form be resumed.
 */
function toParticipationDetail(participation: ParticipationDetailRow) {
    const answers = new Map(participation.answers.map((answer) => [answer.researchQuestionId, answer]))

    return {
        id: participation.id,
        researchId: participation.researchId,
        status: participation.status,
        screeningScore: participation.screeningScore,
        screeningResult: participation.autoScreeningResult,
        startedAt: participation.startedAt,
        submittedAt: participation.submittedAt,
        createdAt: participation.createdAt,
        research: toResearchSummary(participation.research),
        reward: toRewardResponse(participation.reward),
        timing: toTiming({
            // Rows that predate the column have no start of their own, so their join is the
            // closest honest one — and falling back only ever makes the pace look slower.
            startedAt: participation.startedAt ?? participation.createdAt,
            completedAt: participation.submittedAt,
            estimatedDurationMinutes: participation.research.estimatedDurationMinutes,
            totalQuestions: participation.research.questions.length,
        }),
        questions: participation.research.questions.map((question) => {
            const answer = answers.get(question.id)

            return {
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
                answer: {
                    selected: toChoiceIds(answer?.choiceIds),
                    text: answer?.answerText ?? null,
                },
            }
        }),
    }
}

/** Reads one participation of the caller's, or throws a 404. */
async function findParticipation(id: string, respondentId: string) {
    const participation = await prisma.respondentParticipation.findFirst({
        where: { id, respondentId, deletedAt: null },
        include: DETAIL_INCLUDE,
    })

    if (participation === null) throw new NotFoundException("Participation not found")

    return participation
}

/** The profile columns screening can decide against, or `null` when there is no profile. */
async function readScreenableProfile(userId: string): Promise<Record<ScreenableField, string> | null> {
    const profile = await prisma.userProfile.findUnique({
        where: { userId },
        select: { gender: true, domicileProvince: true, domicileCity: true, occupation: true, education: true, religion: true },
    })

    if (profile === null) return null

    return {
        gender: profile.gender,
        province: profile.domicileProvince,
        city: profile.domicileCity,
        occupation: profile.occupation,
        education: profile.education,
        religion: profile.religion,
    }
}

/** Refuses further answers to a participation that has already been sent in. */
function assertAnswerable(status: ParticipationStatus): void {
    if (ANSWERED_STATUSES.includes(status)) {
        throw new ConflictException(`This participation is ${status} and can no longer take answers`)
    }
}

/**
 * Refuses an answer that does not fit the questionnaire.
 *
 * A question the research does not ask, or a choice that question does not offer, is a
 * mistake worth naming — storing it would leave an answer nobody can interpret.
 */
function assertAnswersMatch(questions: QuestionWithChoices[], answers: ParticipationAnswerInput[]): void {
    const byId = new Map(questions.map((question) => [question.id, question]))

    for (const answer of answers) {
        const question = byId.get(answer.questionId)

        if (question === undefined) {
            throw new BadRequestException("Some answers are for questions this research does not ask", {
                answers: `Unknown question id: ${answer.questionId}`,
            })
        }

        const offered = new Set(question.choices.map((choice) => choice.id))
        const stray = (answer.selected ?? []).filter((choiceId) => !offered.has(choiceId))

        if (stray.length > 0) {
            throw new BadRequestException("An answer names a choice this question does not offer", {
                answers: `Question ${question.pos} does not offer ${stray.join(", ")}.`,
            })
        }
    }
}

/**
 * Refuses a submission that leaves a required question blank.
 *
 * "Answered" is either form: a choice id, or non-blank text. A required question with
 * neither is what a respondent would want to be told about, not silently sent in.
 */
function assertRequiredAnswered(
    questions: QuestionWithChoices[],
    saved: Array<{ researchQuestionId: string; choiceIds: unknown; answerText: string | null }>,
): void {
    const byQuestion = new Map(saved.map((answer) => [answer.researchQuestionId, answer]))

    const missing = questions.filter((question) => {
        if (!question.mustFill) return false

        const answer = byQuestion.get(question.id)
        if (answer === undefined) return true

        return toChoiceIds(answer.choiceIds).length === 0 && (answer.answerText ?? "").trim().length === 0
    })

    if (missing.length > 0) {
        throw new BadRequestException("Some required questions are still unanswered", {
            answers: `Question ${missing.map((question) => question.pos).join(", ")} still need an answer.`,
        })
    }
}

/**
 * Replaces a participation's answers with the ones given.
 *
 * Replace-all, matching the questionnaire itself: the client submits its whole form, so
 * a shorter form means answers were removed. Callers must have matched the answers
 * against the questionnaire first.
 */
async function writeAnswers(tx: Prisma.TransactionClient, participationId: string, answers: ParticipationAnswerInput[]) {
    await tx.participationAnswer.deleteMany({ where: { respondentParticipationId: participationId } })

    if (answers.length === 0) return

    await tx.participationAnswer.createMany({
        data: answers.map((answer) => ({
            respondentParticipationId: participationId,
            researchQuestionId: answer.questionId,
            // Left out rather than set to null: the columns are nullable, so omitting
            // them stores NULL and keeps a choice answer from carrying empty text.
            choiceIds: answer.selected !== undefined && answer.selected.length > 0 ? answer.selected : undefined,
            answerText: answer.text !== undefined && answer.text !== null && answer.text.trim().length > 0 ? answer.text : undefined,
        })),
    })
}

/* ========== Ikut serta ========== */

/**
 * Joins a research, or hands back the participation the caller already holds.
 *
 * Joining twice is not an error — it is how a client resumes — so an existing
 * participation that has not been sent in is returned as it stands, without re-checking
 * the budget or the criteria. Those only guard a *first* join: somebody who already
 * holds a slot keeps it even if the research has since filled up.
 */
export async function joinResearchService({ researchId, respondentId }: { researchId: string; respondentId: string }) {
    const research = await prisma.research.findFirst({
        where: { id: researchId, deletedAt: null },
        select: {
            id: true,
            researcherId: true,
            status: true,
            deadline: true,
            targetRespondentCount: true,
            criteria: { select: { field: true, operator: true, value: true } },
            _count: { select: { participations: { where: { submittedAt: { not: null }, deletedAt: null } } } },
        },
    })

    if (research === null) throw new NotFoundException("Research not found")

    if (research.researcherId === respondentId) throw new ConflictException("You cannot take part in your own research")
    if (research.status !== ResearchStatus.PUBLISHED) throw new ConflictException(`This research is not open, it is ${research.status}`)
    if (research.deadline.getTime() <= Date.now()) throw new ConflictException("This research's deadline has passed")

    const existing = await prisma.respondentParticipation.findUnique({
        where: { researchId_respondentId: { researchId, respondentId } },
        select: { id: true, status: true, deletedAt: true, startedAt: true },
    })

    if (existing !== null && existing.deletedAt === null) {
        if (ANSWERED_STATUSES.includes(existing.status)) throw new ConflictException("You have already answered this research")

        // Opening the questionnaire is what starts the clock, and only ever once: coming back
        // to a half-filled form continues the same measurement instead of restarting it.
        if (existing.startedAt === null) {
            await prisma.respondentParticipation.update({ where: { id: existing.id }, data: { startedAt: new Date() } })
        }

        return toParticipationDetail(await findParticipation(existing.id, respondentId))
    }

    if (research._count.participations >= research.targetRespondentCount) {
        throw new ConflictException("This research already has all the respondents it asked for")
    }

    const screening = screenCriteria(research.criteria, await readScreenableProfile(respondentId))

    if (screening.failed.length > 0) {
        throw new BadRequestException("This research's criteria are not met", {
            _root: `Your profile does not match: ${screening.failed.join(", ")}.`,
        })
    }

    // Nothing to screen means nothing to report, which is not the same as passing.
    const screeningResult =
        research.criteria.length === 0 ? null : screening.undecided.length > 0 ? AutoScreeningResult.NEEDS_REVIEW : AutoScreeningResult.PASS

    const joinData = {
        status: ParticipationStatus.JOINED,
        screeningScore: screening.score,
        autoScreeningResult: screeningResult,
        // The questionnaire is being opened right now, which is where the work clock starts.
        startedAt: new Date(),
    }

    // A previously withdrawn row is revived rather than duplicated: the unique
    // `(researchId, respondentId)` pair means there can only ever be one.
    if (existing !== null) {
        const revived = await prisma.respondentParticipation.update({
            where: { id: existing.id },
            // A row that was withdrawn keeps the start it already had: reviving continues the
            // same attempt rather than pretending it began now.
            data: { ...joinData, startedAt: existing.startedAt ?? joinData.startedAt, deletedAt: null },
            include: DETAIL_INCLUDE,
        })

        return toParticipationDetail(revived)
    }

    try {
        const created = await prisma.respondentParticipation.create({
            data: { researchId, respondentId, ...joinData },
            include: DETAIL_INCLUDE,
        })

        return toParticipationDetail(created)
    } catch (error) {
        // Two requests can arrive together — a double-invoked effect, a double tap — and the
        // unique pair lets only one of them insert. The loser answers with the winner's row,
        // which is what the caller wanted either way. `upsert` is not enough here: it raises
        // P2002 under exactly this race instead of returning the stored row.
        const winner = await prisma.respondentParticipation.findUnique({
            where: { researchId_respondentId: { researchId, respondentId } },
            include: DETAIL_INCLUDE,
        })

        if (winner === null) throw error

        return toParticipationDetail(winner)
    }
}

/* ========== Baca ========== */

/** Lists the caller's participations, most recently started first. */
export async function listParticipationsService({
    respondentId,
    status,
    take,
}: {
    respondentId: string
    status?: ParticipationStatus
    take?: number
}) {
    const participations = await prisma.respondentParticipation.findMany({
        where: { respondentId, deletedAt: null, ...(status === undefined ? {} : { status }) },
        orderBy: { createdAt: "desc" },
        take: take ?? DEFAULT_PARTICIPATION_LIMIT,
        include: LIST_INCLUDE,
    })

    return participations.map(toParticipationResponse)
}

/** One participation of the caller's, with its questionnaire and saved answers. */
export async function getParticipationService({ id, respondentId }: { id: string; respondentId: string }) {
    return toParticipationDetail(await findParticipation(id, respondentId))
}

/* ========== Jawab ========== */

/**
 * Saves the caller's answers without sending the research in.
 *
 * Draft saving is what `IN_PROGRESS` is for: the answers are stored as they stand, and
 * the questionnaire can be come back to.
 */
export async function saveAnswersService({ id, respondentId, answers }: { id: string; respondentId: string; answers: ParticipationAnswerInput[] }) {
    const participation = await findParticipation(id, respondentId)

    assertAnswerable(participation.status)
    assertAnswersMatch(participation.research.questions, answers)

    await prisma.$transaction(async (tx) => {
        await writeAnswers(tx, id, answers)
        await tx.respondentParticipation.update({ where: { id }, data: { status: ParticipationStatus.IN_PROGRESS } })
    })

    return toParticipationDetail(await findParticipation(id, respondentId))
}

/* ========== Kirim ========== */

/**
 * Sends a research in and pays the respondent.
 *
 * `answers` is optional: sending them here saves the client a round trip and makes sure
 * the last page of a form cannot be lost between a save and a submit. Whatever ends up
 * stored is what gets validated, so a submit without a body still refuses a blank
 * required question.
 *
 * Everything moves in one transaction — the answers, the status, the reward, the wallet
 * credit, and the researcher's consumed counter — so a failure leaves the participation
 * exactly as it was rather than half submitted and half paid. The ledger row is keyed by
 * the participation, which is the second lock against a double credit.
 */
export async function submitParticipationService({
    id,
    respondentId,
    answers,
}: {
    id: string
    respondentId: string
    answers?: ParticipationAnswerInput[]
}) {
    await prisma.$transaction(async (tx) => {
        const participation = await tx.respondentParticipation.findFirst({
            where: { id, respondentId, deletedAt: null },
            include: {
                reward: { select: { id: true } },
                research: { include: { questions: { include: { choices: true } } } },
            },
        })

        if (participation === null) throw new NotFoundException("Participation not found")

        const { research } = participation

        if (participation.reward !== null || ANSWERED_STATUSES.includes(participation.status)) {
            throw new ConflictException("This participation has already been sent in")
        }

        // The research has to still be on offer. The deadline is re-checked here as well as
        // at join: it is the researcher's cut-off, and a form that arrives after it would
        // be paid for out of a budget that has already been released.
        if (research.deletedAt !== null || research.status !== ResearchStatus.PUBLISHED) {
            throw new ConflictException("This research is no longer taking answers")
        }

        if (research.deadline.getTime() <= Date.now()) {
            throw new ConflictException("This research's deadline has passed")
        }

        if (answers !== undefined) {
            assertAnswersMatch(research.questions, answers)
            await writeAnswers(tx, id, answers)
        }

        const saved = await tx.participationAnswer.findMany({
            where: { respondentParticipationId: id },
            select: { researchQuestionId: true, choiceIds: true, answerText: true },
        })

        assertRequiredAnswered(research.questions, saved)

        const amount = research.tokenPerRespondent
        const remaining = research.tokensReserved - research.tokensConsumed

        // The reservation is the ceiling. Paying past it would credit tokens the
        // researcher never funded, so the payout is refused instead.
        if (amount > remaining) {
            throw new ConflictException("This research's reward budget is used up")
        }

        const wallet = await tx.tokenWallet.upsert({
            where: { userId: respondentId },
            create: { userId: respondentId, balance: amount },
            update: { balance: { increment: amount } },
            select: { id: true },
        })

        await tx.tokenTransaction.create({
            data: {
                walletId: wallet.id,
                researchId: research.id,
                respondentParticipationId: id,
                type: TokenTransactionType.REWARD,
                // Credits are positive, the mirror of the reserve's negative debit.
                amount,
                idempotencyKey: `participation-reward:${id}`,
            },
        })

        // The platform's cut is recorded as zero: the token split has no account to
        // land in, and inventing a balance for it would move tokens out of the ledger.
        // The whole `tokenPerRespondent` the researcher reserved is what gets paid out.
        await tx.reward.create({
            data: {
                participationId: id,
                respondentTokenAmount: amount,
                platformTokenAmount: 0,
                status: RewardStatus.PAID,
                paidAt: new Date(),
            },
        })

        await tx.research.update({ where: { id: research.id }, data: { tokensConsumed: { increment: amount } } })

        await tx.respondentParticipation.update({
            where: { id },
            data: { status: ParticipationStatus.SUBMITTED, submittedAt: new Date() },
        })
    })

    return toParticipationDetail(await findParticipation(id, respondentId))
}
