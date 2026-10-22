/**
 * Profile vocabulary shared by the API and the profile UI.
 *
 * Client-safe on purpose — plain data with no Prisma behind it — so the form can
 * offer exactly the values the endpoints accept, with their labels kept beside them
 * instead of duplicated in the component.
 */

export const GENDERS = ["male", "female"] as const
export const EDUCATIONS = ["high_school", "diploma", "bachelor", "master", "doctorate"] as const
export const RELIGIONS = ["islam", "protestant", "catholic", "hindu", "buddhist", "confucian"] as const

export type Gender = (typeof GENDERS)[number]
export type Education = (typeof EDUCATIONS)[number]
export type Religion = (typeof RELIGIONS)[number]

type Option<T extends string> = { value: T; label: string }

export const GENDER_ITEMS: readonly Option<Gender>[] = [
    { value: "male", label: "Laki-laki" },
    { value: "female", label: "Perempuan" },
]

export const EDUCATION_ITEMS: readonly Option<Education>[] = [
    { value: "high_school", label: "SMA / SMK" },
    { value: "diploma", label: "Diploma (D3)" },
    { value: "bachelor", label: "S1 / Sarjana" },
    { value: "master", label: "S2 / Magister" },
    { value: "doctorate", label: "S3 / Doktoral" },
]

export const RELIGION_ITEMS: readonly Option<Religion>[] = [
    { value: "islam", label: "Islam" },
    { value: "protestant", label: "Kristen Protestan" },
    { value: "catholic", label: "Katolik" },
    { value: "hindu", label: "Hindu" },
    { value: "buddhist", label: "Buddha" },
    { value: "confucian", label: "Konghucu" },
]

/** Label for a stored value, falling back to the raw value for anything unexpected. */
export function labelOf(items: readonly Option<string>[], value: string | null | undefined): string {
    return items.find((item) => item.value === value)?.label ?? "—"
}
