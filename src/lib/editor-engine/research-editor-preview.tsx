"use client"

import * as Card from "@/components/ui/card"
import { categoryItems, genderItems, questionTypeItems, regionItems, timeLimitOptions, type UseResearchEditorForm } from "./research-editor-schema"

type ResearchEditorPreviewProps = {
    researchEditorForm: UseResearchEditorForm
}

type Option = { value: string | null; label: string }

function getLabel(items: Option[], value: string) {
    return items.find((item) => item.value === value)?.label ?? value
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">{label}</span>
            <div className="wrap-break-word text-sm font-medium">{value || "—"}</div>
        </div>
    )
}

export default function ResearchEditorPreview({ researchEditorForm: { form } }: ResearchEditorPreviewProps) {
    return (
        <form.Subscribe selector={(s) => s.values}>
            {({ allocationToken, identity, criteria, questions }) => {
                const totalToken = allocationToken.targetResponden * allocationToken.tokenPerResponden

                return (
                    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 mb-10">
                        {/* HEADER */}
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold tracking-tight">Pratinjau Kuesioner</h2>
                            <p className="text-sm text-muted-foreground">Perubahan pada editor akan ditampilkan di sini secara langsung.</p>
                        </div>

                        {/* TOKEN SUMMARY */}
                        <Card.Card className="gap-0 overflow-hidden border-primary/20 py-0">
                            <div className="flex items-center justify-between gap-4 bg-primary/4 p-4">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">Total kebutuhan token</p>
                                    <p className="text-xs text-muted-foreground">
                                        {Number.isFinite(totalToken) ? `${totalToken.toLocaleString("id-ID")} token` : "—"}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold tabular-nums">
                                        {Number.isFinite(totalToken) ? totalToken.toLocaleString("id-ID") : "—"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Token</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 divide-x border-t">
                                <div className="p-4">
                                    <p className="text-xs text-muted-foreground">Target responden</p>
                                    <p className="mt-1 font-semibold tabular-nums">{allocationToken.targetResponden.toLocaleString("id-ID")}</p>
                                </div>
                                <div className="p-4">
                                    <p className="text-xs text-muted-foreground">Token per responden</p>
                                    <p className="mt-1 font-semibold tabular-nums">{allocationToken.tokenPerResponden.toLocaleString("id-ID")}</p>
                                </div>
                            </div>
                        </Card.Card>

                        {/* IDENTITY */}
                        <Card.Card className="gap-5 p-5">
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold leading-snug tracking-tight">{identity.title || "Judul kuesioner Anda"}</h3>
                                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                                    {identity.description || "Deskripsi dan pengantar riset akan ditampilkan di sini."}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium">
                                    {getLabel(categoryItems, identity.category)}
                                </span>
                                <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium">{identity.estimatedMinutes} menit</span>
                                <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium">
                                    {getLabel(timeLimitOptions, allocationToken.batasWaktu)}
                                </span>
                            </div>
                        </Card.Card>

                        {/* RESPONDENT CRITERIA */}
                        <Card.Card className="gap-5 p-5">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                                <InfoItem label="Rentang usia" value={`${criteria.ageMin}–${criteria.ageMax} tahun`} />
                                <InfoItem label="Jenis kelamin" value={getLabel(genderItems, criteria.gender)} />
                                <div className="col-span-2">
                                    <InfoItem label="Wilayah domisili" value={getLabel(regionItems, criteria.region)} />
                                </div>
                            </div>
                        </Card.Card>

                        {/* QUESTIONS */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-medium">{questions.length} pertanyaan</span>
                            </div>

                            {questions.map((question, idx) => {
                                const isEssay = question.questionType === "TEXT"
                                const isScale = question.questionType === "SCALE"

                                return (
                                    <Card.Card key={question.id} className="gap-4 p-4 sm:p-5">
                                        <div className="flex items-start gap-3">
                                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border text-sm font-semibold tabular-nums">
                                                {idx + 1}
                                            </span>

                                            <div className="min-w-0 flex-1 space-y-2">
                                                <p className="whitespace-pre-wrap wrap-break-word text-sm font-semibold leading-relaxed">
                                                    {question.question || "Pertanyaan belum diisi"}
                                                    {question.mustFill && <span className="ml-1 text-destructive">*</span>}
                                                </p>

                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                                                        {getLabel(questionTypeItems, question.questionType)}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {question.mustFill ? "Wajib dijawab" : "Opsional"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {isEssay ? (
                                            <div className="min-h-24 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                                                Jawaban responden akan dituliskan di sini...
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {question.choices.map((choice, choiceIdx) => (
                                                    <div key={choice.id} className="flex items-start gap-3 rounded-lg border p-3 transition-colors">
                                                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full border text-xs text-muted-foreground">
                                                            {isScale ? choiceIdx + 1 : String.fromCharCode(97 + choiceIdx).toUpperCase()}
                                                        </span>
                                                        <span className="min-w-0 wrap-break-word text-sm leading-relaxed">
                                                            {choice.choiceText || `Pilihan ${choiceIdx + 1}`}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </Card.Card>
                                )
                            })}
                        </div>
                    </div>
                )
            }}
        </form.Subscribe>
    )
}
