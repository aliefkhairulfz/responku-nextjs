import { useForm } from "@tanstack/react-form"
import { RESEARCH_CATEGORIES, RESEARCH_CATEGORY_ITEMS } from "@/lib/research-category"
import { QUESTION_TYPE_LABELS } from "@/lib/research-question"
import { useState } from "react"
import z from "zod"

/** IDENTITY SCHEMA */
const identitySchema = z.object({
    title: z.string().min(1, "Judul kuesioner wajib diisi.").max(120, "Judul maksimal 120 karakter."),
    description: z.string().max(1000, "Deskripsi maksimal 1000 karakter."),
    category: z.enum(RESEARCH_CATEGORIES, "Pilih kategori topik."),
    estimatedMinutes: z
        .number("Durasi harus berupa angka.")
        .int("Durasi harus bilangan bulat.")
        .min(1, "Minimal 1 menit.")
        .max(180, "Maksimal 180 menit."),
})
const identitySchemaDefaultValue: z.infer<typeof identitySchema> = {
    title: "",
    description: "",
    category: "fintech",
    estimatedMinutes: 10,
}

/** CRITERIA SCHEMA */
const MIN_AGE = 18
const MAX_AGE = 80
const ageSchema = (label: string) =>
    z
        .number(`${label} harus berupa angka.`)
        .int(`${label} harus bilangan bulat.`)
        .min(MIN_AGE, `${label} minimal ${MIN_AGE} tahun.`)
        .max(MAX_AGE, `${label} maksimal ${MAX_AGE} tahun.`)
const criteriaSchema = z
    .object({
        ageMin: ageSchema("Usia minimum"),
        ageMax: ageSchema("Usia maksimum"),
        gender: z.enum(["all", "male", "female"]),
        region: z.enum(["all", "jabodetabek", "jawa-lainnya", "luar-jawa"]),
    })
    .refine((data) => data.ageMin <= data.ageMax, {
        message: "Usia maksimum tidak boleh lebih kecil dari usia minimum.",
        path: ["ageMax"],
    })
const criteriaSchemaDefaultValue: z.infer<typeof criteriaSchema> = {
    ageMin: 16,
    ageMax: 30,
    gender: "all",
    region: "all",
}

/** QUESTION SCHEMA */
const choiceSchema = z.object({
    id: z.string().min(1),
    pos: z.number().min(1),
    n: z.string().min(1),
    choiceText: z.string().min(1, "Jawaban wajib diisi"),
})
const baseQuestionSchema = z.object({
    id: z.string().min(1),
    pos: z.number().min(1),
    question: z.string().min(1, "Pertanyaan wajib diisi"),
    mustFill: z.boolean(),
})
/**
 * Tipe yang bisa dibuat editor saat ini. Schema juga punya `NUMBER`, tapi belum
 * ada UI-nya. Nilainya sama persis dengan yang diterima API.
 */
const editorQuestionTypes = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TEXT", "SCALE"] as const
const questionTypeItems = [
    { label: "Pilih Tipe Pertanyaan", value: null },
    ...editorQuestionTypes.map((value) => ({ label: QUESTION_TYPE_LABELS[value], value })),
]
const questionSchema = z
    .array(
        z.discriminatedUnion("questionType", [
            baseQuestionSchema.extend({
                questionType: z.literal("SINGLE_CHOICE"),
                choices: z.array(choiceSchema).min(2, "Pilihan ganda minimal 2 item"),
            }),
            baseQuestionSchema.extend({
                questionType: z.literal("MULTIPLE_CHOICE"),
                choices: z.array(choiceSchema).min(2, "Pilihan ganda minimal 2 item"),
            }),
            baseQuestionSchema.extend({
                questionType: z.literal("SCALE"),
                choices: z.array(choiceSchema).min(2, "Skala minimal 2 item"),
            }),
            baseQuestionSchema.extend({
                questionType: z.literal("TEXT"),
                choices: z.array(choiceSchema).max(1, "Essay maksimal 1 jawaban"),
            }),
        ]),
    )
    .min(1, "Pertanyaan minimal 1 item")
