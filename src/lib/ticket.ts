/**
 * Support ticket vocabulary, in a client-safe module.
 *
 * The API validates its `category` and `status` against these lists and the help-center
 * page renders with them, so a stored value and the control that writes it can never
 * drift apart. Both mirror the Prisma enums — the values are the stored form, while the
 * labels and pill tones below own the display text.
 */

/* ========== Kategori ========== */

export const TICKET_CATEGORIES = ["DISPUTE", "RESEARCH", "TRANSACTION", "ACCOUNT", "OTHER"] as const

export type TicketCategory = (typeof TICKET_CATEGORIES)[number]

/** Display label per category. */
export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
    DISPUTE: "Banding Penolakan Jawaban Survei",
    RESEARCH: "Klarifikasi Riset",
    TRANSACTION: "Kendala Transaksi",
    ACCOUNT: "Kendala Akun",
    OTHER: "Permasalahan Lainnya",
}

/** Select options for the ticket form, pairing each value with its label. */
export const TICKET_CATEGORY_ITEMS: { value: TicketCategory; label: string }[] = TICKET_CATEGORIES.map((value) => ({
    value,
    label: TICKET_CATEGORY_LABELS[value],
}))

/**
 * Whether a value from a select is one of the categories.
 *
 * A select hands back a plain string, so this narrows it rather than casting — an
 * option added to the menu without being added above would be caught here.
 */
export function isTicketCategory(value: string | null): value is TicketCategory {
    return value !== null && (TICKET_CATEGORIES as readonly string[]).includes(value)
}

/** Label for a stored category, falling back to the raw value for anything unexpected. */
export function ticketCategoryLabel(category: string): string {
    return TICKET_CATEGORY_LABELS[category as TicketCategory] ?? category
}

/* ========== Status ========== */

export const TICKET_STATUSES = ["REVIEW", "RESOLVED", "REJECTED"] as const

export type TicketStatus = (typeof TICKET_STATUSES)[number]

const STATUS_LABELS: Record<TicketStatus, string> = {
    REVIEW: "Direview, estimasi maks 48 jam",
    RESOLVED: "Selesai",
    REJECTED: "Ditolak",
}

/** Pill tone per status, so a rejected ticket does not read like one still waiting. */
const STATUS_STYLES: Record<TicketStatus, string> = {
    REVIEW: "border-amber-200 text-amber-700",
    RESOLVED: "border-green-200 text-green-700",
    REJECTED: "border-red-200 text-red-700",
}

/** Label for a stored status, falling back to the raw value for anything unexpected. */
export function ticketStatusLabel(status: string): string {
    return STATUS_LABELS[status as TicketStatus] ?? status
}

/** Pill classes for a stored status. */
export function ticketStatusStyle(status: string): string {
    return STATUS_STYLES[status as TicketStatus] ?? "border-border text-muted-foreground"
}
