"use client"

import { useForm } from "@tanstack/react-form"
import { Loader2, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import z from "zod"
import { Button } from "@/components/ui/button"
import * as Card from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { postJson } from "@/lib/api-client"
import type { ParticipationDetail, ParticipationQuestion } from "@/lib/api-types"
import { cn } from "@/lib/cn"
import { useWorkOnTimerStore } from "@/lib/stores/work-on-timer-store-provider"

/**
 * Taking one research.
 *
 * Every question arrives in one payload and is answered in the browser; the whole form is
 * sent once, at the end. There is no per-question request and no draft save — the route
 * only carries `researchId` so the page can join the right research.
 *
 * The `respondentId` segment is part of the path but not read: a participation always
 * belongs to the signed-in caller, and the API scopes it that way, so the id in the URL
 * could only ever repeat what the session already says.
 */

/* ========== Data ========== */

const PAGE_SIZE = 5

type Answer = { questionId: string; selected: string[]; text: string }

type PageState =
    | { status: "loading" }
    | { status: "ready"; participation: ParticipationDetail }
    | { status: "blocked"; message: string }
    | { status: "unauthenticated" }
    | { status: "error"; message: string }
    | { status: "done" }

/**
 * Joining is also how the page loads.
 *
 * `POST /api/research/{id}/participate` is idempotent and answers with the questionnaire
 * and whatever was already saved, so one call both opens the participation and says
 * whether it can be taken at all.
 *
 * Returning the state rather than setting it keeps this free of React, which is what lets
 * the effect below apply the answer in a callback.
 */
async function openParticipation(researchId: string): Promise<PageState> {
    const result = await postJson<{ participation: ParticipationDetail }>(`/api/research/${researchId}/participate`)

    if (result.statusCode === 401) return { status: "unauthenticated" }

    // Closed, filled, already answered, or refused by validation: the server has an
    // answer, and a retry would give the same one, so it is not an error to recover from.
    if (result.statusCode === 403 || result.statusCode === 409 || result.statusCode === 422) {
        return { status: "blocked", message: result.errors._root ?? result.message }
    }

    if (!result.ok || !result.data?.participation) return { status: "error", message: result.message }

    return { status: "ready", participation: result.data.participation }
}

function getFieldSchema(question: ParticipationQuestion) {
    if (question.questionType === "TEXT") {
        return question.mustFill ? z.string().trim().min(1, "Pertanyaan ini wajib dijawab.") : z.string()
    }

    return question.mustFill ? z.array(z.string()).min(1, "Pertanyaan ini wajib dijawab.") : z.array(z.string())
}

function FieldError({ errors }: { errors: unknown[] }) {
    const first = errors[0]
    const message = typeof first === "string" ? first : (first as { message?: string } | undefined)?.message
    if (!message) return null
    return <p className="text-destructive text-sm">{message}</p>
}

/* ========== Formulir ========== */

/**
 * The questionnaire itself.
 *
 * Created from the loaded participation and keyed by its id, so the form is built with
 * its values already in place instead of having them patched in afterwards.
 */
function SurveyForm({ participation, onSubmitted }: { participation: ParticipationDetail; onSubmitted: () => void }) {
    const questions = participation.questions
    const totalPages = Math.max(1, Math.ceil(questions.length / PAGE_SIZE))

    const [page, setPage] = useState(0)
    const [saving, setSaving] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)

    const form = useForm({
        defaultValues: {
            // Seeded from what is stored, so a part-filled form comes back as it was left.
            answers: questions.map((question): Answer => ({
                questionId: question.id,
                selected: question.answer.selected,
                text: question.answer.text ?? "",
            })),
        },
        onSubmit: async ({ value }) => {
            setSubmitError(null)
            setSubmitting(true)

            // One request carrying every answer. The server records the completion time
            // itself and measures the work against the research's own estimate.
            const result = await postJson<{ participation: ParticipationDetail }>(`/api/participation/${participation.id}/submit`, {
                answers: value.answers,
            })

            setSubmitting(false)

            if (!result.ok) {
                // A named field is worth showing under the form; anything else is worth a toast.
                if (result.errors.answers) {
                    setSubmitError(result.errors.answers)
                    return
                }

                toast.add({ type: "error", title: "Jawaban gagal dikirim", description: result.message })
                return
            }

            onSubmitted()
        },
    })

    const start = page * PAGE_SIZE
    const pageQuestions = questions.slice(start, start + PAGE_SIZE)
    const isLast = page === totalPages - 1

    async function validatePage() {
        let valid = true

        for (let i = 0; i < pageQuestions.length; i++) {
            const idx = start + i
            const name = pageQuestions[i].questionType === "TEXT" ? `answers[${idx}].text` : `answers[${idx}].selected`
            await form.validateField(name as `answers[${number}].text`, "submit")
            const errors = form.getFieldMeta(name as `answers[${number}].text`)?.errors ?? []
            if (errors.length > 0) valid = false
        }

        return valid
    }

    function goTo(target: number) {
        setPage(target)
        window.scrollTo({ top: 0 })
    }

    async function handleNext() {
        if (!(await validatePage())) return

        await saveDraft()
        goTo(page + 1)
    }

    /**
     * Stores the answers filled in so far, without sending the research in.
     *
     * Once per page, on moving forward — never once per question. The whole form still goes
     * out in a single request at the end, so this is a convenience rather than the thing that
     * makes the answers count: a failed save is worth telling the respondent about, but not
     * worth trapping them on a page over.
     */
    async function saveDraft() {
        setSaving(true)
        const result = await postJson(`/api/participation/${participation.id}/answers`, { answers: form.state.values.answers })
        setSaving(false)

        if (!result.ok) {
            toast.add({ type: "error", title: "Progres gagal disimpan", description: result.message })
        }
    }

    async function handleSubmit() {
        if (await validatePage()) form.handleSubmit()
    }

    return (
        <form
            className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10 mt-10"
            onSubmit={(e) => {
                e.preventDefault()
            }}
        >
            <p className="text-muted-foreground text-sm">
                Halaman {page + 1} dari {totalPages}
            </p>

            {pageQuestions.map((q, i) => {
                const idx = start + i // index global di array answers
                const schema = getFieldSchema(q)

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
                            {q.questionType === "SINGLE_CHOICE" && (
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
                            {q.questionType === "MULTIPLE_CHOICE" && (
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
                            {q.questionType === "SCALE" && (
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
                            {q.questionType === "TEXT" && (
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
                )
            })}

            <FieldError errors={submitError ? [submitError] : []} />

            <div className="flex justify-between gap-2 ring-1">
                <Button type="button" variant="outline" disabled={page === 0 || submitting} onClick={() => goTo(page - 1)}>
                    Sebelumnya
                </Button>

                {isLast ? (
                    <Button type="button" disabled={submitting || saving} onClick={handleSubmit}>
                        {submitting ? (
                            <>
                                <Loader2 className="animate-spin" />
                                Mengirim…
                            </>
                        ) : (
                            "Kirim Jawaban"
                        )}
                    </Button>
                ) : (
                    <Button type="button" disabled={saving} onClick={handleNext}>
                        {saving ? (
                            <>
                                <Loader2 className="animate-spin" />
                                Menyimpan…
                            </>
                        ) : (
                            "Selanjutnya"
                        )}
                    </Button>
                )}
            </div>
        </form>
    )
}

/* ========== Halaman ========== */

export default function Page() {
    const router = useRouter()
    const { researchId } = useParams<{ researchId: string }>()
    const [state, setState] = useState<PageState>({ status: "loading" })

    const setTimer = useWorkOnTimerStore((store) => store.setTimer)
    const clearTimer = useWorkOnTimerStore((store) => store.clearTimer)

    useEffect(() => {
        let cancelled = false

        void openParticipation(researchId).then((next) => {
            if (!cancelled) setState(next)
        })

        return () => {
            cancelled = true
        }
    }, [researchId])

    useEffect(() => {
        if (state.status === "unauthenticated") router.replace("/login")
    }, [state.status, router])

    // Publish the clock to the header while the questionnaire is open, and take it back down
    // otherwise so it does not linger on the other pages under this layout.
    useEffect(() => {
        if (state.status !== "ready") {
            clearTimer()
            return
        }

        setTimer({
            startedAt: state.participation.startedAt ?? state.participation.createdAt,
            estimatedMinutes: state.participation.research.estimatedDurationMinutes,
        })
    }, [state, setTimer, clearTimer])

    useEffect(() => clearTimer, [clearTimer])

    function reload() {
        setState({ status: "loading" })
        void openParticipation(researchId).then(setState)
    }

    if (state.status === "done") {
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
        )
    }

    if (state.status === "loading") {
        return (
            <main className="mx-auto mt-20 flex w-full max-w-2xl items-center gap-2 px-4">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-muted-foreground text-sm">Memuat kuesioner…</span>
            </main>
        )
    }

    if (state.status === "unauthenticated") {
        return (
            <main className="mx-auto mt-20 w-full max-w-2xl px-4">
                <p className="text-muted-foreground text-sm">Sesi kamu sudah berakhir. Mengalihkan ke halaman masuk…</p>
            </main>
        )
    }

    if (state.status === "blocked" || state.status === "error") {
        return (
            <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-10 mt-10">
                <p role="alert" className="text-destructive text-sm">
                    {state.message}
                </p>

                <div className="flex flex-wrap gap-2">
                    {state.status === "error" && (
                        <Button type="button" variant="outline" onClick={reload}>
                            <RefreshCw />
                            Coba lagi
                        </Button>
                    )}

                    <Button type="button" variant="outline">
                        <Link href="/dashboard">Kembali ke dashboard</Link>
                    </Button>
                </div>
            </main>
        )
    }

    return <SurveyForm key={state.participation.id} participation={state.participation} onSubmitted={() => setState({ status: "done" })} />
}
