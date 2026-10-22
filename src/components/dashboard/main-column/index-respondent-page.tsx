"use client"

import { Loader2, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import BasicStatisticsCard from "@/components/shared/basic-statistics-card"
import BrowseSurveyCard from "@/components/shared/browse-survey-card"
import { FilterBadge } from "@/components/shared/filter-badge"
import RespondentTips from "@/components/shared/respondent-tips"
import YourWalletBalanceCard from "@/components/shared/your-wallet-balance-card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { getJson } from "@/lib/api-client"
import type { AvailableResearchRow, CurrentUser } from "@/lib/api-types"
import { formatIdr } from "@/lib/currency"
import { RESEARCH_CATEGORY_ITEMS } from "@/lib/research-category"

/** Longest page the feed endpoint will hand back. */
const LIST_LIMIT = 100

/**
 * The feed is read in one go and filtered in the browser, so switching a category is
 * instant and the counts on the badges cannot disagree with the rows below them.
 */
type FeedState =
    | { status: "loading" }
    | {
          status: "ready"
          researches: AvailableResearchRow[]
          /** The caller's own id, which the "carry on" link addresses the questionnaire with. */
          respondentId: string | null
          balance: number | null
          balanceIdr: number | null
      }
    | { status: "unauthorized" }
    | { status: "error"; message: string }

/**
 * Reads what this respondent can still take, plus their wallet and their own account.
 *
 * The feed is other people's published research — never their own, and never one they have
 * already sent in; the endpoint decides that, not the browser. A research they have begun but
 * not finished stays in it, carrying its participation, so the card can offer to carry on.
 * The account is read alongside because that link needs the respondent's own id.
 *
 * Answering with the state rather than setting it keeps this free of React, and lets the
 * effect apply it in a callback — which is where an effect is allowed to put state.
 */
async function readFeed(): Promise<FeedState> {
    const [available, wallet, me] = await Promise.all([
        getJson<{ researches: AvailableResearchRow[] }>(`/api/research/available?take=${LIST_LIMIT}`),
        // The wallet needs no role of its own, so it is read alongside rather than after.
        getJson<{ wallet: { balance: number; balanceIdr: number } }>("/api/payment/wallet"),
        getJson<{ user: CurrentUser }>("/api/auth/me"),
    ])

    if (available.statusCode === 401) return { status: "unauthorized" }
    if (!available.ok || available.data === null) return { status: "error", message: available.message }

    return {
        status: "ready",
        researches: available.data.researches,
        // An account that could not be read only costs the shortcut; the card falls back to
        // the detail page.
        respondentId: me.ok ? (me.data?.user.id ?? null) : null,
        // A wallet that could not be read reads as unknown, never as zero.
        balance: wallet.ok ? (wallet.data?.wallet.balance ?? null) : null,
        balanceIdr: wallet.ok ? (wallet.data?.wallet.balanceIdr ?? null) : null,
    }
}

export default function DashboardMainColumnIndexRespondentPage() {
    const router = useRouter()
    const [filter, setFilter] = useState("ALL")
    const [state, setState] = useState<FeedState>({ status: "loading" })

    useEffect(() => {
        let cancelled = false

        void readFeed().then((next) => {
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
        void readFeed().then(setState)
    }, [])

    // An expired session belongs on the sign-in screen, not in an empty feed.
    useEffect(() => {
        if (state.status === "unauthorized") router.replace("/login")
    }, [state.status, router])

    const researches = state.status === "ready" ? state.researches : []
    const respondentId = state.status === "ready" ? state.respondentId : null
    // Only the categories actually on offer, so a badge is never empty.
    const categories = RESEARCH_CATEGORY_ITEMS.filter((item) => researches.some((research) => research.category === item.value))
    const countOf = (category: string) => researches.filter((research) => research.category === category).length
    const visible = filter === "ALL" ? researches : researches.filter((research) => research.category === filter)

    const highestReward = researches.reduce((best, research) => Math.max(best, research.rewardIdr), 0)
    const averageMinutes =
        researches.length === 0
            ? 0
            : Math.round(researches.reduce((total, research) => total + research.estimatedDurationMinutes, 0) / researches.length)

    return (
        <div className="space-y-6">
            {/*hello*/}
            <div className="space-y-4">
                <div>
                    <h3 className="text-xl font-semibold leading-snug">Selamat Malam Bulan</h3>
                    <p className="leading-relaxed text-muted-foreground">Yuk lihat survei yang bisa kamu kerjakan hari ini dan dapatkan reward!</p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
                    <BasicStatisticsCard title="Survei Tersedia" statsNumber={researches.length} footerTextContent="sedang dibuka" />
                    <BasicStatisticsCard
                        title="Reward Tertinggi"
                        statsNumber={researches.length === 0 ? "—" : formatIdr(highestReward)}
                        footerTextContent="per responden"
                    />
                    <BasicStatisticsCard
                        title="Rata-rata Durasi"
                        statsNumber={researches.length === 0 ? "—" : `${averageMinutes} menit`}
                        footerTextContent="per pengisian"
                    />
                    <BasicStatisticsCard
                        title="Saldo Token"
                        statsNumber={state.status === "ready" && state.balance !== null ? state.balance.toLocaleString("id-ID") : "—"}
                        footerTextContent="token tersedia"
                    />
                </div>
            </div>

            <Separator />

            {/*feed*/}
            <div className="grid grid-cols-[100%_0%] lg:grid-cols-[60%_40%] gap-4">
                <div className="space-y-4">
                    <div>
                        <h3 className="text-xl font-semibold leading-snug">Survei Tersedia</h3>
                        <p className="leading-relaxed text-muted-foreground">{visible.length} survei dari peneliti lain sedang dibuka</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <FilterBadge label="Semua" count={researches.length} active={filter === "ALL"} onClick={() => setFilter("ALL")} />

                        {categories.map((category) => (
                            <FilterBadge
                                key={category.value}
                                label={category.label}
                                count={countOf(category.value)}
                                active={filter === category.value}
                                onClick={() => setFilter(category.value)}
                            />
                        ))}
                    </div>

                    {state.status === "loading" && (
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" />
                            Memuat survei…
                        </p>
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
                                    ? "Belum ada survei yang bisa kamu kerjakan. Coba lagi nanti."
                                    : `Belum ada survei kategori ${RESEARCH_CATEGORY_ITEMS.find((item) => item.value === filter)?.label ?? filter}.`}
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {visible.map((research) => (
                                    <BrowseSurveyCard key={research.id} research={research} respondentId={respondentId} />
                                ))}
                            </div>
                        ))}
                </div>

                <div className="hidden lg:block sticky -top-3 self-start space-y-4">
                    <YourWalletBalanceCard
                        balance={state.status === "ready" ? state.balance : null}
                        balanceIdr={state.status === "ready" ? state.balanceIdr : null}
                    />

                    <RespondentTips />
                </div>
            </div>
        </div>
    )
}
