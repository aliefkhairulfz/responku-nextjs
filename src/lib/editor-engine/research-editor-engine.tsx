"use client";

import { Button } from "@/components/ui/button";
import * as Card from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as Select from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, Copy, Plus, Trash2 } from "lucide-react";
import { MAX_AGE, MIN_AGE, QuestionSchema, questionTypeItems, timeLimitOptions } from "./research-editor-schema";
import type { UseResearchEditorForm } from "./research-editor-schema";

/** CONSTANTS & HELPERS */
const MAX_QUESTIONS = 50;
const MAX_CHOICES = 5;
const LIKERT_LABELS = ["Sangat Tidak Setuju", "Tidak Setuju", "Netral", "Setuju", "Sangat Setuju"];

type QuestionItem = QuestionSchema[number];
type QuestionType = QuestionItem["questionType"];

const makeChoice = (idx: number, choiceText = "") => ({
    id: crypto.randomUUID(),
    pos: idx + 1,
    n: String.fromCharCode(97 + idx), // a, b, c, ...
    choiceText,
});

const makeChoicesByType = (type: QuestionType) => {
    switch (type) {
        case "scale-answer":
            return LIKERT_LABELS.map((label, i) => makeChoice(i, label));
        case "essay-answer":
            return [];
        default:
            return [makeChoice(0), makeChoice(1)];
    }
};

const makeQuestion = (pos: number, type: QuestionType = "single-answer"): QuestionItem => ({
    id: crypto.randomUUID(),
    pos,
    question: "",
    mustFill: true,
    questionType: type,
    choices: makeChoicesByType(type),
});

/** SMALL UI HELPERS */
function FieldError({ errors }: { errors: unknown[] }) {
    const messages = errors.map((err) => (typeof err === "string" ? err : (err as { message?: string } | undefined)?.message)).filter(Boolean);
    if (messages.length === 0) return null;
    return <p className="text-destructive text-sm">{messages[0]}</p>;
}

function FieldWrapper({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-2">
            <Label htmlFor={htmlFor}>{label}</Label>
            {children}
        </div>
    );
}

/** SELECT HELPER (for simple string enums) */
type Option = { value: string; label: string };

/** MAIN COMPONENT */
type RisetEditorEngineProps = {
    researchEditorForm: UseResearchEditorForm;
};

