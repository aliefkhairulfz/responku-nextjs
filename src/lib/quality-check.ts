/**
 * Quality-check vocabulary, mirroring the Prisma enums, in a client-safe module.
 *
 * The API validates its `decision` filter against this list and refuses a second decision
 * on the same check, while the pages read the same list to label a row — so the stored
 * value and what is shown can never drift apart. The same split `participation-status.ts`
 * makes for participation statuses.
 */

export const QUALITY_DECISIONS = ['PENDING', 'APPROVED', 'REJECTED'] as const

export type QualityDecision = (typeof QUALITY_DECISIONS)[number]

/**
 * The automatic signals a submission can carry.
 *
 * `SPEEDING` is the pace heuristic — the questionnaire was finished far quicker than it
 * was expected to take. `STRAIGHT_LINING` is a uniform answer pattern — the same choice
 * position picked for every choice question. Both are hints to read the answers, not
 * verdicts.
 */
export const QUALITY_SIGNAL_FLAGS = ['SPEEDING', 'STRAIGHT_LINING'] as const

export type QualitySignalFlag = (typeof QUALITY_SIGNAL_FLAGS)[number]

const DECISION_LABELS: Record<QualityDecision, string> = {
    PENDING: 'Menunggu tinjauan',
    APPROVED: 'Disetujui',
    REJECTED: 'Ditolak',
}

const SIGNAL_LABELS: Record<QualitySignalFlag, string> = {
    SPEEDING: 'Terlalu cepat',
    STRAIGHT_LINING: 'Jawaban seragam',
}

/** Label for a stored decision, falling back to the raw value for anything unexpected. */
export function qualityDecisionLabel(decision: string): string {
    return DECISION_LABELS[decision as QualityDecision] ?? decision
}

/** Label for a stored signal flag, falling back to the raw value for anything unexpected. */
export function qualitySignalLabel(flag: string): string {
    return SIGNAL_LABELS[flag as QualitySignalFlag] ?? flag
}
