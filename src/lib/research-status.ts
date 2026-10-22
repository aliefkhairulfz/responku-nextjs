/**
 * Research statuses, mirroring the Prisma enum, in a client-safe module.
 *
 * The API validates its `status` query against this list and the dashboard filters
 * with it, so the two can never drift apart. Labels are Indonesian because they are
 * only ever shown.
 */

export const RESEARCH_STATUSES = ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "CLOSED", "COMPLETED", "REJECTED", "CANCELLED"] as const

export type ResearchStatus = (typeof RESEARCH_STATUSES)[number]

/**
 * The statuses the dashboard offers as filters.
 *
 * The review ones are absent because nothing produces them yet — no moderation flow
 * exists — and an always-empty filter is noise.
 */
export const RESEARCH_FILTER_STATUSES = ["DRAFT", "PUBLISHED", "CLOSED", "COMPLETED"] as const satisfies readonly ResearchStatus[]

const LABELS: Record<ResearchStatus, string> = {
    DRAFT: "Draft",
    PENDING_REVIEW: "Menunggu review",
    PUBLISHED: "Dipublikasikan",
    CLOSED: "Ditutup",
    COMPLETED: "Selesai",
    REJECTED: "Ditolak",
    CANCELLED: "Dibatalkan",
}

/** Badge tone per status, so a finished research does not look like an active one. */
const VARIANTS: Record<ResearchStatus, "default" | "secondary" | "outline" | "destructive"> = {
    DRAFT: "outline",
    PENDING_REVIEW: "secondary",
    PUBLISHED: "default",
    CLOSED: "secondary",
    COMPLETED: "secondary",
    REJECTED: "destructive",
    CANCELLED: "secondary",
}

/** Label for a stored status, falling back to the raw value for anything unexpected. */
export function researchStatusLabel(status: string): string {
    return LABELS[status as ResearchStatus] ?? status
}

/** Badge variant for a stored status. */
export function researchStatusVariant(status: string) {
    return VARIANTS[status as ResearchStatus] ?? "outline"
}
