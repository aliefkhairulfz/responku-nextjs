"use client";

import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import z from "zod";
import { Button } from "@/components/ui/button";
import * as Card from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MailCheck } from "lucide-react";
import Link from "next/link";

const PAGE_SIZE = 5;
type Choice = { id: string; pos: number; n: string; choiceText: string };
type Question = {
    id: string;
    pos: number;
    question: string;
    mustFill: boolean;
    questionType: "single-answer" | "multi-answer" | "scale-answer" | "essay-answer";
    choices: Choice[];
};
type Answer = { questionId: string; selected: string[]; text: string };

const questions: Question[] = [
    {
        id: "32476abc-e346-4d5b-bcee-3f70c42d99a0",
        pos: 1,
        question: "seberapa sering anda berolahraga kardio, di hari libur?",
        mustFill: true,
        questionType: "multi-answer",
        choices: [
            { id: "36668a42-fd01-4b35-9bab-cc162deda4cd", pos: 1, n: "a", choiceText: "sering" },
            { id: "8429d30b-4965-4ce7-9c96-3c8934020ca5", pos: 2, n: "b", choiceText: "sangat sering" },
        ],
    },
    {
        id: "9011c1fc-5905-42b3-af9c-1805cc78a312",
        pos: 1,
        question: "seberapa sering anda berolahraga kardio, di hari libur?",
        mustFill: true,
        questionType: "scale-answer",
        choices: [
            { id: "bc8f4482-842e-4101-a494-ed759b942867", pos: 1, n: "a", choiceText: "Sangat Tidak Setuju" },
            { id: "489ddde1-27e5-42af-9b8c-da7dfad47061", pos: 2, n: "b", choiceText: "Tidak Setuju" },
            { id: "694b0032-3f2d-4842-8bfc-3fb17ca3aa8a", pos: 3, n: "c", choiceText: "Netral" },
            { id: "b625f0f5-f86a-4b51-8034-8f1370cbea87", pos: 4, n: "d", choiceText: "Setuju" },
            { id: "37232304-0185-4421-b427-10670b7ac4b2", pos: 5, n: "e", choiceText: "Sangat Setuju" },
        ],
    },
    {
        id: "71cf40ac-5b8a-4265-81fe-65b8bcc525f0",
        pos: 1,
        question: "seberapa sering anda berolahraga kardio, di hari libur?",
        mustFill: true,
        questionType: "essay-answer",
        choices: [],
    },
    {
        id: "cfdbfb50-d982-4e53-81d4-4c80705bf64b",
        pos: 1,
        question: "seberapa sering anda berolahraga kardio, di hari libur?",
        mustFill: true,
        questionType: "single-answer",
        choices: [
            { id: "79246de6-6b7a-4772-a60b-be520f1b75a6", pos: 1, n: "a", choiceText: "sering" },
            { id: "a6cb67d9-df36-415f-be08-1685b4a62657", pos: 2, n: "b", choiceText: "sangat sering" },
        ],
    },
];

function getFieldSchema(q: Question) {
    if (q.questionType === "essay-answer") return q.mustFill ? z.string().trim().min(1, "Pertanyaan ini wajib dijawab.") : z.string();
    return q.mustFill ? z.array(z.string()).min(1, "Pertanyaan ini wajib dijawab.") : z.array(z.string());
}

function FieldError({ errors }: { errors: unknown[] }) {
    const first = errors[0];
    const message = typeof first === "string" ? first : (first as { message?: string } | undefined)?.message;
    if (!message) return null;
    return <p className="text-destructive text-sm">{message}</p>;
}

