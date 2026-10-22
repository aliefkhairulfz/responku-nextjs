/**
 * Question types a research can ask.
 *
 * Deliberately client-safe — the API validation, the editor, and the respondent
 * view all import it — so the stored value and the UI can never drift apart.
 *
 * The schema/API value is the key (`SINGLE_CHOICE`); display text lives in
 * `QUESTION_TYPE_LABELS`.
 */

export const QUESTION_TYPES = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TEXT", "NUMBER", "SCALE"] as const

export type QuestionType = (typeof QUESTION_TYPES)[number]

/** Display label per API value. */
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
    SINGLE_CHOICE: "Pilihan Tunggal",
    MULTIPLE_CHOICE: "Pilihan Jamak",
    TEXT: "Jawaban Singkat",
    NUMBER: "Jawaban Angka",
    SCALE: "Skala",
}
