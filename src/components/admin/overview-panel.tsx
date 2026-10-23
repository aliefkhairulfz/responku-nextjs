"use client"

import { QueueError, QueueForbidden, QueueLoading } from "@/components/admin/queue-states"
import { type AdminResourceState, useAdminResource } from "@/components/admin/use-admin-data"
import BasicStatisticsCard from "@/components/shared/basic-statistics-card"
import { getJson } from "@/lib/api-client"
import type { AdminOverview } from "@/lib/api-types"

async function readOverview(): Promise<AdminResourceState<AdminOverview>> {
    const result = await getJson<{ overview: AdminOverview }>("/api/admin/overview")

    if (result.statusCode === 401) return { status: "unauthorized" }
    if (result.statusCode === 403) return { status: "forbidden" }
    if (!result.ok || result.data === null) return { status: "error", message: result.message }

    return { status: "ready", data: result.data.overview }
}

/**
 * The landing panel: what is waiting, as counts.
 *
 * Every figure is a queue an admin has to work through, so this reads as a to-do list rather
 * than a vanity dashboard.
 */
export default function AdminOverviewPanel() {
    const { state, reload } = useAdminResource(readOverview)

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-xl font-semibold leading-snug">Ringkasan</h3>
                <p className="leading-relaxed text-muted-foreground">Antrean yang menunggu tindakan admin.</p>
            </div>

            {state.status === "loading" && <QueueLoading label="Memuat ringkasan…" />}
            {state.status === "forbidden" && <QueueForbidden />}
            {state.status === "error" && <QueueError message={state.message} onRetry={reload} />}

            {state.status === "ready" && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-4">
                        <BasicStatisticsCard
                            title="Partisipasi"
                            statsNumber={state.data.pendingParticipations}
                            footerTextContent="menunggu ditinjau"
                        />
                        <BasicStatisticsCard
                            title="Quality Check"
                            statsNumber={state.data.pendingQualityChecks}
                            footerTextContent="menunggu diputuskan"
                        />
                        <BasicStatisticsCard title="Laporan" statsNumber={state.data.openReports} footerTextContent="belum selesai" />
                        <BasicStatisticsCard title="Tiket" statsNumber={state.data.openTickets} footerTextContent="menunggu ditinjau" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-4">
                        <BasicStatisticsCard
                            title="Penarikan"
                            statsNumber={state.data.pendingWithdrawals}
                            footerTextContent="menunggu diselesaikan"
                        />
                        <BasicStatisticsCard
                            title="Pengguna"
                            statsNumber={state.data.totalUsers.toLocaleString("id-ID")}
                            footerTextContent="akun aktif"
                        />
                        <BasicStatisticsCard title="Riset Terbit" statsNumber={state.data.publishedResearches} footerTextContent="sedang berjalan" />
                    </div>
                </div>
            )}
        </div>
    )
}
