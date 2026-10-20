"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { ArrowDown, ArrowUp, Copy, Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/* ========== Konstanta & tipe ========== */

const QUESTION_TYPES = [
    { value: "single", label: "Pilihan Ganda (Single Choice)" },
    { value: "multiple", label: "Kotak Centang (Multiple Choice)" },
    { value: "likert", label: "Skala Likert (Tingkat Persetujuan 1-5)" },
    { value: "short", label: "Jawaban Singkat (Esai Singkat)" },
] as const;

type QuestionType = (typeof QUESTION_TYPES)[number]["value"];

type OptionValue = { id: string; text: string };

type QuestionValue = {
    id: string;
    text: string;
    type: QuestionType;
    options: OptionValue[];
    required: boolean;
};

const LIKERT_LABELS = ["Sangat Tidak Setuju", "Tidak Setuju", "Netral", "Setuju", "Sangat Setuju"] as const;

const MAX_QUESTIONS = 50;

/* ========== Helper tipe pertanyaan ========== */

/** Pilihan boleh ditambah/dihapus/diedit teksnya. */
const isEditableOptions = (type: QuestionType) => type === "single" || type === "multiple";

/** Pilihan tampil sebagai input read-only (tidak bisa diubah user). */
const isFixedOptions = (type: QuestionType) => type === "likert" || type === "short";

/** Tampilkan indikator bulat/kotak di sebelah pilihan. */
const hasIndicator = (type: QuestionType) => type === "single" || type === "multiple";

const isRoundIndicator = (type: QuestionType) => type === "single";

const getTypeLabel = (type: QuestionType) => QUESTION_TYPES.find((t) => t.value === type)?.label ?? type;

const getOptionsLegend = (type: QuestionType) => {
    if (type === "short") return "Jawaban";
    if (type === "likert") return "Label Skala (1-5)";
    return "Pilihan Jawaban";
};

/* ========== Factory ========== */

const createId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

const createOption = (text = ""): OptionValue => ({ id: createId(), text });

const createOptionsFor = (type: QuestionType): OptionValue[] => {
    if (type === "likert") {
        return LIKERT_LABELS.map((label) => createOption(label));
    }
    if (type === "short") {
        return [createOption()];
    }
    return [createOption(), createOption()];
};

const createQuestion = (type: QuestionType = "single"): QuestionValue => ({
    id: createId(),
    text: "",
    type,
    options: createOptionsFor(type),
    required: true,
});

// ID statis agar render awal di server dan client sama (hindari hydration mismatch).
const getInitialQuestions = (): QuestionValue[] => [
    {
        id: "initial-question",
        text: "",
        type: "single",
        options: [
            { id: "initial-option-1", text: "" },
            { id: "initial-option-2", text: "" },
        ],
        required: true,
    },
];

/* ========== Schema ========== */

const optionSchema = z.object({
    id: z.string(),
    text: z.string(),
});

const questionSchema = z
    .object({
        id: z.string(),
        text: z.string().trim().min(1, "Teks pertanyaan wajib diisi."),
        type: z.enum(["single", "multiple", "likert", "short"]),
        options: z.array(optionSchema),
        required: z.boolean(),
    })
    .superRefine((q, ctx) => {
        if (isEditableOptions(q.type) && q.options.length < 2) {
            ctx.addIssue({
                code: "custom",
                message: "Minimal 2 pilihan jawaban.",
                path: ["options"],
            });
        }
        if (q.type === "likert" && q.options.length !== 5) {
            ctx.addIssue({
                code: "custom",
                message: "Skala Likert harus memiliki 5 pilihan jawaban.",
                path: ["options"],
            });
        }
        if (q.type === "short" && q.options.length !== 1) {
            ctx.addIssue({
                code: "custom",
                message: "Jawaban singkat hanya boleh memiliki 1 pilihan jawaban.",
                path: ["options"],
            });
        }

        // Jawaban singkat memang kosong (diisi user saat menjawab).
        if (q.type !== "short") {
            q.options.forEach((opt, i) => {
                if (!opt.text.trim()) {
                    ctx.addIssue({
                        code: "custom",
                        message: "Pilihan jawaban tidak boleh kosong.",
                        path: ["options", i, "text"],
                    });
                }
            });
        }
    });

const formSchema = z.object({
    questions: z.array(questionSchema).min(1, "Minimal 1 pertanyaan.").max(MAX_QUESTIONS, `Maksimal ${MAX_QUESTIONS} pertanyaan.`),
});

/* ========== Form hook ========== */

function useQuestionnaireForm() {
    return useForm({
        defaultValues: {
            questions: getInitialQuestions(),
        },
        validators: {
            onSubmit: formSchema,
        },
        onSubmit: async ({ value }) => {
            console.log(value);
        },
    });
}

