"use client"

import { AdminPanel } from "@/components/admin/admin-panel"
import { QueueEmpty, QueueError, QueueForbidden, QueueLoading } from "@/components/admin/queue-states"
import { type AdminListState, useAdminList } from "@/components/admin/use-admin-data"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getJson } from "@/lib/api-client"
import type { AdminParticipation } from "@/lib/api-types"
import { participationStatusLabel } from "@/lib/participation-status"
import { qualityDecisionLabel } from "@/lib/quality-check"
import { rewardStatusLabel } from "@/lib/reward-status"

async function readParticipations(): Promise<AdminListState<AdminParticipation>> {
    const result = await getJson<{ participations: AdminParticipation[] }>("/api/admin/participations?take=100")

    if (result.statusCode === 401) return { status: "unauthorized" }
    if (result.statusCode === 403) return { status: "forbidden" }
    if (!result.ok || result.data === null) return { status: "error", message: result.message }

    return { status: "ready", items: result.data.participations }
}

/**
 * Every participation, as a monitoring list.
 *
 * Read-only on purpose: the decision that pays a respondent lives on the quality check, so
 * this screen is where an admin watches the whole picture — who took what, and what each
 * reward ended up as — rather than where anything is decided.
 */
export default function AdminParticipationsPanel() {
    const { state, reload } = useAdminList(readParticipations)

    return (
        <AdminPanel
            title="Partisipasi"
            description="Seluruh partisipasi dan status reward-nya. Keputusan ada di tab Quality Check."
            onRefresh={reload}
        >
            {state.status === "loading" && <QueueLoading label="Memuat partisipasi…" />}
            {state.status === "forbidden" && <QueueForbidden />}
            {state.status === "error" && <QueueError message={state.message} onRetry={reload} />}
            {state.status === "ready" && state.items.length === 0 && <QueueEmpty message="Belum ada partisipasi." />}

            {state.status === "ready" && state.items.length > 0 && (
                <div className="space-y-3">
                    {state.items.map((participation) => (
                        <Card key={participation.id}>
                            <CardHeader>
                                <CardTitle>{participation.research.title}</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    {participation.respondent.name} · {participation.respondent.email}
                                </p>
                            </CardHeader>

                            <CardContent>
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <Badge variant="secondary">{participationStatusLabel(participation.status)}</Badge>

                                    {participation.qualityCheck !== null && (
                                        <Badge variant="outline">Quality check: {qualityDecisionLabel(participation.qualityCheck.decision)}</Badge>
                                    )}

                                    {participation.reward !== null && (
                                        <Badge variant={participation.reward.status === "PAID" ? "secondary" : "outline"}>
                                            Reward: {rewardStatusLabel(participation.reward.status)} · {participation.reward.tokenAmount} token
                                        </Badge>
                                    )}

                                    {participation.screeningScore !== null && (
                                        <span className="text-muted-foreground">Skor kualitas {participation.screeningScore}%</span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </AdminPanel>
    )
}
