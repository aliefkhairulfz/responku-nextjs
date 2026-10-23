"use client"

import { ChevronRight } from "lucide-react"
import { useState } from "react"
import { AdminPanel } from "@/components/admin/admin-panel"
import { QualityCheckDetailDialog } from "@/components/admin/quality-check-detail-dialog"
import { QueueEmpty, QueueError, QueueForbidden, QueueLoading } from "@/components/admin/queue-states"
import { type AdminListState, useAdminList } from "@/components/admin/use-admin-data"
import { FilterBadge } from "@/components/shared/filter-badge"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getJson } from "@/lib/api-client"
import type { QualityCheck } from "@/lib/api-types"
import { qualityDecisionLabel, qualitySignalLabel } from "@/lib/quality-check"
import { screeningResultLabel } from "@/lib/screening"

async function readQualityChecks(): Promise<AdminListState<QualityCheck>> {
    const result = await getJson<{ qualityChecks: QualityCheck[] }>("/api/quality-check?take=100")

    if (result.statusCode === 401) return { status: "unauthorized" }
    if (result.statusCode === 403) return { status: "forbidden" }
    if (!result.ok || result.data === null) return { status: "error", message: result.message }

    return { status: "ready", items: result.data.qualityChecks }
}

/** The queue is the pending ones; the rest are history, kept reachable by the last badge. */
const FILTERS = [
    { value: "PENDING", label: "Menunggu" },
    { value: "APPROVED", label: "Disetujui" },
    { value: "REJECTED", label: "Ditolak" },
    { value: "ALL", label: "Semua" },
] as const

type Filter = (typeof FILTERS)[number]["value"]

/**
 * The quality-check queue, and the only place a submission is decided.
 *
 * Every submission lands here, clean or flagged: the signals are supporting information, so
 * the queue is never filtered by them. Deciding a check decides the whole submission — it is
 * what pays the respondent — so the buttons in the detail view are the final call.
 */
export default function AdminQualityChecksPanel() {
    const { state, reload } = useAdminList(readQualityChecks)
    const [filter, setFilter] = useState<Filter>("PENDING")
    const [selectedId, setSelectedId] = useState<string | null>(null)

    const checks = state.status === "ready" ? state.items : []
    const countOf = (value: Filter) => (value === "ALL" ? checks.length : checks.filter((check) => check.decision === value).length)
    const visible = filter === "ALL" ? checks : checks.filter((check) => check.decision === filter)

    return (
        <AdminPanel
            title="Quality Check"
            description="Antrean keputusan. Klik satu kartu untuk membaca riset, durasi, dan seluruh jawaban sebelum memutuskan."
            onRefresh={reload}
        >
            {state.status === "loading" && <QueueLoading label="Memuat quality check…" />}
            {state.status === "forbidden" && <QueueForbidden />}
            {state.status === "error" && <QueueError message={state.message} onRetry={reload} />}

            {state.status === "ready" && (
                <div className="flex flex-wrap items-center gap-2">
                    {FILTERS.map((item) => (
                        <FilterBadge
                            key={item.value}
                            label={item.label}
                            count={countOf(item.value)}
                            active={filter === item.value}
                            onClick={() => setFilter(item.value)}
                        />
                    ))}
                </div>
            )}

            {state.status === "ready" && visible.length === 0 && (
                <QueueEmpty message={filter === "PENDING" ? "Tidak ada kiriman yang menunggu keputusan." : "Tidak ada kiriman pada filter ini."} />
            )}

            {state.status === "ready" && visible.length > 0 && (
                <div className="space-y-3">
                    {visible.map((check) => (
                        <button key={check.id} type="button" onClick={() => setSelectedId(check.id)} className="w-full text-left">
                            <Card className="transition-colors hover:bg-muted/40">
                                <CardHeader className="grid-cols-[1fr_auto] items-center gap-3">
                                    <div className="min-w-0">
                                        <CardTitle className="truncate">{check.participation.researchTitle}</CardTitle>
                                        <p className="truncate text-sm text-muted-foreground">{check.participation.respondentName}</p>
                                    </div>

                                    <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                                </CardHeader>

                                <CardContent>
                                    <div className="flex flex-wrap items-center gap-2 text-sm">
                                        <Badge variant="secondary">{qualityDecisionLabel(check.decision)}</Badge>
                                        {check.autoScore !== null && (
                                            <span className="text-muted-foreground">Skor otomatis {check.autoScore.toFixed(2)}</span>
                                        )}
                                        {check.signalFlags.map((flag) => (
                                            <Badge key={flag} variant="outline">
                                                {qualitySignalLabel(flag)}
                                            </Badge>
                                        ))}
                                        {check.signalFlags.length === 0 && <span className="text-muted-foreground">Tanpa sinyal</span>}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 text-sm">
                                        <span className="text-muted-foreground">Screening:</span>
                                        {check.participation.screeningResult !== null ? (
                                            <Badge variant="outline">{screeningResultLabel(check.participation.screeningResult)}</Badge>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                        {check.participation.screeningScore !== null && (
                                            <span className="text-muted-foreground">Skor kualitas {check.participation.screeningScore}%</span>
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