export default function RisetEditorEngine({ researchEditorForm: { form } }: RisetEditorEngineProps) {
    const genderItems: Option[] = [
        { value: "all", label: "Semua" },
        { value: "male", label: "Laki-laki" },
        { value: "female", label: "Perempuan" },
    ];
    const regionItems: Option[] = [
        { value: "all", label: "Seluruh Indonesia" },
        { value: "jabodetabek", label: "Jabodetabek" },
        { value: "jawa-lainnya", label: "Jawa (selain Jabodetabek)" },
        { value: "luar-jawa", label: "Luar Jawa" },
    ];
    const categoryItems: Option[] = [
        "Fintech & Perbankan",
        "Konsumen & Retail",
        "Pendidikan & Akademik",
        "Kesehatan & Gaya Hidup",
        "Teknologi & Internet",
    ].map((c) => ({ value: c, label: c }));

    return (
        <form
            className="flex flex-col gap-6"
            onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
            }}
        >
            {/* TOKEN ALLOCATION FORM FIELD */}
            <Card.Card className="w-full">
                <Card.CardHeader>
                    <h3 className="text-xl font-semibold">Alokasi Token</h3>
                </Card.CardHeader>
                <Card.CardContent className="grid gap-4 md:grid-cols-3">
                    <form.Field name="allocationToken.targetResponden">
                        {(field) => (
                            <FieldWrapper label="Target Responden" htmlFor={field.name}>
                                <Input
                                    id={field.name}
                                    type="number"
                                    min={1}
                                    max={10000}
                                    value={Number.isNaN(field.state.value) ? "" : field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                                />
                                <FieldError errors={field.state.meta.errors} />
                            </FieldWrapper>
                        )}
                    </form.Field>

                    <form.Field name="allocationToken.tokenPerResponden">
                        {(field) => (
                            <FieldWrapper label="Token per Responden" htmlFor={field.name}>
                                <Input
                                    id={field.name}
                                    type="number"
                                    min={1}
                                    value={Number.isNaN(field.state.value) ? "" : field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                                />
                                <FieldError errors={field.state.meta.errors} />
                            </FieldWrapper>
                        )}
                    </form.Field>

                    <form.Field name="allocationToken.batasWaktu">
                        {(field) => (
                            <FieldWrapper label="Batas Waktu">
                                <Select.Select
                                    items={timeLimitOptions}
                                    value={field.state.value}
                                    onValueChange={(v) => field.handleChange(v as typeof field.state.value)}
                                >
                                    <Select.SelectTrigger className="w-full">
                                        <Select.SelectValue />
                                    </Select.SelectTrigger>
                                    <Select.SelectContent>
                                        <Select.SelectGroup>
                                            {timeLimitOptions.map((o) => (
                                                <Select.SelectItem key={o.value} value={o.value}>
                                                    {o.label}
                                                </Select.SelectItem>
                                            ))}
                                        </Select.SelectGroup>
                                    </Select.SelectContent>
                                </Select.Select>
                                <FieldError errors={field.state.meta.errors} />
                            </FieldWrapper>
                        )}
                    </form.Field>
                </Card.CardContent>
                <Card.CardFooter>
                    <form.Subscribe selector={(s) => s.values.allocationToken.targetResponden * s.values.allocationToken.tokenPerResponden}>
                        {(total) => (
                            <p className="text-muted-foreground text-sm">
                                Total token dibutuhkan:{" "}
                                <span className="text-foreground font-semibold">{Number.isFinite(total) ? total.toLocaleString("id-ID") : "-"}</span>
                            </p>
                        )}
                    </form.Subscribe>
                </Card.CardFooter>
            </Card.Card>

            {/* IDENTITY FORM FIELD */}
            <Card.Card className="w-full">
                <Card.CardHeader>
                    <h3 className="text-xl font-semibold">Identitas & Konsep Kuesioner</h3>
                </Card.CardHeader>
                <Card.CardContent className="grid gap-4 md:grid-cols-2">
                    <form.Field name="identity.title">
                        {(field) => (
                            <div className="md:col-span-2">
                                <FieldWrapper label="Judul Kuesioner" htmlFor={field.name}>
                                    <Input
                                        id={field.name}
                                        placeholder="Contoh: Persepsi Pengguna terhadap Dompet Digital"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                    />
                                    <FieldError errors={field.state.meta.errors} />
                                </FieldWrapper>
                            </div>
                        )}
                    </form.Field>

                    <form.Field name="identity.description">
                        {(field) => (
                            <div className="md:col-span-2">
                                <FieldWrapper label="Deskripsi & Pengantar Riset" htmlFor={field.name}>
                                    <Textarea
                                        id={field.name}
                                        rows={4}
                                        placeholder="Jelaskan tujuan riset kepada responden"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                    />
                                    <div className="flex justify-between">
                                        <FieldError errors={field.state.meta.errors} />
                                        <span className="text-muted-foreground ml-auto text-xs">{field.state.value.length}/1000</span>
                                    </div>
                                </FieldWrapper>
                            </div>
                        )}
                    </form.Field>

                    <form.Field name="identity.category">
                        {(field) => (
                            <FieldWrapper label="Kategori Topik">
                                <Select.Select
                                    items={categoryItems}
                                    value={field.state.value}
                                    onValueChange={(v) => field.handleChange(v as typeof field.state.value)}
                                >
                                    <Select.SelectTrigger className="w-full">
                                        <Select.SelectValue />
                                    </Select.SelectTrigger>
                                    <Select.SelectContent>
                                        <Select.SelectGroup>
                                            {categoryItems.map((o) => (
                                                <Select.SelectItem key={o.value} value={o.value}>
                                                    {o.label}
                                                </Select.SelectItem>
                                            ))}
                                        </Select.SelectGroup>
                                    </Select.SelectContent>
                                </Select.Select>
                                <FieldError errors={field.state.meta.errors} />
                            </FieldWrapper>
                        )}
                    </form.Field>

                    <form.Field name="identity.estimatedMinutes">
                        {(field) => (
                            <FieldWrapper label="Estimasi Durasi (menit per responden)" htmlFor={field.name}>
                                <Input
                                    id={field.name}
                                    type="number"
                                    min={1}
                                    max={180}
                                    value={Number.isNaN(field.state.value) ? "" : field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                                />
                                <FieldError errors={field.state.meta.errors} />
                            </FieldWrapper>
                        )}
                    </form.Field>
                </Card.CardContent>
            </Card.Card>

            {/* CRITERIA FORM FIELD */}
            <Card.Card className="w-full">
                <Card.CardHeader>
                    <h3 className="text-xl font-semibold">Kriteria Target Responden</h3>
                </Card.CardHeader>
                <Card.CardContent className="grid gap-4 md:grid-cols-2">
                    <form.Field name="criteria.ageMin">
                        {(field) => (
                            <FieldWrapper label="Usia Minimum" htmlFor={field.name}>
                                <Input
                                    id={field.name}
                                    type="number"
                                    min={MIN_AGE}
                                    max={MAX_AGE}
                                    value={Number.isNaN(field.state.value) ? "" : field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                                />
                                <FieldError errors={field.state.meta.errors} />
                            </FieldWrapper>
                        )}
                    </form.Field>

                    <form.Field name="criteria.ageMax">
                        {(field) => (
                            <FieldWrapper label="Usia Maksimum" htmlFor={field.name}>
                                <Input
                                    id={field.name}
                                    type="number"
                                    min={MIN_AGE}
                                    max={MAX_AGE}
                                    value={Number.isNaN(field.state.value) ? "" : field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                                />
                                <FieldError errors={field.state.meta.errors} />
                            </FieldWrapper>
                        )}
                    </form.Field>

                    <form.Field name="criteria.gender">
                        {(field) => (
                            <FieldWrapper label="Jenis Kelamin">
                                <Select.Select
                                    items={genderItems}
                                    value={field.state.value}
                                    onValueChange={(v) => field.handleChange(v as typeof field.state.value)}
                                >
                                    <Select.SelectTrigger className="w-full">
                                        <Select.SelectValue />
                                    </Select.SelectTrigger>
                                    <Select.SelectContent>
                                        <Select.SelectGroup>
                                            {genderItems.map((o) => (
                                                <Select.SelectItem key={o.value} value={o.value}>
                                                    {o.label}
                                                </Select.SelectItem>
                                            ))}
                                        </Select.SelectGroup>
                                    </Select.SelectContent>
                                </Select.Select>
                            </FieldWrapper>
                        )}
                    </form.Field>

                    <form.Field name="criteria.region">
                        {(field) => (
                            <FieldWrapper label="Wilayah / Domisili">
                                <Select.Select
                                    items={regionItems}
                                    value={field.state.value}
                                    onValueChange={(v) => field.handleChange(v as typeof field.state.value)}
                                >
                                    <Select.SelectTrigger className="w-full">
                                        <Select.SelectValue />
                                    </Select.SelectTrigger>
                                    <Select.SelectContent>
                                        <Select.SelectGroup>
                                            {regionItems.map((o) => (
                                                <Select.SelectItem key={o.value} value={o.value}>
                                                    {o.label}
                                                </Select.SelectItem>
                                            ))}
                                        </Select.SelectGroup>
                                    </Select.SelectContent>
                                </Select.Select>
                            </FieldWrapper>
                        )}
                    </form.Field>
                </Card.CardContent>
            </Card.Card>

            {/* QUESTIONS FORM FIELD */}
            <form.Field name="questions" mode="array">
                {(questionsField) => {
                    const total = questionsField.state.value.length;

                    return (
                        <div className="flex flex-col gap-4">
                            {questionsField.state.value.map((q, questionItemIdx) => {
                                const isEssay = q.questionType === "essay-answer";
                                const isScale = q.questionType === "scale-answer";

                                return (
                                    <Card.Card key={q.id} className="w-full">
                                        {/* CARD HEADER */}
                                        <Card.CardHeader className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-xl font-semibold leading-snug">Pertanyaan {questionItemIdx + 1}</h3>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        disabled={questionItemIdx === 0}
                                                        onClick={() => questionsField.moveValue(questionItemIdx, questionItemIdx - 1)}
                                                    >
                                                        <ChevronUp />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        disabled={questionItemIdx === total - 1}
                                                        onClick={() => questionsField.moveValue(questionItemIdx, questionItemIdx + 1)}
                                                    >
                                                        <ChevronDown />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        disabled={total >= MAX_QUESTIONS}
                                                        onClick={() => {
                                                            const copy = {
                                                                ...q,
                                                                id: crypto.randomUUID(),
                                                                choices: q.choices.map((c) => ({
                                                                    ...c,
                                                                    id: crypto.randomUUID(),
                                                                })),
                                                            } as QuestionItem;
                                                            questionsField.insertValue(questionItemIdx + 1, copy);
                                                        }}
                                                    >
                                                        <Copy />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        disabled={total <= 1}
                                                        onClick={() => questionsField.removeValue(questionItemIdx)}
                                                    >
                                                        <Trash2 />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Tipe Pertanyaan */}
                                            <form.Field name={`questions[${questionItemIdx}].questionType`}>
                                                {(field) => (
                                                    <Select.Select
                                                        items={questionTypeItems}
                                                        value={field.state.value}
                                                        onValueChange={(next) => {
                                                            if (!next || next === field.state.value) return;
                                                            // Ganti seluruh item agar `choices` selalu cocok dengan tipenya
                                                            questionsField.replaceValue(questionItemIdx, {
                                                                ...makeQuestion(q.pos, next as QuestionType),
                                                                id: q.id,
                                                                question: q.question,
                                                                mustFill: q.mustFill,
                                                            });
                                                        }}
                                                    >
                                                        <Select.SelectTrigger className="w-full">
                                                            <Select.SelectValue />
                                                        </Select.SelectTrigger>
                                                        <Select.SelectContent>
                                                            <Select.SelectGroup>
                                                                <Select.SelectLabel>Tipe Pertanyaan</Select.SelectLabel>
                                                                {questionTypeItems
                                                                    .filter((item) => item.value !== null)
                                                                    .map((item) => (
                                                                        <Select.SelectItem key={item.value} value={item.value as string}>
                                                                            {item.label}
                                                                        </Select.SelectItem>
                                                                    ))}
                                                            </Select.SelectGroup>
                                                        </Select.SelectContent>
                                                    </Select.Select>
                                                )}
                                            </form.Field>

                                            {/* Pertanyaan */}
                                            <form.Field name={`questions[${questionItemIdx}].question`}>
                                                {(field) => (
                                                    <>
                                                        <Textarea
                                                            placeholder="Ketik pertanyaanmu disini"
                                                            value={field.state.value}
                                                            onBlur={field.handleBlur}
                                                            onChange={(e) => field.handleChange(e.target.value)}
                                                        />
                                                        <FieldError errors={field.state.meta.errors} />
                                                    </>
                                                )}
                                            </form.Field>
                                        </Card.CardHeader>

                                        {/* CARD CONTENT */}
                                        <Card.CardContent>
                                            {isEssay ? (
                                                <Textarea disabled placeholder="Responden akan mengetik jawaban singkat di sini" />
                                            ) : (
                                                <form.Field name={`questions[${questionItemIdx}].choices`} mode="array">
                                                    {(choicesField) => (
                                                        <div className="flex flex-col space-y-2">
                                                            <p className="text-sm font-medium">
                                                                {isScale ? "Skala Likert (1–5)" : "Pilihan Jawaban"}
                                                            </p>

                                                            {choicesField.state.value.map((choice, choiceIdx) => (
                                                                <div className="flex items-center space-x-2" key={choice.id}>
                                                                    <span className="text-muted-foreground w-6 text-sm">
                                                                        {isScale ? choiceIdx + 1 : choice.n}.
                                                                    </span>
                                                                    <form.Field
                                                                        name={`questions[${questionItemIdx}].choices[${choiceIdx}].choiceText`}
                                                                    >
                                                                        {(field) => (
                                                                            <div className="flex-1">
                                                                                <Input
                                                                                    placeholder="masukkan pilihan kamu"
                                                                                    value={field.state.value}
                                                                                    onBlur={field.handleBlur}
                                                                                    onChange={(e) => field.handleChange(e.target.value)}
                                                                                />
                                                                                <FieldError errors={field.state.meta.errors} />
                                                                            </div>
                                                                        )}
                                                                    </form.Field>

                                                                    {!isScale && (
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            disabled={choicesField.state.value.length <= 2}
                                                                            onClick={() => choicesField.removeValue(choiceIdx)}
                                                                        >
                                                                            Hapus
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            ))}

                                                            <FieldError errors={choicesField.state.meta.errors} />

                                                            {!isScale && (
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    className="self-start"
                                                                    disabled={choicesField.state.value.length >= MAX_CHOICES}
                                                                    onClick={() =>
                                                                        choicesField.pushValue(makeChoice(choicesField.state.value.length))
                                                                    }
                                                                >
                                                                    <Plus /> Tambah Pilihan
                                                                </Button>
                                                            )}
                                                        </div>
                                                    )}
                                                </form.Field>
                                            )}
                                        </Card.CardContent>

                                        {/* CARD FOOTER */}
                                        <Card.CardFooter className="flex-col gap-2">
                                            <form.Field name={`questions[${questionItemIdx}].mustFill`}>
                                                {(field) => (
                                                    <div className="flex w-full items-center justify-between">
                                                        <Label htmlFor={field.name}>Wajib dijawab</Label>
                                                        <Switch
                                                            id={field.name}
                                                            checked={field.state.value}
                                                            onCheckedChange={(checked) => field.handleChange(checked)}
                                                        />
                                                    </div>
                                                )}
                                            </form.Field>
                                        </Card.CardFooter>
                                    </Card.Card>
                                );
                            })}

                            <FieldError errors={questionsField.state.meta.errors} />

                            <Button
                                type="button"
                                variant="outline"
                                disabled={total >= MAX_QUESTIONS}
                                onClick={() => questionsField.pushValue(makeQuestion(total + 1))}
                            >
                                <Plus /> Tambah Pertanyaan ({total}/{MAX_QUESTIONS})
                            </Button>
                        </div>
                    );
                }}
            </form.Field>

            {/* SUBMIT */}
            <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting, s.isDirty] as const}>
                {([canSubmit, isSubmitting, isDirty]) => (
                    <Button type="submit" disabled={!canSubmit || isSubmitting || !isDirty}>
                        {isSubmitting ? "Menyimpan..." : "Simpan Kuesioner Sebagai Draft"}
                    </Button>
                )}
            </form.Subscribe>
        </form>
    );
}