const questionSchemaDefaultValue: z.infer<typeof questionSchema> = [
    {
        id: crypto.randomUUID(),
        pos: 1,
        question: "seberapa sering anda berolahraga kardio, di hari libur?",
        mustFill: true,
        questionType: "SINGLE_CHOICE",
        choices: [{ id: crypto.randomUUID(), pos: 1, n: "a", choiceText: "sangat sering" }],
    },
]

/** TOKEN ALLOCATION SCHEMA */
const alocationTokenSchema = z
    .object({
        targetResponden: z
            .number("Target responden harus berupa angka.")
            .int("Target responden harus bilangan bulat.")
            .min(1, "Minimal 1 responden.")
            .max(10000, "Maksimal 10000 responden."),
        batasWaktu: z.enum(["1", "3", "7", "14", "30"]),
        tokenPerResponden: z
            .number("Token per responden harus berupa angka.")
            .int("Token per responden harus bilangan bulat.")
            .min(1, "Minimal 1 token."),
    })
    .refine((d) => d.targetResponden * d.tokenPerResponden <= 1_000_000, {
        message: "Total token melebihi batas maksimum (1.000.000).",
        path: ["tokenPerResponden"],
    })
const timeLimitOptions = [
    { value: "1", label: "1 Hari (Kilat)" },
    { value: "3", label: "3 Hari (Cepat)" },
    { value: "7", label: "7 Hari (Standar Rekomendasi)" },
    { value: "14", label: "14 Hari (Santai)" },
    { value: "30", label: "30 Hari (Maksimal)" },
]
const allocationTokenSchemaDefaultValue: z.infer<typeof alocationTokenSchema> = {
    targetResponden: 50,
    batasWaktu: "30",
    tokenPerResponden: 1,
}

/** TYPES */
type QuestionSchema = z.infer<typeof questionSchema>
type IdentitySchema = z.infer<typeof identitySchema>
type CriteriaSchema = z.infer<typeof criteriaSchema>
type AlocationTokenSchema = z.infer<typeof alocationTokenSchema>

/** HOOKS */
function useResearchEditorForm() {
    const [defaultValues] = useState(() => ({
        allocationToken: allocationTokenSchemaDefaultValue,
        identity: identitySchemaDefaultValue,
        criteria: criteriaSchemaDefaultValue,
        questions: questionSchemaDefaultValue,
    }))

    const form = useForm({
        defaultValues,
        validators: {
            onChange: z.object({
                allocationToken: alocationTokenSchema,
                identity: identitySchema,
                criteria: criteriaSchema,
                questions: questionSchema,
            }),
        },
        onSubmit: async ({ value, meta }) => {
            const action = meta as "publish" | "draft"

            if (action === "publish") console.log("PUBLISH", value)
            else console.log("DRAFT", value)
        },
    })

    return { form }
}

type UseResearchEditorForm = ReturnType<typeof useResearchEditorForm>

export {
    alocationTokenSchema,
    criteriaSchema,
    identitySchema,
    MAX_AGE,
    MIN_AGE,
    questionSchema,
    questionTypeItems,
    timeLimitOptions,
    useResearchEditorForm,
    questionSchemaDefaultValue,
}
export type { AlocationTokenSchema, CriteriaSchema, IdentitySchema, QuestionSchema, UseResearchEditorForm }

export const genderItems = [
    { value: "all", label: "Semua" },
    { value: "male", label: "Laki-laki" },
    { value: "female", label: "Perempuan" },
]
export const regionItems = [
    { value: "all", label: "Seluruh Indonesia" },
    { value: "jabodetabek", label: "Jabodetabek" },
    { value: "jawa-lainnya", label: "Jawa (selain Jabodetabek)" },
    { value: "luar-jawa", label: "Luar Jawa" },
]
/** Nilai = key stabil yang dikirim ke API; label hanya untuk tampilan. */
export const categoryItems = RESEARCH_CATEGORY_ITEMS
