'use client'

import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { AdminPanel } from '@/components/admin/admin-panel'
import { QualityCheckDetailDialog } from '@/components/admin/quality-check-detail-dialog'
import {
    QueueEmpty,
    QueueError,
    QueueForbidden,
    QueueLoading,
} from '@/components/admin/queue-states'
import { type AdminListState, useAdminList } from '@/components/admin/use-admin-data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/toast'
import { getJson, postJson } from '@/lib/api-client'
import type { AdminParticipation } from '@/lib/api-types'
import { participationStatusLabel } from '@/lib/participation-status'
import { qualityDecisionLabel } from '@/lib/quality-check'

async function readParticipations(): Promise<AdminListState<AdminParticipation>> {
    const result = await getJson<{ participations: AdminParticipation[] }>(
        '/api/admin/participations?take=100',
    )

    if (result.statusCode === 401) return { status: 'unauthorized' }
    if (result.statusCode === 403) return { status: 'forbidden' }
    if (!result.ok || result.data === null) return { status: 'error', message: result.message }

    return { status: 'ready', items: result.data.participations }
}

/**
 * The submission review queue.
 *
 * Review first, decide after: the quality check has to be decided before the reward can be,
 * because paying a submission nobody has read is paying blind. So a card whose check is
 * still open offers to open it, and its payment buttons stay disabled until it is settled —
 * the API refuses the decision either way, this just says so before the click.
 *
 * Approving is what pays the respondent — the tokens move in the same transaction — so the
 * two buttons are the whole point of this screen.
 */
export default function AdminParticipationsPanel() {
    const { state, reload } = useAdminList(readParticipations)
    const [busyId, setBusyId] = useState<string | null>(null)
    const [reviewingId, setReviewingId] = useState<string | null>(null)

    async function decide(id: string, decision: 'APPROVED' | 'REJECTED') {
        setBusyId(id)
        const result = await postJson(`/api/participation/${id}/review`, { decision })
        setBusyId(null)

        if (!result.ok) {
            toast.add({ type: 'error', title: 'Gagal memutuskan', description: result.message })
            return
        }

        toast.add({
            type: 'success',
            title: decision === 'APPROVED' ? 'Disetujui & dibayar' : 'Ditolak',
            description:
                decision === 'APPROVED'
                    ? 'Reward responden sudah dibayarkan.'
                    : 'Reward dibatalkan.',
        })
        reload()
    }

    return (
        <AdminPanel
            title="Partisipasi"
            description="Kiriman yang menunggu keputusan. Quality check harus diputuskan dulu; menyetujui adalah yang membayar reward."
            onRefresh={reload}
        >
            {state.status === 'loading' && <QueueLoading label="Memuat partisipasi…" />}
            {state.status === 'forbidden' && <QueueForbidden />}
            {state.status === 'error' && <QueueError message={state.message} onRetry={reload} />}
            {state.status === 'ready' && state.items.length === 0 && (
                <QueueEmpty message="Tidak ada kiriman yang menunggu ditinjau." />
            )}

            {state.status === 'ready' && state.items.length > 0 && (
                <div className="space-y-3">
                    {state.items.map((participation) => {
                        const check = participation.qualityCheck
                        const checkPending = check !== null && check.decision === 'PENDING'

                        return (
                            <Card key={participation.id}>
                                <CardHeader>
                                    <CardTitle>{participation.research.title}</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        {participation.respondent.name} ·{' '}
                                        {participation.respondent.email}
                                    </p>
                                </CardHeader>

                                <CardContent>
                                    <div className="flex flex-wrap items-center gap-2 text-sm">
                                        <Badge variant="secondary">
                                            {participationStatusLabel(participation.status)}
                                        </Badge>
                                        {check !== null && (
                                            <Badge variant={checkPending ? 'outline' : 'secondary'}>
                                                Quality check:{' '}
                                                {qualityDecisionLabel(check.decision)}
                                            </Badge>
                                        )}
                                        <span className="text-muted-foreground">
                                            Reward{' '}
                                            {participation.reward?.tokenAmount ??
                                                participation.research.tokenPerRespondent}{' '}
                                            token
                                        </span>
                                        {participation.screeningScore !== null && (
                                            <span className="text-muted-foreground">
                                                Skor kriteria {participation.screeningScore}%
                                            </span>
                                        )}
                                    </div>

                                    {checkPending && (
                                        <p className="text-sm text-amber-600">
                                            Baca dan putuskan quality check-nya dulu sebelum
                                            memutuskan reward.
                                        </p>
                                    )}

                                    <div className="flex flex-wrap gap-2">
                                        {check !== null && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setReviewingId(check.id)}
                                            >
                                                {checkPending ? 'Tinjau kiriman' : 'Lihat kiriman'}
                                            </Button>
                                        )}

                                        <Button
                                            size="sm"
                                            disabled={checkPending || busyId === participation.id}
                                            onClick={() => decide(participation.id, 'APPROVED')}
                                        >
                                            {busyId === participation.id && (
                                                <Loader2 className="animate-spin" />
                                            )}
                                            Setujui & bayar
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={checkPending || busyId === participation.id}
                                            onClick={() => decide(participation.id, 'REJECTED')}
                                        >
                                            Tolak
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            <QualityCheckDetailDialog
                checkId={reviewingId}
                onOpenChange={(open) => {
                    if (!open) setReviewingId(null)
                }}
                onDecided={reload}
            />
        </AdminPanel>
    )
}
