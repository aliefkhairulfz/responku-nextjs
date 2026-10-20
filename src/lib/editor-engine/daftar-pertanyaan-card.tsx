"use client";

// Import
import { Button } from "@/components/ui/button";
import * as Card from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "@tanstack/react-form";
import { ArrowDown, ArrowUp, Coins, Eye, Pencil, Plus, Trash, X } from "lucide-react";
import { useState } from "react";
import z from "zod";

// IDENTITY SCHEMA
const identitySchema = z.object({
    title: z.string().min(1, "Judul kuesioner wajib diisi.").max(120, "Judul maksimal 120 karakter."),
    description: z.string().max(1000, "Deskripsi maksimal 1000 karakter."),
    category: z.enum(
        ["Fintech & Perbankan", "Konsumen & Retail", "Pendidikan & Akademik", "Kesehatan & Gaya Hidup", "Teknologi & Internet"],
        "Pilih kategori topik.",
    ),
    estimatedMinutes: z
        .number("Durasi harus berupa angka.")
        .int("Durasi harus bilangan bulat.")
        .min(1, "Minimal 1 menit.")
        .max(180, "Maksimal 180 menit."),
});

// CRITERIA SCHEMA
const MIN_AGE = 18;
const MAX_AGE = 80;
const ageSchema = (label: string) =>
    z
        .number(`${label} harus berupa angka.`)
        .int(`${label} harus bilangan bulat.`)
        .min(MIN_AGE, `${label} minimal ${MIN_AGE} tahun.`)
        .max(MAX_AGE, `${label} maksimal ${MAX_AGE} tahun.`);
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
    });

// QUESTIONS SCHEMA
const choiceSchema = z.object({
    id: z.string().min(1),
    pos: z.number().min(1),
    n: z.string().min(1),
    choiceText: z.string().min(1, "Jawaban wajib diisi"),
});
const baseQuestionSchema = z.object({
    id: z.string().min(1),
    pos: z.number().min(1),
    question: z.string().min(1, "Pertanyaan wajib diisi"),
    mustFill: z.boolean(),
});
const itemPilihan = [
    { label: "Pilihan Tunggal", value: "single-answer" },
    { label: "Pilihan Jamak", value: "multi-answer" },
    { label: "Skala", value: "scale-answer" },
    { label: "Jawaban Singkat", value: "essay-answer" },
];
const questionSchema = z
    .array(
        z.discriminatedUnion("questionType", [
            baseQuestionSchema.extend({
                questionType: z.literal("single-answer"),
                choices: z.array(choiceSchema).min(2, "Pilihan ganda minimal 2 item"),
            }),
            baseQuestionSchema.extend({
                questionType: z.literal("multi-answer"),
                choices: z.array(choiceSchema).min(2, "Pilihan ganda minimal 2 item"),
            }),
            baseQuestionSchema.extend({
                questionType: z.literal("scale-answer"),
                choices: z.array(choiceSchema).min(2, "Skala minimal 2 item"),
            }),
            baseQuestionSchema.extend({
                questionType: z.literal("essay-answer"),
                choices: z.array(choiceSchema).max(1, "Essay maksimal 1 jawaban"),
            }),
        ]),
    )
    .min(1, "Pertanyaan minimal 1 item");
type QuestionValues = z.infer<typeof questionSchema>;

const createAnswer = (pos: number): QuestionValues[number]["choices"][number] => ({
    id: crypto.randomUUID(),
    pos,
    n: String.fromCharCode(64 + pos), // 1 -> A, 2 -> B, ...
    choiceText: "",
});
const createDefaultQuestion = (pos: number): QuestionValues[number] => ({
    id: crypto.randomUUID(),
    pos,
    questionType: "single-answer",
    question: "",
    mustFill: false,
    choices: [createAnswer(1), createAnswer(2)],
});
const normalize = (questions: QuestionValues): QuestionValues =>
    questions.map((q, qi) => ({
        ...q,
        pos: qi + 1,
        choices: q.choices.map((a, ai) => ({
            ...a,
            pos: ai + 1,
            n: String.fromCharCode(65 + ai),
        })),
    }));
