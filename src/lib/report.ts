/**
 * Content-report vocabulary, mirroring the Prisma enums, in a client-safe module.
 *
 * The API validates its `status` filter and its review decision against these lists, while
 * a page reads the same lists to label a row — so the stored value and what is shown can
 * never drift apart. The same split `quality-check.ts` makes for quality decisions.
 */

/* ========== Status ========== */

export const REPORT_STATUSES = ["OPEN", "UNDER_REVIEW", "RESOLVED", "DISMISSED"] as const

export type ReportStatus = (typeof REPORT_STATUSES)[number]

/**
 * The two outcomes an admin can decide a report with.
 *
 * `OPEN` and `UNDER_REVIEW` are states a report passes through on its own; only these two
 * end it, so they are the only values the review endpoint accepts.
 */
export const REPORT_DECISIONS = ["RESOLVED", "DISMISSED"] as const

export type ReportDecision = (typeof REPORT_DECISIONS)[number]

const STATUS_LABELS: Record<ReportStatus, string> = {
    OPEN: "Terbuka",
    UNDER_REVIEW: "Sedang ditinjau",
    RESOLVED: "Selesai",
    DISMISSED: "Diabaikan",
}

/** Pill tone per status, so a dismissed report does not read like one still open. */
const STATUS_STYLES: Record<ReportStatus, string> = {
    OPEN: "border-warning/30 text-warning",
    UNDER_REVIEW: "border-info/30 text-info",
    RESOLVED: "border-success/30 text-success",
    DISMISSED: "border-border text-muted-foreground",
}

/** Label for a stored status, falling back to the raw value for anything unexpected. */
export function reportStatusLabel(status: string): string {
    return STATUS_LABELS[status as ReportStatus] ?? status
}

/** Pill classes for a stored status. */
export function reportStatusStyle(status: string): string {
    return STATUS_STYLES[status as ReportStatus] ?? "border-border text-muted-foreground"
}

/* ========== Tindakan ========== */

export const REPORT_ACTIONS = ["NONE", "WARNING", "CONTENT_REMOVED", "RESEARCH_SUSPENDED", "USER_BANNED"] as const

export type ReportAction = (typeof REPORT_ACTIONS)[number]

const ACTION_LABELS: Record<ReportAction, string> = {
    NONE: "Tanpa tindakan",
    WARNING: "Peringatan",
    CONTENT_REMOVED: "Konten dihapus",
    RESEARCH_SUSPENDED: "Riset ditangguhkan",
    USER_BANNED: "Akun diblokir",
}

/** Label for a stored action, falling back to the raw value for anything unexpected. */
export function reportActionLabel(action: string): string {
    return ACTION_LABELS[action as ReportAction] ?? action
}
