"use client"

import {
    ChevronLeft,
    ChevronRight,
    Cpu,
    GraduationCap,
    Heart,
    LayoutGrid,
    Loader2,
    RefreshCw,
    ShoppingCart,
    Wallet,
    type LucideIcon,
} from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { FeedFilterChip } from "@/components/feed/feed-filter-chip"
import BrowseSurveyCard from "@/components/shared/browse-survey-card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getJson } from "@/lib/api-client"
import type { AvailableResearchRow, CurrentUser } from "@/lib/api-types"
import { regionItems } from "@/lib/editor-engine/research-editor-schema"
import { RESEARCH_CATEGORY_ITEMS } from "@/lib/research-category"

/** Longest page the feed endpoint will hand back. */
const LIST_LIMIT = 100

/** How many cards a page shows. */
const PAGE_SIZE = 8

/** A chip icon per research category, with a generic fallback for anything unmapped. */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
    fintech: Wallet,
    retail: ShoppingCart,
    education: GraduationCap,
    health: Heart,
    technology: Cpu,
}

/** The whole feed, read in one go and filtered in the browser so badges and rows agree. */
type FeedState =
    | { status: "loading" }
    | { status: "ready"; researches: AvailableResearchRow[]; respondentId: string | null }
    | { status: "error"; message: string }

async function readFeed(): Promise<FeedState> {
    const [available, me] = await Promise.all([
        getJson<{ researches: AvailableResearchRow[] }>(`/api/research/available?take=${LIST_LIMIT}`),
        getJson<{ user: CurrentUser }>("/api/auth/me"),
    ])

    if (!available.ok || available.data === null) return { status: "error", message: available.message }

    return {
        status: "ready",
        researches: available.data.researches,
        // An account that could not be read only costs the "carry on" shortcut.
        respondentId: me.ok ? (me.data?.user.id ?? null) : null,
    }
}

export default function Page() {
    const searchParams = useSearchParams()
    const rawQuery = searchParams.get("q") ?? ""
    const query = rawQuery.trim().toLowerCase()

    const [state, setState] = useState<FeedState>({ status: "loading" })
    const [category, setCategory] = useState("ALL")
    const [region, setRegion] = useState("ALL")
    const [page, setPage] = useState(1)

    const resultsRef = useRef<HTMLDivElement>(null)

    // Any change to the filters or the search starts the list over at page one.
    // biome-ignore lint/correctness/useExhaustiveDependencies: the filters are triggers for the reset, not values the effect reads.
    useEffect(() => {
        setPage(1)
    }, [category, region, query])

    useEffect(() => {
        let cancelled = false

        void readFeed().then((next) => {
            if (!cancelled) setState(next)
        })

        return () => {
            cancelled = true
        }
    }, [])

    const reload = useCallback(() => {
        setState({ status: "loading" })
        void readFeed().then(setState)
    }, [])

    const researches = state.status === "ready" ? state.researches : []
    const respondentId = state.status === "ready" ? state.respondentId : null

    // Every category and region is always offered — even when nothing matches right now —
    // so the chips and the select never shift or shrink as the feed changes.
    const categories = RESEARCH_CATEGORY_ITEMS
    const regions = regionItems

    const visible = researches.filter((research) => {
        if (category !== "ALL" && research.category !== category) return false
        if (region !== "ALL" && research.region !== region) return false

        if (query !== "") {
            const haystack = `${research.title} ${research.researcherName} ${research.description}`.toLowerCase()
            if (!haystack.includes(query)) return false
        }

        return true
    })

    const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
    // Clamped, so a page that no longer exists after filtering falls back to the last one.
    const currentPage = Math.min(page, pageCount)
    const paged = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

    function goToPage(next: number) {
        setPage(next)
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }

    return (
        <main className="container3nd mx-auto mt-15 py-8 pb-16">
            {/* header */}
            <div className="max-w-2xl">
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-balance sm:text-4xl">Jelajahi riset yang sedang dibuka</h1>
                <p className="mt-4 leading-relaxed text-muted-foreground">
                    Temukan riset dari peneliti lain, saring sesuai domisili dan kategori, lalu mulai mengisi kuesionernya.
                </p>
            </div>

            {/* filters */}
            <div className="mt-8 flex items-start">
                <div className="flex flex-wrap items-center gap-2">
                    <FeedFilterChip
                        icon={LayoutGrid}
                        label="Semua"
                        count={researches.length}
                        active={category === "ALL"}
                        onClick={() => setCategory("ALL")}
                    />

                    {categories.map((item) => (
                        <FeedFilterChip
                            key={item.value}
                            icon={CATEGORY_ICONS[item.value] ?? LayoutGrid}
                            label={item.label}
                            count={researches.filter((research) => research.category === item.value).length}
                            active={category === item.value}
                            onClick={() => setCategory(item.value)}
                        />
                    ))}
                </div>

                <div className="ml-auto flex items-center gap-2">
                    <span className="hidden text-sm font-medium text-muted-foreground sm:inline">Domisili</span>

                    <Select value={region} onValueChange={(value) => value !== null && setRegion(value)}>
                        <SelectTrigger className="rounded-full" aria-label="Saring berdasarkan domisili">
                            <SelectValue placeholder="Semua domisili" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl w-fit bg-background">
                            <SelectItem value="ALL">Semua domisili</SelectItem>
                            {regions.map((item) => (
                                <SelectItem className="rounded-full" key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* results */}
            <div ref={resultsRef} className="mt-8 scroll-mt-20">
                {state.status === "loading" && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Memuat riset…
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

                {state.status === "ready" && (
                    <>
                        <p className="text-sm text-muted-foreground">{visible.length} riset ditemukan</p>

                        {visible.length === 0 ? (
                            <p className="mt-4 text-sm text-muted-foreground">
                                {query !== "" ? `Tidak ada riset yang cocok dengan “${rawQuery}”.` : "Belum ada riset yang cocok dengan filter ini."}
                            </p>
                        ) : (
                            <>
                                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                                    {paged.map((research) => (
                                        <div key={research.id} className="lg:first:col-span-2">
                                            <BrowseSurveyCard research={research} respondentId={respondentId} />
                                        </div>
                                    ))}
                                </div>

                                {pageCount > 1 && (
                                    <div className="mt-8 flex items-center justify-between gap-3">
                                        <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)}>
                                            <ChevronLeft />
                                            Sebelumnya
                                        </Button>

                                        <span className="text-sm text-muted-foreground">
                                            Halaman {currentPage} dari {pageCount}
                                        </span>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={currentPage >= pageCount}
                                            onClick={() => goToPage(currentPage + 1)}
                                        >
                                            Berikutnya
                                            <ChevronRight />
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </main>
    )
}
