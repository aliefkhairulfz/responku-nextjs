'use client'

import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { AdminPanel } from '@/components/admin/admin-panel'
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { getJson, postJson } from '@/lib/api-client'
import type { ContentReport } from '@/lib/api-types'
import {
    REPORT_ACTIONS,
    type ReportAction,
    reportActionLabel,
    reportStatusLabel,
} from '@/lib/report'

async function readReports(): Promise<AdminListState<ContentReport>> {
    const result = await getJson<{ reports: ContentReport[] }>('/api/report?take=100')

    if (result.statusCode === 401) return { status: 'unauthorized' }
    if (result.statusCode === 403) return { status: 'forbidden' }
    if (!result.ok || result.data === null) return { status: 'error', message: result.message }

    return { status: 'ready', items: result.data.reports }
}

/**
 * The content-report queue.
 *
 * `actionTaken` records what an admin did; it does not enforce anything — removing content
 * or suspending a research stays a separate, deliberate step. So the select is a note, and
 * the two buttons are the decision.
 */
export default function AdminReportsPanel() {
    const { state, reload } = useAdminList(readReports)
    const [busyId, setBusyId] = useState<string | null>(null)
    const [actions, setActions] = useState<Record<string, ReportAction>>({})

    async function decide(id: string, status: 'RESOLVED' | 'DISMISSED') {
        setBusyId(id)
        const result = await postJson(`/api/report/${id}/review`, {
            status,
            actionTaken: actions[id] ?? 'NONE',
        })
        setBusyId(null)

        if (!result.ok) {
            toast.add({ type: 'error', title: 'Gagal memutuskan', description: result.message })
            return
        }

        toast.add({
            type: 'success',
            title: status === 'RESOLVED' ? 'Laporan diselesaikan' : 'Laporan diabaikan',
        })
        reload()
    }

    return (
        <AdminPanel
            title="Laporan Konten"
            description="Laporan dari responden. Tindakan yang dicatat tidak otomatis menegakkan apa pun."
            onRefresh={reload}
        >
            {state.status === 'loading' && <QueueLoading label="Memuat laporan…" />}
            {state.status === 'forbidden' && <QueueForbidden />}
            {state.status === 'error' && <QueueError message={state.message} onRetry={reload} />}
            {state.status === 'ready' && state.items.length === 0 && (
                <QueueEmpty message="Tidak ada laporan yang menunggu." />
            )}

            {state.status === 'ready' && state.items.length > 0 && (
                <div className="space-y-3">
                    {state.items.map((report) => (
                        <Card key={report.id}>
                            <CardHeader>
                                <CardTitle>{report.research.title}</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Dilaporkan oleh {report.reporter.name} · peneliti{' '}
                                    {report.research.researcherName}
                                </p>
                            </CardHeader>

                            <CardContent>
                                <p className="text-sm">{report.reason}</p>

                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <Badge variant="secondary">
                                        {reportStatusLabel(report.status)}
                                    </Badge>
                                    {report.actionTaken !== null && (
                                        <Badge variant="outline">
                                            {reportActionLabel(report.actionTaken)}
                                        </Badge>
                                    )}
                                </div>

                                {report.status === 'OPEN' || report.status === 'UNDER_REVIEW' ? (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Select
                                            value={actions[report.id] ?? 'NONE'}
                                            onValueChange={(value) => {
                                                if (value !== null)
                                                    setActions((old) => ({
                                                        ...old,
                                                        [report.id]: value as ReportAction,
                                                    }))
                                            }}
                                        >
                                            <SelectTrigger size="sm" className="w-48">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {REPORT_ACTIONS.map((action) => (
                                                    <SelectItem key={action} value={action}>
                                                        {reportActionLabel(action)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <Button
                                            size="sm"
                                            disabled={busyId === report.id}
                                            onClick={() => decide(report.id, 'RESOLVED')}
                                        >
                                            {busyId === report.id && (
                                                <Loader2 className="animate-spin" />
                                            )}
                                            Selesaikan
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={busyId === report.id}
                                            onClick={() => decide(report.id, 'DISMISSED')}
                                        >
                                            Abaikan
                                        </Button>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        Sudah diputuskan.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </AdminPanel>
    )
}
