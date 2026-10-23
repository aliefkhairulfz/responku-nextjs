import { QUALITY_SIGNAL_FLAGS, type QualitySignalFlag } from '@/lib/quality-check'

/**
 * The automatic quality signals a submission carries.
 *
 * Two heuristics, both deliberately conservative, and both computed from what the
 * submission already stores rather than from anything a client sends:
 *
 * - `SPEEDING` — the questionnaire was finished far quicker than its estimate. The window
 *   runs between two server timestamps, so time spent away from the page counts as work
 *   and the flag only fires on a submission finished almost immediately.
 * - `STRAIGHT_LINING` — the same choice position was picked for every choice question,
 *   which is what a respondent clicking straight down one column looks like.
 *
 * Neither is a verdict. They are hints that say "read this one", and the admin's decision
 * is what settles it.
 */

/**
 * How much of the estimated time a submission has to use up before it stops being flagged
 * as too fast.
 *
 * A third, deliberately generous: the estimate is a rule of thumb from the questionnaire's
 * length, and people are routinely quicker than a rule of thumb, so the flag has to mean
 * "implausibly quick" rather than "quicker than expected". It is a heuristic to tune, not a
 * verdict. Shared with the `timing` block the participation reads carry, so the two cannot
 * disagree about what "too fast" means.
 */
export const TOO_FAST_PACE_PERCENT = 33

/**
 * How many choice answers a submission needs before a uniform pattern means anything.
 *
 * Two answers that happen to match are a coincidence; three in a row is a pattern worth
 * flagging.
 */
const MIN_STRAIGHT_LINE_ANSWERS = 3

/** The share of the score each signal costs, so the weights always sum to one. */
const SIGNAL_WEIGHT = 1 / QUALITY_SIGNAL_FLAGS.length

/** One stored answer, as the screening reads it. */
export type ScreenableAnswer = { researchQuestionId: string; choiceIds: string[] }

/** One question, with its choices in the order they are shown. */
export type ScreenableQuestion = { id: string; choices: Array<{ id: string; pos: number }> }

export type QualitySignalInput = {
    /** When the questionnaire was first opened; falls back to `createdAt` when absent. */
    startedAt: Date | null
    createdAt: Date
    submittedAt: Date | null
    estimatedDurationMinutes: number
    questions: ScreenableQuestion[]
    answers: ScreenableAnswer[]
}

/** Whether a submission was finished far quicker than its estimate. */
export function isTooFast(actualSeconds: number, estimatedSeconds: number): boolean {
    return estimatedSeconds > 0 && actualSeconds < (estimatedSeconds * TOO_FAST_PACE_PERCENT) / 100
}

/**
 * Whether every choice answer picked the same position.
 *
 * Positions are compared rather than choice ids: ids are unique per question, so two
 * answers can never share one, while "always the first option" is exactly the pattern worth
 * flagging. Multi-select answers are skipped — a set of choices is not a position.
 */
export function detectStraightLining(
    answers: ScreenableAnswer[],
    questions: ScreenableQuestion[],
): boolean {
    const positions: number[] = []

    for (const answer of answers) {
        if (answer.choiceIds.length !== 1) continue

        const question = questions.find((candidate) => candidate.id === answer.researchQuestionId)
        if (question === undefined) continue

        const ordered = [...question.choices].sort((a, b) => a.pos - b.pos)
        const position = ordered.findIndex((choice) => choice.id === answer.choiceIds[0])

        if (position >= 0) positions.push(position)
    }

    if (positions.length < MIN_STRAIGHT_LINE_ANSWERS) return false

    return positions.every((position) => position === positions[0])
}

/**
 * The automatic score, from one (clean) down to zero (every signal fired).
 *
 * Each flag costs an equal share, so the number stays comparable as signals are added: with
 * two flags a single one reads `0.5`, and both read `0`. It is a summary of the flags, not
 * a second opinion — the flags are what an admin reads.
 */
export function computeAutoScore(flags: QualitySignalFlag[]): number {
    const penalty = flags.length * SIGNAL_WEIGHT

    return Math.max(0, Math.round((1 - penalty) * 10000) / 10000)
}

/** The signals a submission carries, and the score that summarises them. */
export function screenSubmission(input: QualitySignalInput): {
    signalFlags: QualitySignalFlag[]
    autoScore: number
} {
    const signalFlags: QualitySignalFlag[] = []

    if (input.submittedAt !== null) {
        const startedAt = input.startedAt ?? input.createdAt
        const actualSeconds = Math.max(
            0,
            Math.round((input.submittedAt.getTime() - startedAt.getTime()) / 1000),
        )

        if (isTooFast(actualSeconds, input.estimatedDurationMinutes * 60))
            signalFlags.push('SPEEDING')
    }

    if (detectStraightLining(input.answers, input.questions)) signalFlags.push('STRAIGHT_LINING')

    return { signalFlags, autoScore: computeAutoScore(signalFlags) }
}