export default function Page() {
    const [page, setPage] = useState(0);
    const [result, setResult] = useState<Answer[] | null>(null);
    const form = useForm({
        defaultValues: {
            answers: questions.map((q): Answer => ({ questionId: q.id, selected: [], text: "" })),
        },
        onSubmit: async ({ value }) => {
            console.log(value.answers);
            setResult(value.answers);
        },
    });

    const totalPages = Math.ceil(questions.length / PAGE_SIZE);
    const start = page * PAGE_SIZE;
    const pageQuestions = questions.slice(start, start + PAGE_SIZE);
    const isLast = page === totalPages - 1;

    async function validatePage() {
        let valid = true;
        for (let i = 0; i < pageQuestions.length; i++) {
            const idx = start + i;
            const name = pageQuestions[i].questionType === "essay-answer" ? `answers[${idx}].text` : `answers[${idx}].selected`;
            await form.validateField(name as `answers[${number}].text`, "submit");
            const errors = form.getFieldMeta(name as `answers[${number}].text`)?.errors ?? [];
            if (errors.length > 0) valid = false;
        }
        return valid;
    }

    function goTo(target: number) {
        setPage(target);
        window.scrollTo({ top: 0 });
    }

    async function handleNext() {
        if (await validatePage()) goTo(page + 1);
    }

    async function handleSubmit() {
        if (await validatePage()) form.handleSubmit();
    }

    if (result) {
        return (
            <main className="flex mt-15 w-full items-center justify-center p-4">
                <Card.Card className="w-full max-w-lg">
                    <Card.CardHeader className="flex flex-col items-center gap-3 px-6 pt-10 text-center sm:px-10">
                        <span className="text-sm font-medium text-primary">Survei Selesai</span>
                        <Card.CardTitle className="text-2xl font-semibold tracking-tight">Jawaban kamu sudah dikirim!</Card.CardTitle>
                        <Card.CardDescription className="max-w-sm text-sm leading-6">
                            Terima kasih sudah berpartisipasi. Salinan jawaban yang kamu kirim dapat kamu lihat melalui email.
                        </Card.CardDescription>
                    </Card.CardHeader>

                    <Card.CardFooter className="justify-center px-6 pb-10 pt-4 sm:px-10">
                        <Button className="w-full sm:w-auto">
                            <Link href="/dashboard">Kembali</Link>
                        </Button>
                    </Card.CardFooter>
                </Card.Card>
            </main>
        );
    }

    return (
        <form
            className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10 mt-10"
            onSubmit={(e) => {
                e.preventDefault();
            }}
        >
            <p className="text-muted-foreground text-sm">
                Halaman {page + 1} dari {totalPages}
            </p>

            {pageQuestions.map((q, i) => {
                const idx = start + i; // index global di array answers
                const schema = getFieldSchema(q);

                return (
                    <Card.Card key={q.id} className="w-full">
                        <Card.CardHeader className="space-y-1">
                            <p className="text-muted-foreground text-xs">
                                Pertanyaan {idx + 1}
                                {q.mustFill && <span className="text-destructive ml-1">*</span>}
                            </p>
                            <h2 className="text-lg leading-snug font-semibold">{q.question}</h2>
                        </Card.CardHeader>

                        <Card.CardContent className="flex flex-col gap-3">
                            {/* SINGLE */}
                            {q.questionType === "single-answer" && (
                                <form.Field name={`answers[${idx}].selected`} validators={{ onChange: schema as never, onSubmit: schema as never }}>
                                    {(field) => (
                                        <>
                                            <RadioGroup
                                                value={field.state.value[0] ?? ""}
                                                onValueChange={(v) => field.handleChange([v as string])}
                                                className="gap-2"
                                            >
                                                {q.choices.map((c) => (
                                                    <div key={c.id} className="flex items-center gap-3 rounded-lg border p-3">
                                                        <RadioGroupItem id={c.id} value={c.id} />
                                                        <Label htmlFor={c.id} className="flex-1 cursor-pointer font-normal">
                                                            {c.choiceText}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </RadioGroup>
                                            <FieldError errors={field.state.meta.errors} />
                                        </>
                                    )}
                                </form.Field>
                            )}

                            {/* MULTI */}
                            {q.questionType === "multi-answer" && (
                                <form.Field name={`answers[${idx}].selected`} validators={{ onChange: schema as never, onSubmit: schema as never }}>
                                    {(field) => (
                                        <>
                                            {q.choices.map((c) => (
                                                <div key={c.id} className="flex items-center gap-3 rounded-lg border p-3">
                                                    <Checkbox
                                                        id={c.id}
                                                        checked={field.state.value.includes(c.id)}
                                                        onCheckedChange={(checked) =>
                                                            field.handleChange(
                                                                checked
                                                                    ? [...field.state.value, c.id]
                                                                    : field.state.value.filter((id) => id !== c.id),
                                                            )
                                                        }
                                                    />
                                                    <Label htmlFor={c.id} className="flex-1 cursor-pointer font-normal">
                                                        {c.choiceText}
                                                    </Label>
                                                </div>
                                            ))}
                                            <FieldError errors={field.state.meta.errors} />
                                        </>
                                    )}
                                </form.Field>
                            )}

                            {/* SCALE */}
                            {q.questionType === "scale-answer" && (
                                <form.Field name={`answers[${idx}].selected`} validators={{ onChange: schema as never, onSubmit: schema as never }}>
                                    {(field) => (
                                        <div className="flex flex-col gap-2">
                                            <div className="flex justify-between gap-2">
                                                {q.choices.map((c, n) => (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        onClick={() => field.handleChange([c.id])}
                                                        className={cn(
                                                            "flex h-12 flex-1 items-center justify-center rounded-full border text-sm font-medium transition-colors",
                                                            field.state.value[0] === c.id ? "bg-primary border-primary text-white" : "hover:bg-muted",
                                                        )}
                                                    >
                                                        {n + 1}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="text-muted-foreground flex justify-between text-xs">
                                                <span>{q.choices[0]?.choiceText}</span>
                                                <span>{q.choices[q.choices.length - 1]?.choiceText}</span>
                                            </div>
                                            <FieldError errors={field.state.meta.errors} />
                                        </div>
                                    )}
                                </form.Field>
                            )}

                            {/* ESSAY */}
                            {q.questionType === "essay-answer" && (
                                <form.Field name={`answers[${idx}].text`} validators={{ onChange: schema as never, onSubmit: schema as never }}>
                                    {(field) => (
                                        <>
                                            <Textarea
                                                rows={4}
                                                placeholder="Ketik jawabanmu di sini"
                                                value={field.state.value}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                            />
                                            <FieldError errors={field.state.meta.errors} />
                                        </>
                                    )}
                                </form.Field>
                            )}
                        </Card.CardContent>
                    </Card.Card>
                );
            })}

            <div className="flex justify-between gap-2 ring-1">
                <Button type="button" variant="outline" disabled={page === 0} onClick={() => goTo(page - 1)}>
                    Sebelumnya
                </Button>

                {isLast ? (
                    <Button type="button" onClick={handleSubmit}>
                        Kirim Jawaban
                    </Button>
                ) : (
                    <Button type="button" onClick={handleNext}>
                        Selanjutnya
                    </Button>
                )}
            </div>
        </form>
    );
}
