/**
 * Participation statuses, mirroring the Prisma enum, in a client-safe module.
 *
 * The API validates its `status` filter against this list and refuses further answers for
 * the ones below, while the pages read the same list to label a participation — so the
 * stored value and what is shown can never drift apart.
 */

export const PARTICIPATION_STATUSES = ["JOINED", "IN_PROGRESS", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "EXPIRED"] as const

export type ParticipationStatus = (typeof PARTICIPATION_STATUSES)[number]

/**
 * Statuses that are past answering.
 *
 * A participation in one of these takes no more answers and cannot be sent in again — the
 * reward is keyed by the participation, so a repeat would credit the same work twice.
 */
export const PARTICIPATION_DONE_STATUSES = [
    "SUBMITTED",
    "UNDER_REVIEW",
    "APPROVED",
    "REJECTED",
    "EXPIRED",
] as const satisfies readonly ParticipationStatus[]

const LABELS: Record<ParticipationStatus, string> = {
    JOINED: "Belum dikerjakan",
    IN_PROGRESS: "Sedang dikerjakan",
    SUBMITTED: "Sudah dikirim",
    UNDER_REVIEW: "Menunggu peninjauan",
    APPROVED: "Disetujui",
    REJECTED: "Ditolak",
    EXPIRED: "Kedaluwarsa",
}

/** Label for a stored status, falling back to the raw value for anything unexpected. */
export function participationStatusLabel(status: string): string {
    return LABELS[status as ParticipationStatus] ?? status
}

/** Whether a stored status is past answering. */
export function isParticipationDone(status: string): boolean {
    return (PARTICIPATION_DONE_STATUSES as readonly string[]).includes(status)
}
