"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/cn"

/* ========== Model ========== */

/**
 * The question shapes the mock editor offers, each with the token reward the real
 * product attaches to one answer.
 */
const QUESTION_TYPES = [
    { id: "choice", label: "Pilihan ganda", reward: 10 },
    { id: "scale", label: "Skala 1–5", reward: 12 },
    { id: "text", label: "Jawaban singkat", reward: 8 },
] as const

type QuestionTypeId = (typeof QUESTION_TYPES)[number]["id"]

const MIN_OPTIONS = 2
const MAX_OPTIONS = 4
const MAX_ANSWER_LENGTH = 280

/** Points on the rating scale, from "tidak puas" to "sangat puas". */
const SCALE_POINTS = [1, 2, 3, 4, 5]

type PreviewOption = { id: number; text: string }

/**
 * Every option carries its own id: the text is editable, so it cannot be the key,
 * and a stable id is what the preview remembers as the chosen answer.
 */
const INITIAL_OPTIONS: PreviewOption[] = [
    { id: 1, text: "Sangat puas" },
    { id: 2, text: "Kurang puas" },
]

/* ========== Komponen ========== */

/**
 * A miniature of the research builder, for the brand side of the auth screens: the
 * editor on top, the respondent's view underneath.
 *
 * It is a real, working widget rather than a screenshot — editing a question here
 * changes the preview immediately — because the point of the panel is to show what
 * the product does before anyone has an account.
 *
 * Deliberately short: the panel it lives in shares the viewport with the form, so
 * every row it grows pushes the panel past the fold on a short window.
 */
