'use client'

import { ChevronRight } from 'lucide-react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getJson } from '@/lib/api-client'
import type { QualityCheck } from '@/lib/api-types'
import { qualityDecisionLabel, qualitySignalLabel } from '@/lib/quality-check'

async function readQualityChecks(): Promise<AdminListState<QualityCheck>> {
    const result = await getJson<{ qualityChecks: QualityCheck[] }>('/api/quality-check?take=100')

    if (result.statusCode === 401) return { status: 'unauthorized' }
    if (result.statusCode === 403) return { status: 'forbidden' }
    if (!result.ok || result.data === null) return { status: 'error', message: result.message }

    return { status: 'ready', items: result.data.qualityChecks }
}

/**
 * The quality-check queue.
 *
 * Each card is one submission, and clicking it opens the whole thing — the research, the
 * timestamps, and every answer — so the decision is made after reading, not before. The
 * signals are heuristics, so a flagged row is one to read, not one to reject.
 */
export default function AdminQualityChecksPanel() {
    const { state, reload } = useAdminList(readQualityChecks)
    const [selectedId, setSelectedId] = useState<string | null>(null)

    return (
        <AdminPanel
            title="Quality Check"
            description="Sinyal otomatis pada kiriman. Klik satu kartu untuk membaca jawabannya lalu memutuskan."
            onRefresh={reload}
        >
            {state.status === 'loading' && <QueueLoading label="Memuat quality check…" />}
            {state.status === 'forbidden' && <QueueForbidden />}
            {state.status === 'error' && <QueueError message={state.message} onRetry={reload} />}
            {state.status === 'ready' && state.items.length === 0 && (
                <QueueEmpty message="Tidak ada quality check yang menunggu." />
            )}

            {state.status === 'ready' && state.items.length > 0 && (
                <div className="space-y-3">
                    {state.items.map((check) => (
                        <button
                            key={check.id}
                            type="button"
                            onClick={() => setSelectedId(check.id)}
                            className="w-full text-left"
                        >
                            <Card className="transition-colors hover:bg-muted/40">
                                <CardHeader className="grid-cols-[1fr_auto] items-center gap-3">
                                    <div className="min-w-0">
                                        <CardTitle className="truncate">
                                            {check.participation.researchTitle}
                                        </CardTitle>
                                        <p className="truncate text-sm text-muted-foreground">
                                            {check.participation.respondentName}
                                        </p>
                                    </div>

                                    <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                                </CardHeader>

                                <CardContent>
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
                                            <span className="text-muted-foreground">
                                                Tanpa sinyal
                                            </span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </button>
                    ))}
                </div>
            )}

            <QualityCheckDetailDialog
                checkId={selectedId}
                onOpenChange={(open) => {
                    if (!open) setSelectedId(null)
                }}
                onDecided={reload}
            />
        </AdminPanel>
    )
}
