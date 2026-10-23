/**
 * Reward statuses, mirroring the Prisma enum, in a client-safe module.
 *
 * The admin screens read this to label what a submission's reward ended up as, so the stored
 * value and what is shown can never drift apart — the same split `participation-status.ts`
 * makes for participation statuses.
 */

export const REWARD_STATUSES = ['PENDING', 'PAID', 'CANCELLED'] as const

export type RewardStatus = (typeof REWARD_STATUSES)[number]

const LABELS: Record<RewardStatus, string> = {
    PENDING: 'Menunggu keputusan',
    PAID: 'Sudah dibayar',
    CANCELLED: 'Dibatalkan',
}

/** Label for a stored status, falling back to the raw value for anything unexpected. */
export function rewardStatusLabel(status: string): string {
    return LABELS[status as RewardStatus] ?? status
}