export function ResearchStudioDemo() {
    const [typeId, setTypeId] = useState<QuestionTypeId>("choice")
    const [prompt, setPrompt] = useState("Seberapa puas kamu dengan layanan kami?")
    const [options, setOptions] = useState<PreviewOption[]>(INITIAL_OPTIONS)
    const [answer, setAnswer] = useState<number | null>(null)
    const [written, setWritten] = useState("")
    const nextOptionId = useRef(INITIAL_OPTIONS.length + 1)

    const type = QUESTION_TYPES.find((candidate) => candidate.id === typeId) ?? QUESTION_TYPES[0]

    // More options mean more work for the respondent, so the reward follows the load.
    const reward = type.reward + (typeId === "choice" ? (options.length - MIN_OPTIONS) * 2 : 0)

    function switchType(nextId: QuestionTypeId) {
        setTypeId(nextId)
        // The answer belongs to the question it was given for, so it starts over.
        setAnswer(null)
        setWritten("")
    }

    function updateOption(id: number, text: string) {
        setOptions((current) => current.map((option) => (option.id === id ? { ...option, text } : option)))
    }

    function addOption() {
        const id = nextOptionId.current
        nextOptionId.current += 1
        setOptions((current) => [...current, { id, text: "" }])
    }

    function removeOption(id: number) {
        setOptions((current) => current.filter((option) => option.id !== id))
        setAnswer((current) => (current === id ? null : current))
    }

    return (
        <div className="w-full max-w-md overflow-hidden rounded-2xl text-foreground shadow-2xl ring-1 ring-black/10">
            {/* title bar */}
            <div className="flex items-center gap-2.5 border-b bg-muted/60 px-3.5 py-2.5">
                <span aria-hidden className="flex gap-1">
                    <span className="size-2 rounded-full bg-foreground/15" />
                    <span className="size-2 rounded-full bg-foreground/15" />
                    <span className="size-2 rounded-full bg-foreground/15" />
                </span>
                <span className="text-xs font-medium text-muted-foreground">Editor riset</span>
                <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{reward} token</span>
            </div>

            {/* editor */}
            <div className="space-y-2.5 bg-background p-3.5">
                <div className="flex flex-wrap gap-1.5">
                    {QUESTION_TYPES.map((candidate) => (
                        <Button
                            key={candidate.id}
                            type="button"
                            size="xs"
                            variant={candidate.id === typeId ? "default" : "outline"}
                            aria-pressed={candidate.id === typeId}
                            onClick={() => switchType(candidate.id)}
                        >
                            {candidate.label}
                        </Button>
                    ))}
                </div>

                <Input value={prompt} onChange={(event) => setPrompt(event.target.value)} aria-label="Pertanyaan" placeholder="Tulis pertanyaanmu…" />

                {typeId === "choice" ? (
                    <div className="space-y-1">
                        {options.map((option, index) => (
                            <div key={option.id} className="flex items-center gap-1">
                                <Input
                                    value={option.text}
                                    onChange={(event) => updateOption(option.id, event.target.value)}
                                    placeholder="Teks pilihan"
                                    aria-label={`Teks pilihan ${index + 1}`}
                                    className="h-8 text-xs md:text-xs"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    aria-label={`Hapus pilihan ${index + 1}`}
                                    disabled={options.length <= MIN_OPTIONS}
                                    onClick={() => removeOption(option.id)}
                                    className="shrink-0 text-muted-foreground"
                                >
                                    ×
                                </Button>
                            </div>
                        ))}

                        <Button type="button" variant="link" size="xs" disabled={options.length >= MAX_OPTIONS} onClick={addOption} className="px-0">
                            + Tambah pilihan
                        </Button>
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground">
                        {typeId === "scale"
                            ? "Responden memilih satu angka dari 1 sampai 5."
                            : `Responden menulis jawabannya sendiri, maksimal ${MAX_ANSWER_LENGTH} karakter.`}
                    </p>
                )}
            </div>

            {/* preview */}
            <div className="space-y-2 border-t bg-muted/40 p-3.5">
                <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Pratinjau responden</p>
                    {typeId === "text" && (
                        <span className="text-xs text-muted-foreground">
                            {written.length}/{MAX_ANSWER_LENGTH}
                        </span>
                    )}
                </div>

                <p className="text-sm leading-snug font-medium">
                    {prompt.trim() || <span className="font-normal text-muted-foreground italic">Pertanyaanmu tampil di sini</span>}
                </p>

                {typeId === "choice" && (
                    <div className="space-y-1">
                        {options.map((option, index) => {
                            const selected = answer === option.id

                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() => setAnswer(option.id)}
                                    className={cn(
                                        "flex w-full items-center gap-2.5 rounded-md border bg-background px-2.5 py-1.5 text-left text-sm transition-colors",
                                        selected ? "border-primary bg-primary/5 font-medium" : "border-input hover:bg-muted",
                                    )}
                                >
                                    <span
                                        aria-hidden
                                        className={cn(
                                            "grid size-4 shrink-0 place-items-center rounded-full border",
                                            selected ? "border-primary" : "border-muted-foreground/40",
                                        )}
                                    >
                                        {selected && <span className="size-2 rounded-full bg-primary" />}
                                    </span>
                                    {option.text.trim() || <span className="font-normal text-muted-foreground italic">Pilihan {index + 1}</span>}
                                </button>
                            )
                        })}
                    </div>
                )}

                {typeId === "scale" && (
                    <div className="space-y-1">
                        <div className="flex gap-1">
                            {SCALE_POINTS.map((point) => (
                                <button
                                    key={point}
                                    type="button"
                                    aria-pressed={answer === point}
                                    onClick={() => setAnswer(point)}
                                    className={cn(
                                        "h-8 flex-1 rounded-md border text-sm font-medium transition-colors",
                                        answer === point
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : "border-input bg-background hover:bg-muted",
                                    )}
                                >
                                    {point}
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Tidak puas</span>
                            <span>Sangat puas</span>
                        </div>
                    </div>
                )}

                {typeId === "text" && (
                    <Input
                        value={written}
                        onChange={(event) => setWritten(event.target.value.slice(0, MAX_ANSWER_LENGTH))}
                        placeholder="Responden menulis jawaban di sini…"
                        aria-label="Jawaban responden"
                    />
                )}
            </div>
        </div>
    )
}
