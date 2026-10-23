/**
 * Automatic-screening vocabulary, mirroring the Prisma `AutoScreeningResult` enum.
 *
 * This is about **answer quality**, not eligibility. It summarises the automatic quality
 * signals a submission carries (`SPEEDING`, `STRAIGHT_LINING`) and is decided once, when the
 * questionnaire is sent in — see `src/lib/server/quality.ts`. Demographic eligibility
 * (profile vs research criteria) is a separate check that runs at join and is not stored here.
 *
 * Client-safe, like the other vocabulary modules, so the stored value and the label shown
 * for it cannot drift apart.
 */

export const SCREENING_RESULTS = ["CLEAN", "FLAGGED"] as const

export type ScreeningResult = (typeof SCREENING_RESULTS)[number]

const LABELS: Record<ScreeningResult, string> = {
    CLEAN: "Bersih",
    FLAGGED: "Ditandai",
}

/** Label for a stored result, falling back to the raw value for anything unexpected. */
export function screeningResultLabel(result: string): string {
    return LABELS[result as ScreeningResult] ?? result
}
