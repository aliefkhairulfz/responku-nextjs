/**
 * Topic categories a research can be filed under.
 *
 * Deliberately client-safe — the API validation and the research editor both
 * import it — so the stored value and the dropdown can never drift apart.
 *
 * Values are stable keys, while `RESEARCH_CATEGORY_LABELS` owns the display text:
 * rewording a label never touches stored data.
 */

export const RESEARCH_CATEGORIES = ["fintech", "retail", "education", "health", "technology"] as const

export type ResearchCategory = (typeof RESEARCH_CATEGORIES)[number]

/** Display label per key, in the order the editor should offer them. */
export const RESEARCH_CATEGORY_LABELS: Record<ResearchCategory, string> = {
    fintech: "Fintech & Perbankan",
    retail: "Konsumen & Retail",
    education: "Pendidikan & Akademik",
    health: "Kesehatan & Gaya Hidup",
    technology: "Teknologi & Internet",
}

/** Select options for the editor, pairing each key with its label. */
export const RESEARCH_CATEGORY_ITEMS: { value: ResearchCategory; label: string }[] = RESEARCH_CATEGORIES.map((value) => ({
    value,
    label: RESEARCH_CATEGORY_LABELS[value],
}))