const errorText = (errors: unknown[]) =>
    errors
        .map((e) => (e as { message?: string } | undefined)?.message)
        .filter(Boolean)
        .join(", ");

// Menu
const menuItems = [
    { label: "Alokasi Token", icon: Coins }, // ← BARU, posisi paling atas
    { label: "Editor", icon: Pencil },
    { label: "Preview", icon: Eye },
];

function MenuList({ activeMenu, onMenuChange }: { activeMenu: string; onMenuChange: (label: string) => void }) {
    return (
        <ul className="flex flex-col gap-1">
            {menuItems.map(({ label, icon: Icon }) => (
                <li key={label}>
                    <button
                        type="button"
                        onClick={() => onMenuChange(label)}
                        className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition-colors ${
                            activeMenu === label ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                    >
                        <Icon className="size-5 shrink-0" />
                        <span>{label}</span>
                    </button>
                </li>
            ))}
        </ul>
    );
}

// COMPONENTS
export default function DaftarPertanyaanCard() {
    const [activeMenu, setActiveMenu] = useState("Alokasi Token"); // ← default ke menu baru
    const [defaultValues] = useState(() => ({
        identity: {
            title: "",
            description: "",
            category: "Fintech & Perbankan" as z.infer<typeof identitySchema>["category"],
            estimatedMinutes: 1,
        },
        criteria: {
            ageMin: MIN_AGE,
            ageMax: MAX_AGE,
            gender: "all" as z.infer<typeof criteriaSchema>["gender"],
            region: "all" as z.infer<typeof criteriaSchema>["region"],
        },
        questions: [createDefaultQuestion(1)],
    }));
    const form = useForm({
        defaultValues,
        validators: {
            onChange: z.object({
                identity: identitySchema,
                criteria: criteriaSchema,
                questions: questionSchema,
            }),
        },
        onSubmit: async ({ value }) => {
            console.log({
                identity: value.identity,
                criteria: value.criteria,
                questions: normalize(value.questions),
            });
        },
    });

    return (
        <main className="container2nd mx-auto mt-15 grid h-[calc(100dvh-60px)] grid-rows-[auto_1fr] md:grid-cols-[220px_minmax(0,1fr)] md:grid-rows-1">
            {/* ================= SIDEBAR ================= */}
            <aside className="min-h-0 border-b py-4 md:border-r md:border-b-0 md:py-4 md:pr-4">
                <MenuList activeMenu={activeMenu} onMenuChange={setActiveMenu} />
            </aside>

            {/* ================= CONTENT ================= */}
            <section className="min-h-0 overflow-y-auto py-4 pb-16 md:pl-4">
                {activeMenu === "Alokasi Token" ? (
                    <AlokasiTokenPanel />
                ) : activeMenu === "Editor" ? (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            form.handleSubmit();
                        }}
                        className="w-full space-y-6"
                    >
                        {/* ================= IDENTITY ================= */}
                        <Card.Card className="w-full">
                            <Card.CardHeader>
                                <Card.CardTitle>Identitas Kuesioner</Card.CardTitle>
                                <Card.CardDescription>Informasi dasar tentang kuesioner Anda.</Card.CardDescription>
                            </Card.CardHeader>

                            <Card.CardContent className="space-y-4">
                                {/* title */}
                                <form.Field name="identity.title">
                                    {(f) => (
                                        <div className="flex flex-col space-y-2">
                                            <label className="text-sm font-medium">Judul</label>
                                            <Input
                                                placeholder="Judul kuesioner"
                                                value={f.state.value}
                                                onBlur={f.handleBlur}
                                                onChange={(e) => f.handleChange(e.target.value)}
                                            />
                                            {f.state.meta.isTouched && f.state.meta.errors.length > 0 && (
                                                <p className="text-sm text-destructive">{errorText(f.state.meta.errors)}</p>
                                            )}
                                        </div>
                                    )}
                                </form.Field>

                                {/* description */}
                                <form.Field name="identity.description">
                                    {(f) => (
                                        <div className="flex flex-col space-y-2">
                                            <label className="text-sm font-medium">Deskripsi</label>
                                            <Textarea
                                                placeholder="Deskripsi singkat kuesioner"
                                                value={f.state.value}
                                                onBlur={f.handleBlur}
                                                onChange={(e) => f.handleChange(e.target.value)}
                                            />
                                            {f.state.meta.isTouched && f.state.meta.errors.length > 0 && (
                                                <p className="text-sm text-destructive">{errorText(f.state.meta.errors)}</p>
                                            )}
                                        </div>
                                    )}
                                </form.Field>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    {/* category */}
                                    <form.Field name="identity.category">
                                        {(f) => (
                                            <div className="flex flex-col space-y-2">
                                                <label className="text-sm font-medium">Kategori</label>
                                                <Select
                                                    value={f.state.value}
                                                    onValueChange={(val) => {
                                                        if (!val) return;
                                                        f.handleChange(val as typeof f.state.value);
                                                    }}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectGroup>
                                                            <SelectLabel>Kategori topik</SelectLabel>
                                                            <SelectItem value="Fintech & Perbankan">Fintech & Perbankan</SelectItem>
                                                            <SelectItem value="Konsumen & Retail">Konsumen & Retail</SelectItem>
                                                            <SelectItem value="Pendidikan & Akademik">Pendidikan & Akademik</SelectItem>
                                                            <SelectItem value="Kesehatan & Gaya Hidup">Kesehatan & Gaya Hidup</SelectItem>
                                                            <SelectItem value="Teknologi & Internet">Teknologi & Internet</SelectItem>
                                                        </SelectGroup>
                                                    </SelectContent>
                                                </Select>
                                                {f.state.meta.isTouched && f.state.meta.errors.length > 0 && (
                                                    <p className="text-sm text-destructive">{errorText(f.state.meta.errors)}</p>
                                                )}
                                            </div>
                                        )}
                                    </form.Field>

                                    {/* estimatedMinutes */}
                                    <form.Field name="identity.estimatedMinutes">
                                        {(f) => (
                                            <div className="flex flex-col space-y-2">
                                                <label className="text-sm font-medium">Estimasi Durasi (menit)</label>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    max={180}
                                                    value={f.state.value}
                                                    onBlur={f.handleBlur}
                                                    onChange={(e) => f.handleChange(Number(e.target.value))}
                                                />
                                                {f.state.meta.isTouched && f.state.meta.errors.length > 0 && (
                                                    <p className="text-sm text-destructive">{errorText(f.state.meta.errors)}</p>
                                                )}
                                            </div>
                                        )}
                                    </form.Field>
                                </div>
                            </Card.CardContent>
                        </Card.Card>

                        {/* ================= CRITERIA ================= */}
                        <Card.Card className="w-full">
                            <Card.CardHeader>
                                <Card.CardTitle>Kriteria Responden</Card.CardTitle>
                                <Card.CardDescription>Tentukan siapa yang boleh mengisi kuesioner ini.</Card.CardDescription>
                            </Card.CardHeader>

                            <Card.CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {/* ageMin */}
                                <form.Field name="criteria.ageMin">
                                    {(f) => (
                                        <div className="flex flex-col space-y-2">
                                            <label className="text-sm font-medium">Rentang Usia Minimum</label>
                                            <Input
                                                type="number"
                                                min={MIN_AGE}
                                                max={MAX_AGE}
                                                value={f.state.value}
                                                onBlur={f.handleBlur}
                                                onChange={(e) => f.handleChange(Number(e.target.value))}
                                            />
                                            {f.state.meta.isTouched && f.state.meta.errors.length > 0 && (
                                                <p className="text-sm text-destructive">{errorText(f.state.meta.errors)}</p>
                                            )}
                                        </div>
                                    )}
                                </form.Field>

                                {/* ageMax */}
                                <form.Field name="criteria.ageMax">
                                    {(f) => (
                                        <div className="flex flex-col space-y-2">
                                            <label className="text-sm font-medium">Rentang Usia Maksimum</label>
                                            <Input
                                                type="number"
                                                min={MIN_AGE}
                                                max={MAX_AGE}
                                                value={f.state.value}
                                                onBlur={f.handleBlur}
                                                onChange={(e) => f.handleChange(Number(e.target.value))}
                                            />
                                            {f.state.meta.isTouched && f.state.meta.errors.length > 0 && (
                                                <p className="text-sm text-destructive">{errorText(f.state.meta.errors)}</p>
                                            )}
                                        </div>
                                    )}
                                </form.Field>

                                {/* gender */}
                                <form.Field name="criteria.gender">
                                    {(f) => (
                                        <div className="flex flex-col space-y-2">
                                            <label className="text-sm font-medium">Jenis Kelamin</label>
                                            <Select
                                                value={f.state.value}
                                                onValueChange={(val) => {
                                                    if (!val) return;
                                                    f.handleChange(val as typeof f.state.value);
                                                }}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectGroup>
                                                        <SelectLabel>Jenis kelamin</SelectLabel>
                                                        <SelectItem value="all">Semua</SelectItem>
                                                        <SelectItem value="male">Laki-laki</SelectItem>
                                                        <SelectItem value="female">Perempuan</SelectItem>
                                                    </SelectGroup>
                                                </SelectContent>
                                            </Select>
                                            {f.state.meta.isTouched && f.state.meta.errors.length > 0 && (
                                                <p className="text-sm text-destructive">{errorText(f.state.meta.errors)}</p>
                                            )}
                                        </div>
                                    )}
                                </form.Field>

                                {/* region */}
                                <form.Field name="criteria.region">
                                    {(f) => (
                                        <div className="flex flex-col space-y-2">
                                            <label className="text-sm font-medium">Wilayah / Domisili</label>
                                            <Select
                                                value={f.state.value}
                                                onValueChange={(val) => {
                                                    if (!val) return;
                                                    f.handleChange(val as typeof f.state.value);
                                                }}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectGroup>
                                                        <SelectLabel>Wilayah</SelectLabel>
                                                        <SelectItem value="all">Semua</SelectItem>
                                                        <SelectItem value="jabodetabek">Jabodetabek</SelectItem>
                                                        <SelectItem value="jawa-lainnya">Jawa Lainnya</SelectItem>
                                                        <SelectItem value="luar-jawa">Luar Jawa</SelectItem>
                                                    </SelectGroup>
                                                </SelectContent>
                                            </Select>
                                            {f.state.meta.isTouched && f.state.meta.errors.length > 0 && (
                                                <p className="text-sm text-destructive">{errorText(f.state.meta.errors)}</p>
                                            )}
                                        </div>
                                    )}
                                </form.Field>
                            </Card.CardContent>
                        </Card.Card>

                        {/* ================= QUESTIONS ================= */}
                        <Card.Card className="w-full">
                            <Card.CardHeader>
                                <Card.CardTitle>Pertanyaan</Card.CardTitle>
                                <Card.CardDescription>Susun daftar pertanyaan untuk responden.</Card.CardDescription>
                            </Card.CardHeader>
                        </Card.Card>

                        <form.Field name="questions" mode="array">
                            {(questionItems) => (
                                <div className="flex flex-col space-y-2">
                                    {questionItems.state.value.map((questionItem, i) => (
                                        <Card.Card className="w-full" key={questionItem.id}>
                                            <Card.CardHeader className="flex flex-row items-start justify-between gap-4">
                                                {/* question-title */}
                                                <form.Field name={`questions[${i}].question`}>
                                                    {(f) => (
                                                        <div className="w-full space-y-2">
                                                            <Textarea
                                                                placeholder="Isi pertanyaan anda"
                                                                value={f.state.value}
                                                                onBlur={f.handleBlur}
                                                                onChange={(e) => f.handleChange(e.target.value)}
                                                            />
                                                            {f.state.meta.isTouched && f.state.meta.errors.length > 0 && (
                                                                <p className="text-sm text-destructive">{errorText(f.state.meta.errors)}</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </form.Field>

                                                {/* question-type */}
                                                <form.Field name={`questions[${i}].questionType`}>
                                                    {(f) => (
                                                        <Select
                                                            items={itemPilihan}
                                                            value={f.state.value}
                                                            onValueChange={(val) => {
                                                                if (!val) return;
                                                                const prev = f.state.value;
                                                                const next = val as typeof f.state.value;
                                                                if (prev === next) return;

                                                                f.handleChange(next);

                                                                if (next === "essay-answer") {
                                                                    form.setFieldValue(`questions[${i}].choices`, []);
                                                                } else if (prev === "essay-answer") {
                                                                    form.setFieldValue(`questions[${i}].choices`, [createAnswer(1), createAnswer(2)]);
                                                                }
                                                            }}
                                                        >
                                                            <SelectTrigger className="w-full max-w-48">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectGroup>
                                                                    <SelectLabel>Tipe pertanyaan</SelectLabel>
                                                                    {itemPilihan.map((item) => (
                                                                        <SelectItem key={item.value} value={item.value}>
                                                                            {item.label}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectGroup>
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                </form.Field>
                                            </Card.CardHeader>

                                            <Card.CardContent className="space-y-2">
                                                <form.Subscribe selector={(s) => s.values.questions[i]?.questionType}>
                                                    {(type) =>
                                                        type === "essay-answer" ? (
                                                            <Input disabled placeholder="Responden mengisi jawaban singkat di sini" />
                                                        ) : (
                                                            <form.Field name={`questions[${i}].choices`} mode="array">
                                                                {(answersField) => (
                                                                    <div className="flex flex-col space-y-3">
                                                                        <div className="flex flex-col space-y-2">
                                                                            {answersField.state.value.map((a, j) => (
                                                                                <form.Field
                                                                                    key={a.id}
                                                                                    name={`questions[${i}].choices[${j}].choiceText`}
                                                                                >
                                                                                    {(af) => (
                                                                                        <div className="flex flex-col space-y-2">
                                                                                            <div className="flex items-center gap-2">
                                                                                                <div className="flex h-8 w-9 items-center justify-center rounded-full border bg-secondary uppercase">
                                                                                                    {String.fromCharCode(65 + j)}
                                                                                                </div>

                                                                                                <div className="w-full space-y-2">
                                                                                                    <Input
                                                                                                        placeholder={`Pilihan ${String.fromCharCode(65 + j)}`}
                                                                                                        value={af.state.value}
                                                                                                        onBlur={af.handleBlur}
                                                                                                        onChange={(e) =>
                                                                                                            af.handleChange(e.target.value)
                                                                                                        }
                                                                                                    />
                                                                                                </div>

                                                                                                <Button
                                                                                                    type="button"
                                                                                                    variant="destructive"
                                                                                                    disabled={answersField.state.value.length <= 2}
                                                                                                    onClick={() => answersField.removeValue(j)}
                                                                                                >
                                                                                                    <X />
                                                                                                </Button>
                                                                                            </div>

                                                                                            {af.state.meta.isTouched &&
                                                                                                af.state.meta.errors.length > 0 && (
                                                                                                    <p className="text-sm text-destructive">
                                                                                                        {errorText(af.state.meta.errors)}
                                                                                                    </p>
                                                                                                )}
                                                                                        </div>
                                                                                    )}
                                                                                </form.Field>
                                                                            ))}
                                                                        </div>

                                                                        {answersField.state.meta.errors.length > 0 && (
                                                                            <p className="text-sm text-destructive">
                                                                                {errorText(answersField.state.meta.errors)}
                                                                            </p>
                                                                        )}

                                                                        <Button
                                                                            type="button"
                                                                            className="w-fit"
                                                                            onClick={() =>
                                                                                answersField.pushValue(
                                                                                    createAnswer(answersField.state.value.length + 1),
                                                                                )
                                                                            }
                                                                        >
                                                                            <Plus />
                                                                            <span>Tambah Pilihan Jawaban</span>
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </form.Field>
                                                        )
                                                    }
                                                </form.Subscribe>
                                            </Card.CardContent>

                                            <Separator />

                                            <Card.CardFooter className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center space-x-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        disabled={i === 0}
                                                        onClick={() => questionItems.moveValue(i, i - 1)}
                                                    >
                                                        <ArrowUp />
                                                        <span>Atas</span>
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        disabled={i === questionItems.state.value.length - 1}
                                                        onClick={() => questionItems.moveValue(i, i + 1)}
                                                    >
                                                        <ArrowDown />
                                                        <span>Bawah</span>
                                                    </Button>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => {
                                                            const current = form.getFieldValue(`questions[${i}]`);
                                                            questionItems.insertValue(i + 1, {
                                                                ...structuredClone(current),
                                                                id: crypto.randomUUID(),
                                                                choices: current.choices.map((a) => ({
                                                                    ...a,
                                                                    id: crypto.randomUUID(),
                                                                })),
                                                            });
                                                        }}
                                                    >
                                                        <span>Salin</span>
                                                    </Button>

                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        disabled={questionItems.state.value.length <= 1}
                                                        onClick={() => questionItems.removeValue(i)}
                                                    >
                                                        <Trash />
                                                        <span>Hapus</span>
                                                    </Button>

                                                    <form.Field name={`questions[${i}].mustFill`}>
                                                        {(f) => (
                                                            <label className="flex items-center gap-2">
                                                                <Input
                                                                    type="checkbox"
                                                                    className="w-4"
                                                                    checked={f.state.value}
                                                                    onChange={(e) => f.handleChange(e.target.checked)}
                                                                />
                                                                <span>Wajib Dijawab</span>
                                                            </label>
                                                        )}
                                                    </form.Field>
                                                </div>
                                            </Card.CardFooter>
                                        </Card.Card>
                                    ))}

                                    {questionItems.state.meta.errors.length > 0 && (
                                        <p className="text-sm text-destructive">{errorText(questionItems.state.meta.errors)}</p>
                                    )}

                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => questionItems.pushValue(createDefaultQuestion(questionItems.state.value.length + 1))}
                                        >
                                            <Plus />
                                            <span>Tambah Pertanyaan</span>
                                        </Button>

                                        <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
                                            {([canSubmit, isSubmitting]) => (
                                                <Button type="submit" disabled={!canSubmit}>
                                                    {isSubmitting ? "Menyimpan..." : "Simpan Kuesioner"}
                                                </Button>
                                            )}
                                        </form.Subscribe>
                                    </div>
                                </div>
                            )}
                        </form.Field>
                    </form>
                ) : (
                    <PreviewPanel value={form.state.values} />
                )}
            </section>
        </main>
    );
}

// PREVIEW PANEL
function PreviewPanel({
    value,
}: {
    value: {
        identity: z.infer<typeof identitySchema>;
        criteria: z.infer<typeof criteriaSchema>;
        questions: QuestionValues;
    };
}) {
    const categoryLabels: Record<string, string> = {
        all: "Semua",
        male: "Laki-laki",
        female: "Perempuan",
        jabodetabek: "Jabodetabek",
        "jawa-lainnya": "Jawa Lainnya",
        "luar-jawa": "Luar Jawa",
    };

    return (
        <div className="flex w-full flex-col space-y-6">
            <Card.Card className="w-full">
                <Card.CardHeader className="space-y-2">
                    <Card.CardTitle>{value.identity.title || "(Judul belum diisi)"}</Card.CardTitle>
                    <Card.CardDescription>{value.identity.description || "Tidak ada deskripsi."}</Card.CardDescription>
                </Card.CardHeader>

                <Card.CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                    <div className="space-y-1">
                        <p className="text-muted-foreground">Kategori</p>
                        <p className="font-medium">{value.identity.category}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-muted-foreground">Estimasi</p>
                        <p className="font-medium">{value.identity.estimatedMinutes} menit</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-muted-foreground">Usia</p>
                        <p className="font-medium">
                            {value.criteria.ageMin}–{value.criteria.ageMax} tahun
                        </p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-muted-foreground">Kriteria</p>
                        <p className="font-medium">
                            {categoryLabels[value.criteria.gender]} · {categoryLabels[value.criteria.region]}
                        </p>
                    </div>
                </Card.CardContent>
            </Card.Card>

            {value.questions.map((q, qi) => (
                <Card.Card key={q.id} className="w-full">
                    <Card.CardHeader className="space-y-1">
                        <Card.CardTitle className="text-base">
                            {qi + 1}. {q.question || "(Pertanyaan belum diisi)"}
                            {q.mustFill && <span className="ml-1 text-destructive">*</span>}
                        </Card.CardTitle>
                        <Card.CardDescription>{itemPilihan.find((p) => p.value === q.questionType)?.label ?? q.questionType}</Card.CardDescription>
                    </Card.CardHeader>

                    <Card.CardContent className="space-y-2">
                        {q.questionType === "essay-answer" ? (
                            <Textarea disabled placeholder="Jawaban responden..." />
                        ) : q.questionType === "scale-answer" ? (
                            <div className="flex flex-wrap gap-2">
                                {q.choices.map((c, ci) => (
                                    <div key={c.id} className="flex h-10 min-w-10 items-center justify-center rounded-md border px-3 text-sm">
                                        {ci + 1}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col space-y-2">
                                {q.choices.map((c, ci) => (
                                    <label key={c.id} className="flex items-center gap-2 text-sm">
                                        <input
                                            type={q.questionType === "multi-answer" ? "checkbox" : "radio"}
                                            name={`q-${q.id}`}
                                            disabled
                                            className="size-4"
                                        />
                                        <span className="text-muted-foreground">{String.fromCharCode(65 + ci)}.</span>
                                        <span>{c.choiceText || `Pilihan ${String.fromCharCode(65 + ci)}`}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </Card.CardContent>
                </Card.Card>
            ))}
        </div>
    );
}

// ALOKASI TOKEN
const alokasiTokenSchema = z
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
    });
type AlokasiTokenValues = z.infer<typeof alokasiTokenSchema>;

const batasWaktuOptions = [
    { value: "1", label: "1 Hari (Kilat)" },
    { value: "3", label: "3 Hari (Cepat)" },
    { value: "7", label: "7 Hari (Standar Rekomendasi)" },
    { value: "14", label: "14 Hari (Santai)" },
    { value: "30", label: "30 Hari (Maksimal)" },
];
const formatIDR = (n: number) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(n);
const TOKEN_TO_IDR = 1000; // 1 token = Rp1.000

function AlokasiTokenPanel() {
    const [defaultValues] = useState<AlokasiTokenValues>(() => ({
        targetResponden: 50,
        batasWaktu: "7",
        tokenPerResponden: 1,
    }));

    const form = useForm({
        defaultValues,
        validators: {
            onChange: alokasiTokenSchema,
        },
        onSubmit: async ({ value }) => {
            const totalToken = value.targetResponden * value.tokenPerResponden;
            const totalBiaya = totalToken * TOKEN_TO_IDR;
            const poolReward = Math.round(totalBiaya * 0.8);
            const biayaOps = totalBiaya - poolReward;

            console.log({
                targetResponden: value.targetResponden,
                batasWaktu: value.batasWaktu,
                tokenPerResponden: value.tokenPerResponden,
                totalToken,
                totalBiaya,
                poolReward,
                biayaOps,
                rewardPerResponden: Math.round(poolReward / value.targetResponden),
            });
        },
    });

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
            }}
            className="w-full space-y-6"
        >
            {/* ================= KONFIGURASI ================= */}
            <Card.Card className="w-full">
                <Card.CardHeader>
                    <Card.CardTitle>Alokasi Token & Budget</Card.CardTitle>
                    <Card.CardDescription>Tentukan target responden, batas waktu, dan token per responden.</Card.CardDescription>
                </Card.CardHeader>

                <Card.CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {/* targetResponden */}
                        <form.Field name="targetResponden">
                            {(f) => (
                                <div className="flex flex-col space-y-2">
                                    <label className="text-sm font-medium">Target Jumlah Responden</label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={10000}
                                        value={f.state.value}
                                        onBlur={f.handleBlur}
                                        onChange={(e) => f.handleChange(Number(e.target.value))}
                                    />
                                    {f.state.meta.isTouched && f.state.meta.errors.length > 0 && (
                                        <p className="text-sm text-destructive">{errorText(f.state.meta.errors)}</p>
                                    )}
                                </div>
                            )}
                        </form.Field>

                        {/* batasWaktu */}
                        <form.Field name="batasWaktu">
                            {(f) => (
                                <div className="flex flex-col space-y-2">
                                    <label className="text-sm font-medium">Batas Waktu Pengumpulan</label>
                                    <Select
                                        items={batasWaktuOptions}
                                        value={f.state.value}
                                        onValueChange={(val) => {
                                            if (!val) return;
                                            f.handleChange(val as typeof f.state.value);
                                        }}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectLabel>Batas waktu</SelectLabel>
                                                {batasWaktuOptions.map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    {f.state.meta.isTouched && f.state.meta.errors.length > 0 && (
                                        <p className="text-sm text-destructive">{errorText(f.state.meta.errors)}</p>
                                    )}
                                </div>
                            )}
                        </form.Field>
                    </div>

                    {/* tokenPerResponden */}
                    <form.Field name="tokenPerResponden">
                        {(f) => (
                            <div className="flex flex-col space-y-2">
                                <label className="text-sm font-medium">Token per Responden</label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={f.state.value}
                                    onBlur={f.handleBlur}
                                    onChange={(e) => f.handleChange(Number(e.target.value))}
                                />
                                {f.state.meta.isTouched && f.state.meta.errors.length > 0 && (
                                    <p className="text-sm text-destructive">{errorText(f.state.meta.errors)}</p>
                                )}
                            </div>
                        )}
                    </form.Field>
                </Card.CardContent>
            </Card.Card>

            {/* ================= RINGKASAN BUDGET ================= */}
            <form.Subscribe
                selector={(s) => ({
                    targetResponden: s.values.targetResponden,
                    tokenPerResponden: s.values.tokenPerResponden,
                })}
            >
                {({ targetResponden, tokenPerResponden }) => {
                    const totalToken = targetResponden * tokenPerResponden;
                    const totalBiaya = totalToken * TOKEN_TO_IDR;
                    const poolReward = Math.round(totalBiaya * 0.8);
                    const biayaOps = totalBiaya - poolReward;
                    const rewardPerResponden = Math.round(poolReward / Math.max(targetResponden, 1));

                    return (
                        <Card.Card className="w-full">
                            <Card.CardHeader>
                                <Card.CardTitle>Ringkasan Alokasi</Card.CardTitle>
                                <Card.CardDescription>
                                    Dana token akan diamankan dalam escrow sistem. Kuota yang tidak terpenuhi akan otomatis dikembalikan ke saldo
                                    dompet Anda.
                                </Card.CardDescription>
                            </Card.CardHeader>

                            <Card.CardContent className="space-y-4">
                                {/* Total highlight */}
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="rounded-lg border bg-muted/40 p-4">
                                        <p className="text-sm text-muted-foreground">Total Kebutuhan Token</p>
                                        <p className="text-2xl font-semibold">{totalToken.toLocaleString("id-ID")} Token</p>
                                    </div>
                                    <div className="rounded-lg border bg-muted/40 p-4">
                                        <p className="text-sm text-muted-foreground">Estimasi Biaya</p>
                                        <p className="text-2xl font-semibold">{formatIDR(totalBiaya)}</p>
                                    </div>
                                </div>

                                <Separator />

                                {/* Breakdown */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Pool Reward Responden (80%)</span>
                                        <span className="font-medium">{formatIDR(poolReward)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Biaya Operasional & QC (20%)</span>
                                        <span className="font-medium">{formatIDR(biayaOps)}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Reward per Responden</span>
                                        <span className="font-medium">
                                            {formatIDR(rewardPerResponden)} ({tokenPerResponden} Token)
                                        </span>
                                    </div>
                                </div>

                                <p className="rounded-md bg-secondary p-3 text-xs text-muted-foreground">
                                    Dana token akan diamankan dalam escrow sistem. Kuota yang tidak terpenuhi akan otomatis dikembalikan ke saldo
                                    dompet Anda.
                                </p>
                            </Card.CardContent>

                            <Card.CardFooter className="flex justify-end">
                                <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
                                    {([canSubmit, isSubmitting]) => (
                                        <Button type="submit" disabled={!canSubmit || totalToken <= 0}>
                                            {isSubmitting ? "Memproses..." : "Konfirmasi Alokasi"}
                                        </Button>
                                    )}
                                </form.Subscribe>
                            </Card.CardFooter>
                        </Card.Card>
                    );
                }}
            </form.Subscribe>
        </form>
    );
}
