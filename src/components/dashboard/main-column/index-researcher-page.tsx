"use client"

import { Loader2, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import BasicStatisticsCard from "@/components/shared/basic-statistics-card"
import { FilterBadge } from "@/components/shared/filter-badge"
import MySurveysCard from "@/components/shared/my-surveys-card"
import ResearcherTips from "@/components/shared/researcher-tips"
import TokenBalanceCard from "@/components/shared/token-balance-card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { getJson } from "@/lib/api-client"
import type { ResearchSummary } from "@/lib/api-types"
import { RESEARCH_FILTER_STATUSES, researchStatusLabel, type ResearchStatus } from "@/lib/research-status"
import { useRefreshOnFocus } from "@/lib/use-refresh-on-focus"

/** Longest page the list endpoint will hand back. */
const LIST_LIMIT = 100

/**
 * The list is read in one go and filtered in the browser: switching a badge is then
 * instant, and the counts on the badges cannot disagree with the rows below them.
 */
type DashboardState =
    | { status: "loading" }
    | { status: "ready"; researches: ResearchSummary[] }
    | { status: "forbidden" }
    | { status: "unauthorized" }
    | { status: "error"; message: string }

type Filter = ResearchStatus | "ALL"

/**
 * Reads the caller's researches and answers with the state to show.
 *
 * Returning the state rather than setting it keeps this free of React, and lets the
 * effect apply the answer in a callback — which is where an effect is allowed to put
 * state.
 */
async function readDashboard(): Promise<DashboardState> {
    const researches = await getJson<{ researches: ResearchSummary[] }>(`/api/research?take=${LIST_LIMIT}`)

    if (researches.statusCode === 401) return { status: "unauthorized" }
    if (researches.statusCode === 403) return { status: "forbidden" }
    if (!researches.ok || researches.data === null) return { status: "error", message: researches.message }

    return { status: "ready", researches: researches.data.researches }
}

export default function DashboardMainColumnIndexResearcherPage() {
    const router = useRouter()
    const [filter, setFilter] = useState<Filter>("ALL")
    const [state, setState] = useState<DashboardState>({ status: "loading" })

    useEffect(() => {
        let cancelled = false

        void readDashboard().then((next) => {
            if (!cancelled) setState(next)
        })

        return () => {
            cancelled = true
        }
    }, [])

    // Putting the spinner up is only needed when retrying: the first render is already the
    // loading state.
    const reload = useCallback(() => {
        setState({ status: "loading" })
        void readDashboard().then(setState)
    }, [])

    /**
     * Re-reads without the spinner, for when the page comes back into view.
     *
     * The list changes from elsewhere — a research published or closed, a respondent
     * submitting — so a page left open would otherwise keep showing what it had when it
     * mounted. A failed background read is ignored rather than replacing a page that is
     * already showing data.
     */
    const refresh = useCallback(() => {
        void readDashboard().then((next) => {
            if (next.status === "ready" || next.status === "unauthorized") setState(next)
        })
    }, [])

    useRefreshOnFocus(refresh)

    // An expired session belongs on the sign-in screen, not in an empty list.
    useEffect(() => {
        if (state.status === "unauthorized") router.replace("/login")
    }, [state.status, router])

    const researches = state.status === "ready" ? state.researches : []
    const countOf = (status: ResearchStatus) => researches.filter((research) => research.status === status).length
    const visible = filter === "ALL" ? researches : researches.filter((research) => research.status === filter)

    // Both figures only mean something against a research that has a target, so they cover
    // the same set — otherwise the rate would be diluted by untargeted drafts.
    const targeted = researches.filter((research) => research.targetRespondentCount > 0)
    const respondents = targeted.reduce((total, research) => total + research.respondentCount, 0)
    const targets = targeted.reduce((total, research) => total + research.targetRespondentCount, 0)
    const completion = targets > 0 ? `${Math.round((respondents / targets) * 100)}%` : "—"

    return (
        <div className="space-y-6">
            {/*hello*/}
            <div className="space-y-4">
                <div>
                    <h3 className="text-xl font-semibold leading-snug">Selamat Malam Bulan</h3>
                    <p className="leading-relaxed text-muted-foreground">Pantau progres riset, kelola kuesioner, dan lihat insight dari responden.</p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
                    <TokenBalanceCard />
                    <BasicStatisticsCard title="Riset Aktif" statsNumber={countOf("PUBLISHED")} footerTextContent="sedang berjalan" />
                    <BasicStatisticsCard
                        title="Total Responden"
                        statsNumber={respondents.toLocaleString("id-ID")}
                        footerTextContent={targets > 0 ? `dari ${targets.toLocaleString("id-ID")} target` : "belum ada target"}
                    />
                    <BasicStatisticsCard title="Completion Rate" statsNumber={completion} footerTextContent="rata-rata" />
                </div>
            </div>

            <Separator />

            {/*feed*/}
            <div className="grid grid-cols-[100%_0%] lg:grid-cols-[60%_40%] gap-4">
                <div className="space-y-4">
                    <div>
                        <h3 className="text-xl font-semibold leading-snug">Riset Saya</h3>
                        <p className="leading-relaxed text-muted-foreground">{visible.length} riset ditemukan</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <FilterBadge label="Semua" count={researches.length} active={filter === "ALL"} onClick={() => setFilter("ALL")} />

                        {RESEARCH_FILTER_STATUSES.map((status) => (
                            <FilterBadge
                                key={status}
                                label={researchStatusLabel(status)}
                                count={countOf(status)}
                                active={filter === status}
                                onClick={() => setFilter(status)}
                            />
                        ))}
                    </div>

                    {state.status === "loading" && (
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" />
                            Memuat riset…
                        </p>
                    )}

                    {state.status === "forbidden" && (
                        <p className="text-sm text-muted-foreground">Akun ini belum punya akses peneliti, jadi daftar risetnya tidak bisa dibuka.</p>
                    )}

                    {state.status === "error" && (
                        <div className="space-y-3">
                            <p role="alert" className="text-sm text-destructive">
                                {state.message}
                            </p>

                            <Button variant="outline" size="sm" onClick={reload}>
                                <RefreshCw />
                                Coba lagi
                            </Button>
                        </div>
                    )}

                    {state.status === "ready" &&
                        (visible.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                {filter === "ALL"
                                    ? "Belum ada riset. Mulai dari menu Buat Riset di samping."
                                    : `Belum ada riset berstatus ${researchStatusLabel(filter)}.`}
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {visible.map((research) => (
                                    <MySurveysCard key={research.id} research={research} />
                                ))}
                            </div>
                        ))}
                </div>

                <div className="hidden lg:block sticky -top-3 self-start space-y-4">
                    {/*<SaldoDompetAnda />*/}
                    {/*<RespondentTips />*/}
                    <ResearcherTips />
                </div>
            </div>
        </div>
    )
}