type QuestionnaireForm = ReturnType<typeof useQuestionnaireForm>;

const isFieldInvalid = (field: { state: { meta: { isTouched: boolean; isValid: boolean } } }) =>
    field.state.meta.isTouched && !field.state.meta.isValid;

/* ========== Komponen: editor pilihan jawaban ========== */

type OptionsEditorProps = {
    form: QuestionnaireForm;
    index: number;
    type: QuestionType;
};

function OptionsEditor({ form, index, type }: OptionsEditorProps) {
    const editable = isEditableOptions(type);
    const fixed = isFixedOptions(type);
    const showIndicator = hasIndicator(type);
    const round = isRoundIndicator(type);

    return (
        <form.Field name={`questions[${index}].options`} mode="array">
            {(optionsField) => {
                const options = optionsField.state.value;
                const isInvalid = isFieldInvalid(optionsField);

                return (
                    <FieldSet data-invalid={isInvalid}>
                        <FieldLegend variant="label">{getOptionsLegend(type)}</FieldLegend>

                        <div className="space-y-2">
                            {options.map((option, optionIndex) => (
                                <div key={option.id} className="flex items-start space-x-2">
                                    {showIndicator && (
                                        <span
                                            aria-hidden
                                            className={cn("mt-2.5 size-4 shrink-0 border border-input", round ? "rounded-full" : "rounded-lg")}
                                        />
                                    )}

                                    <form.Field name={`questions[${index}].options[${optionIndex}].text`}>
                                        {(field) => {
                                            const isOptionInvalid = isFieldInvalid(field);
                                            return (
                                                <Field data-invalid={isOptionInvalid}>
                                                    <Input
                                                        name={field.name}
                                                        aria-label={`Pilihan ${optionIndex + 1}`}
                                                        value={field.state.value ?? ""}
                                                        onBlur={field.handleBlur}
                                                        onChange={(e) => field.handleChange(e.target.value)}
                                                        aria-invalid={isOptionInvalid}
                                                        readOnly={fixed}
                                                        className={cn(fixed && "cursor-not-allowed bg-muted/50 text-muted-foreground")}
                                                        placeholder={
                                                            type === "short" ? "Pengguna akan mengetikkan jawabannya" : `Pilihan ${optionIndex + 1}`
                                                        }
                                                    />
                                                    {isOptionInvalid && type !== "short" && <FieldError errors={field.state.meta.errors} />}
                                                </Field>
                                            );
                                        }}
                                    </form.Field>

                                    {editable && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            aria-label={`Hapus pilihan ${optionIndex + 1}`}
                                            disabled={options.length <= 2}
                                            onClick={() => optionsField.removeValue(optionIndex)}
                                        >
                                            <X />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {editable && (
                            <Button type="button" variant="outline" onClick={() => optionsField.pushValue(createOption())}>
                                <Plus />
                                Tambah Pilihan Jawaban
                            </Button>
                        )}
                        {isInvalid && <FieldError errors={optionsField.state.meta.errors} />}
                    </FieldSet>
                );
            }}
        </form.Field>
    );
}

/* ========== Komponen: kartu satu pertanyaan ========== */

type QuestionCardProps = {
    form: QuestionnaireForm;
    question: QuestionValue;
    index: number;
    total: number;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onCopy: () => void;
    onRemove: () => void;
};

function QuestionCard({ form, question, index, total, onMoveUp, onMoveDown, onCopy, onRemove }: QuestionCardProps) {
    const canCopy = total < MAX_QUESTIONS;

    // Sinkronkan pilihan jawaban setiap kali TIPE pertanyaan berubah.
    // prevType dipakai supaya efek tidak jalan saat render pertama.
    const prevType = useRef<QuestionType>(question.type);
    useEffect(() => {
        const previous = prevType.current;
        if (previous === question.type) return;
        prevType.current = question.type;

        const path = `questions[${index}].options` as const;
        const current = form.getFieldValue(path);

        // Pertahankan pilihan yang sudah diisi bila berpindah single <-> multiple.
        const keepOptions = isEditableOptions(question.type) && isEditableOptions(previous) && current.length >= 2;

        if (!keepOptions) {
            form.setFieldValue(path, createOptionsFor(question.type));
        }
    }, [question.type, index, form]);

    const handleTypeChange = (value: string | null, onChange: (type: QuestionType) => void) => {
        if (!value || value === question.type) return;
        onChange(value as QuestionType);
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Pertanyaan {index + 1}</CardTitle>
            </CardHeader>

            <CardContent>
                <FieldGroup>
                    <div className="flex items-start space-x-4">
                        {/* Teks pertanyaan */}
                        <form.Field name={`questions[${index}].text`}>
                            {(field) => {
                                const isInvalid = isFieldInvalid(field);
                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={`question-${index}-text`}>Teks Pertanyaan</FieldLabel>
                                        <Input
                                            id={`question-${index}-text`}
                                            name={field.name}
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            aria-invalid={isInvalid}
                                            placeholder="Tulis pertanyaan Anda di sini"
                                        />
                                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                    </Field>
                                );
                            }}
                        </form.Field>

                        {/* Tipe pertanyaan */}
                        <form.Field name={`questions[${index}].type`}>
                            {(field) => (
                                <Field>
                                    <FieldLabel htmlFor={`question-${index}-type`}>Tipe Pertanyaan</FieldLabel>
                                    <Select
                                        name={field.name}
                                        value={field.state.value}
                                        onValueChange={(value) => handleTypeChange(value as string | null, field.handleChange)}
                                    >
                                        <SelectTrigger id={`question-${index}-type`} className="w-full">
                                            {/* Tampilkan label, bukan value mentah ("short") */}
                                            <SelectValue>{getTypeLabel(field.state.value)}</SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {QUESTION_TYPES.map((type) => (
                                                <SelectItem key={type.value} value={type.value}>
                                                    {type.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                            )}
                        </form.Field>
                    </div>

                    <OptionsEditor key={`${question.id}-${question.type}`} form={form} index={index} type={question.type} />
                </FieldGroup>
            </CardContent>

            <CardFooter className="flex-wrap justify-between gap-2">
                <div className="flex gap-2">
                    <Button type="button" variant="outline" disabled={index === 0} onClick={onMoveUp}>
                        <ArrowUp />
                        Atas
                    </Button>
                    <Button type="button" variant="outline" disabled={index === total - 1} onClick={onMoveDown}>
                        <ArrowDown />
                        Bawah
                    </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" disabled={!canCopy} onClick={onCopy}>
                        <Copy />
                        Salin
                    </Button>
                    <Button type="button" variant="destructive" disabled={total === 1} onClick={onRemove}>
                        <Trash2 />
                        Hapus
                    </Button>

                    <form.Field name={`questions[${index}].required`}>
                        {(field) => (
                            <Field orientation="horizontal" className="w-auto">
                                <Checkbox
                                    id={`question-${index}-required`}
                                    name={field.name}
                                    checked={field.state.value}
                                    onCheckedChange={(checked) => field.handleChange(checked === true)}
                                />
                                <FieldLabel htmlFor={`question-${index}-required`}>Wajib Dijawab</FieldLabel>
                            </Field>
                        )}
                    </form.Field>
                </div>
            </CardFooter>
        </Card>
    );
}

/* ========== Komponen utama ========== */

export default function DaftarPertanyaanCard() {
    const form = useQuestionnaireForm();

    // Subscribe ke seluruh data pertanyaan supaya semua kartu ikut re-render
    // saat tipe/isi pertanyaan lain berubah.
    const questions = useStore(form.store, (state) => state.values.questions);
    const total = questions.length;

    return (
        <form
            id="form-questionnaire-builder"
            onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
            }}
        >
            <form.Field name="questions" mode="array">
                {(questionsField) => {
                    return (
                        <FieldGroup>
                            {questions.map((question, index) => (
                                <QuestionCard
                                    key={question.id}
                                    form={form}
                                    question={question}
                                    index={index}
                                    total={total}
                                    onMoveUp={() => questionsField.moveValue(index, index - 1)}
                                    onMoveDown={() => questionsField.moveValue(index, index + 1)}
                                    onCopy={() => {
                                        const current = form.getFieldValue(`questions[${index}]`);
                                        questionsField.insertValue(index + 1, {
                                            ...current,
                                            id: createId(),
                                            options: current.options.map((o) => ({
                                                ...o,
                                                id: createId(),
                                            })),
                                        });
                                    }}
                                    onRemove={() => questionsField.removeValue(index)}
                                />
                            ))}

                            <Button
                                type="button"
                                variant="outline"
                                disabled={total >= MAX_QUESTIONS}
                                onClick={() => questionsField.pushValue(createQuestion())}
                            >
                                <Plus />
                                Tambah Pertanyaan ({total}/{MAX_QUESTIONS})
                            </Button>

                            {questionsField.state.meta.errors.length > 0 && <FieldError errors={questionsField.state.meta.errors} />}

                            <Field orientation="horizontal">
                                <Button type="button" variant="outline" onClick={() => form.reset()}>
                                    Reset
                                </Button>
                                <Button type="submit">Simpan</Button>
                            </Field>
                        </FieldGroup>
                    );
                }}
            </form.Field>
        </form>
    );
}
