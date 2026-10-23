"use client"

import { useState } from "react"
import AdminOverviewPanel from "@/components/admin/overview-panel"
import AdminParticipationsPanel from "@/components/admin/participations-panel"
import AdminQualityChecksPanel from "@/components/admin/quality-checks-panel"
import AdminReportsPanel from "@/components/admin/reports-panel"
import AdminTicketsPanel from "@/components/admin/tickets-panel"
import AdminUsersPanel from "@/components/admin/users-panel"
import AdminWithdrawalsPanel from "@/components/admin/withdrawals-panel"
import { cn } from "@/lib/cn"

/**
 * The admin area, as one screen with tabs.
 *
 * A tab per queue rather than a route per queue: the panels are independent reads with no
 * shared state, so switching is instant and the whole back office stays in one place. Each
 * panel guards itself — a non-admin gets a "no access" note from whichever tab they open,
 * because the API answers 403.
 */
const TABS = [
    { value: "overview", label: "Ringkasan" },
    { value: "participations", label: "Partisipasi" },
    { value: "quality-checks", label: "Quality Check" },
    { value: "reports", label: "Laporan" },
    { value: "tickets", label: "Tiket" },
    { value: "withdrawals", label: "Penarikan" },
    { value: "users", label: "Pengguna" },
] as const

type TabValue = (typeof TABS)[number]["value"]

export default function Page() {
    const [tab, setTab] = useState<TabValue>("overview")

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Panel Admin</h2>
                <p className="text-muted-foreground">Moderasi, keuangan, dan pengguna platform.</p>
            </div>

            <div className="flex flex-wrap gap-2 border-b pb-3">
                {TABS.map((item) => (
                    <button
                        key={item.value}
                        type="button"
                        onClick={() => setTab(item.value)}
                        className={cn(
                            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                            tab === item.value ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted",
                        )}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {tab === "overview" && <AdminOverviewPanel />}
            {tab === "participations" && <AdminParticipationsPanel />}
            {tab === "quality-checks" && <AdminQualityChecksPanel />}
            {tab === "reports" && <AdminReportsPanel />}
            {tab === "tickets" && <AdminTicketsPanel />}
            {tab === "withdrawals" && <AdminWithdrawalsPanel />}
            {tab === "users" && <AdminUsersPanel />}
        </div>
    )
}
