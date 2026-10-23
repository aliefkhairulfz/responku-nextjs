import { isTooFast } from './quality'

/**
 * How long a questionnaire took, measured against how long it was expected to take.
 *
 * The clock runs between two server timestamps the participation already carries:
 * `startedAt` (or `createdAt` when the row predates the column), set when the respondent
 * began, and `submittedAt`, set when they sent it in. Neither is written by a client, and
 * nothing derived is stored — these numbers are recomputed on every read, so a duration can
 * never drift from the timestamps it came from.
 *
 * The estimate is spread evenly over the questions: `estimatedDurationMinutes * 60 /
 * totalQuestions`, in seconds per question. A questionnaire with no questions has no
 * per-question estimate at all, which is a `null` rather than a division by zero.
 *
 * `tooFast` is the initial indicator, and no more than that: the window includes any time
 * the respondent spent away from the page, which makes it a conservative test — it only
 * fires on a submission finished almost immediately. A flagged submission is one worth
 * reading, not one to reject.
 *
 * Shared by the participation reads and the quality-check detail, so an admin reviewing a
 * flagged submission sees the same numbers the flag was computed from.
 */
export function toTiming({
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
    const estimatedSecondsPerQuestion =
        totalQuestions > 0 ? Math.round(estimatedSeconds / totalQuestions) : null

    if (completedAt === null) {
        return {
            actualSeconds: null,
            actualSecondsPerQuestion: null,
            estimatedSeconds,
            estimatedSecondsPerQuestion,
            tooFast: null,
        }
    }

    // Clamped at zero: a clock change between the two stamps must not read as negative work.
    const actualSeconds = Math.max(
        0,
        Math.round((completedAt.getTime() - startedAt.getTime()) / 1000),
    )

    return {
        actualSeconds,
        actualSecondsPerQuestion:
            totalQuestions > 0 ? Math.round(actualSeconds / totalQuestions) : null,
        estimatedSeconds,
        estimatedSecondsPerQuestion,
        tooFast: isTooFast(actualSeconds, estimatedSeconds),
    }
}
