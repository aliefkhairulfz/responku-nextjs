'use client'

import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { QueueError, QueueLoading } from '@/components/admin/queue-states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/ui/toast'
import { getJson, postJson } from '@/lib/api-client'
import type { QualityCheck } from '@/lib/api-types'
import { participationStatusLabel } from '@/lib/participation-status'
import { qualityDecisionLabel, qualitySignalLabel } from '@/lib/quality-check'
import { researchStatusLabel } from '@/lib/research-status'

type DetailState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'ready'; check: QualityCheck }
    | { status: 'error'; message: string }

type DetailQuestion = NonNullable<QualityCheck['participation']['questions']>[number]

async function readCheck(id: string): Promise<DetailState> {
    const result = await getJson<{ qualityCheck: QualityCheck }>(`/api/quality-check/${id}`)

    if (!result.ok || result.data === null) return { status: 'error', message: result.message }

    return { status: 'ready', check: result.data.qualityCheck }
}

/** A stored timestamp as a readable local date-time, or an em dash when there is none. */
function formatDateTime(value: string | null | undefined): string {
    if (value === null || value === undefined) return '—'

    return new Date(value).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

/** A duration in seconds as minutes and seconds, or an em dash when there is none. */
function formatDuration(seconds: number | null | undefined): string {
    if (seconds === null || seconds === undefined) return '—'

    const minutes = Math.floor(seconds / 60)
    const rest = seconds % 60

    return minutes > 0 ? `${minutes} mnt ${rest} dtk` : `${rest} dtk`
}

/** One choice as the respondent saw it: its code, with the text when it has one. */
function choiceLabel(choice: { n: string; choiceText: string | null }): string {
    const text = choice.choiceText?.trim()

    return text ? `${choice.n}. ${text}` : choice.n
}

/** What the respondent answered, in one line: the picked choices, or the free text. */
function formatAnswer(question: DetailQuestion): string {
    if (question.answer.selected.length > 0) {
        return question.answer.selected
            .map((id) => {
                const choice = question.choices.find((candidate) => candidate.id === id)

                return choice ? choiceLabel(choice) : id
            })
            .join(', ')
    }

    const text = question.answer.text?.trim()

    return text ? text : '—'
}

/** One labelled value in a detail grid. */
function Field({ label, value }: { label: string; value: string }) {
    return (
        <div className="space-y-0.5">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="font-medium">{value}</dd>
        </div>
    )
}

/**
 * Everything an admin needs to judge one submission, in a dialog.
 *
 * The queue only carries a summary, so this reads the detail endpoint when it opens: the
 * research as the respondent saw it, when they started and sent it in, how long that took
 * against the estimate the `SPEEDING` flag was computed from, the reward at stake, and every
 * answer. The decision lives here too, so an admin reads and decides in one place.
 */
export function QualityCheckDetailDialog({
    checkId,
    onOpenChange,
    onDecided,
}: {
    checkId: string | null
    onOpenChange: (open: boolean) => void
    onDecided: () => void
}) {
    const [state, setState] = useState<DetailState>({ status: 'idle' })
    const [busy, setBusy] = useState(false)

    const load = useCallback((id: string) => {
        setState({ status: 'loading' })
        void readCheck(id).then(setState)
    }, [])

    useEffect(() => {
        if (checkId === null) {
            setState({ status: 'idle' })
            return
        }

        let cancelled = false
        setState({ status: 'loading' })

        void readCheck(checkId).then((next) => {
            if (!cancelled) setState(next)
        })

        return () => {
            cancelled = true
        }
    }, [checkId])

    async function decide(decision: 'APPROVED' | 'REJECTED') {
        if (checkId === null) return

        setBusy(true)
        const result = await postJson(`/api/quality-check/${checkId}/review`, { decision })
        setBusy(false)

        if (!result.ok) {
            toast.add({ type: 'error', title: 'Gagal memutuskan', description: result.message })
            return
        }

        toast.add({
            type: 'success',
            title: `Quality check ${decision === 'APPROVED' ? 'disetujui' : 'ditolak'}`,
        })
        onDecided()
        onOpenChange(false)
    }

    const check = state.status === 'ready' ? state.check : null
    const participation = check?.participation
    const timing = participation?.timing

    return (
        <Dialog open={checkId !== null} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{participation?.researchTitle ?? 'Detail kiriman'}</DialogTitle>
                    <DialogDescription>
                        {participation
                            ? `${participation.respondentName}${participation.respondentEmail ? ` · ${participation.respondentEmail}` : ''}`
                            : 'Memuat detail kiriman…'}
                    </DialogDescription>
                </DialogHeader>

                {state.status === 'loading' && <QueueLoading label="Memuat detail kiriman…" />}

                {state.status === 'error' && checkId !== null && (
                    <QueueError message={state.message} onRetry={() => load(checkId)} />
                )}

                {check && participation && (
                    <div className="space-y-5">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                            <Badge variant="secondary">
                                {qualityDecisionLabel(check.decision)}
                            </Badge>
                            {check.autoScore !== null && (
                                <span className="text-muted-foreground">
                                    Skor otomatis {check.autoScore.toFixed(2)}
                                </span>
                            )}
                            {check.signalFlags.map((flag) => (
                                <Badge key={flag} variant="outline">
                                    {qualitySignalLabel(flag)}
                                </Badge>
                            ))}
                            {check.signalFlags.length === 0 && (
                                <span className="text-muted-foreground">Tanpa sinyal</span>
                            )}
                        </div>

                        <Separator />

                        {participation.research && (
                            <section className="space-y-3">
                                <h4 className="font-medium">Riset</h4>
                                <p className="text-sm text-muted-foreground">
                                    {participation.research.description}
                                </p>

                                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                    <Field
                                        label="Peneliti"
                                        value={participation.research.researcherName}
                                    />
                                    <Field
                                        label="Kategori"
                                        value={participation.research.category ?? '—'}
                                    />
                                    <Field
                                        label="Status riset"
                                        value={researchStatusLabel(participation.research.status)}
                                    />
                                    <Field
                                        label="Reward"
                                        value={`${participation.research.tokenPerRespondent} token`}
                                    />
                                    <Field
                                        label="Estimasi pengerjaan"
                                        value={`${participation.research.estimatedDurationMinutes} menit`}
                                    />
                                    <Field
                                        label="Deadline"
                                        value={formatDateTime(participation.research.deadline)}
                                    />
                                </dl>
                            </section>
                        )}

                        <Separator />

                        <section className="space-y-3">
                            <h4 className="font-medium">Kiriman</h4>

                            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                <Field
                                    label="Status"
                                    value={participationStatusLabel(participation.status)}
                                />
                                <Field
                                    label="Mulai"
                                    value={formatDateTime(participation.startedAt)}
                                />
                                <Field
                                    label="Dikirim"
                                    value={formatDateTime(participation.submittedAt)}
                                />
                                <Field
                                    label="Durasi"
                                    value={formatDuration(timing?.actualSeconds)}
                                />
                                <Field
                                    label="Estimasi"
                                    value={formatDuration(timing?.estimatedSeconds)}
                                />
                                <Field
                                    label="Skor kriteria"
                                    value={
                                        participation.screeningScore === null ||
                                        participation.screeningScore === undefined
                                            ? '—'
                                            : `${participation.screeningScore}%`
                                    }
                                />
                            </dl>

                            {timing?.tooFast === true && (
                                <p className="text-sm text-amber-600">
                                    Dikerjakan jauh lebih cepat dari estimasi — periksa jawabannya.
                                </p>
                            )}

                            {participation.reward && (
                                <p className="text-sm text-muted-foreground">
                                    Reward {participation.reward.tokenAmount} token ·{' '}
                                    {participation.reward.status}
                                </p>
                            )}
                        </section>

                        <Separator />

                        <section className="space-y-3">
                            <h4 className="font-medium">
                                Jawaban ({participation.questions?.length ?? 0} pertanyaan)
                            </h4>

                            {participation.questions?.map((question) => (
                                <div key={question.id} className="space-y-1 rounded-lg border p-3">
                                    <p className="text-sm font-medium">
                                        {question.pos + 1}. {question.question}
                                    </p>
                                    <p className="text-sm">{formatAnswer(question)}</p>
                                </div>
                            ))}

                            {(participation.questions?.length ?? 0) === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    Riset ini tidak punya pertanyaan tersimpan.
                                </p>
                            )}
                        </section>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Tutup
                    </Button>

                    {check?.decision === 'PENDING' && (
                        <>
                            <Button
                                variant="outline"
                                disabled={busy}
                                onClick={() => decide('REJECTED')}
                            >
                                Tolak
                            </Button>
                            <Button disabled={busy} onClick={() => decide('APPROVED')}>
                                {busy && <Loader2 className="animate-spin" />}
                                Setujui
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
