"use client"

import { Loader2, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import ResearchDetailView from "@/components/research/research-detail"
import { Button } from "@/components/ui/button"
import { getJson } from "@/lib/api-client"
import type { AvailableResearchDetail, AvailableResearchDetailPayload, CurrentUser } from "@/lib/api-types"

/**
 * The respondent's view of one research, reached from the feed.
 *
 * Both reads go out together — the research, and the signed-in user — because the work-on
 * URL carries the respondent's own id.
 */
type DetailState =
    | { status: "loading" }
    | { status: "ready"; research: AvailableResearchDetail; respondentId: string; participation: { id: string; status: string } | null }
    | { status: "unavailable" }
    | { status: "unauthenticated" }
    | { status: "error"; message: string }

/**
 * Reads the research and the account, returning the state to show.
 *
 * Returning the state rather than setting it keeps this free of React, which is what lets
 * the effect below apply the answer in a callback.
 */
async function readDetail(researchId: string): Promise<DetailState> {
    const [detail, me] = await Promise.all([
        getJson<AvailableResearchDetailPayload>(`/api/research/available/${researchId}`),
        getJson<{ user: CurrentUser }>("/api/auth/me"),
    ])

    // An expired session is worth its own state, so the page can send the visitor to sign
    // in rather than showing a retry that cannot succeed.
    if (detail.statusCode === 401 || me.statusCode === 401) return { status: "unauthenticated" }

    // Not in the respondent's pool — closed, past its deadline, archived, their own, or
    // unknown — which is one answer the server deliberately does not break down.
    if (detail.statusCode === 404) return { status: "unavailable" }

    if (!detail.ok || !detail.data?.research) return { status: "error", message: detail.message }
    if (!me.ok || !me.data?.user) return { status: "error", message: me.message }

    return {
        status: "ready",
        research: detail.data.research,
        respondentId: me.data.user.id,
        participation: detail.data.participation,
    }
}

export default function Page() {
    const router = useRouter()
    const { researchId } = useParams<{ researchId: string }>()
    const [state, setState] = useState<DetailState>({ status: "loading" })

    useEffect(() => {
        let cancelled = false

        void readDetail(researchId).then((next) => {
            if (!cancelled) setState(next)
        })

        return () => {
            cancelled = true
        }
    }, [researchId])

    useEffect(() => {
        if (state.status === "unauthenticated") router.replace("/login")
    }, [state.status, router])

    const reload = useCallback(() => {
        setState({ status: "loading" })
        void readDetail(researchId).then(setState)
    }, [researchId])

    if (state.status === "ready") {
        return <ResearchDetailView research={state.research} respondentId={state.respondentId} participation={state.participation} />
    }

    const recoverable = state.status === "unavailable" || state.status === "error"

    return (
        <main className="mx-auto mt-20 flex w-full max-w-2xl flex-col gap-4 px-4">
            {state.status === "loading" && (
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Loader2 className="size-4 animate-spin" />
                    Memuat riset…
                </p>
            )}

            {state.status === "unauthenticated" && (
                <p className="text-muted-foreground text-sm">Sesi kamu sudah berakhir. Mengalihkan ke halaman masuk…</p>
            )}

            {state.status === "unavailable" && (
                <p className="text-muted-foreground text-sm">
                    Riset ini tidak tersedia lagi — mungkin sudah ditutup, kuotanya penuh, atau bukan untukmu.
                </p>
            )}

            {state.status === "error" && (
                <p role="alert" className="text-destructive text-sm">
                    {state.message}
                </p>
            )}

            {recoverable && (
                <div className="flex flex-wrap gap-2">
                    {state.status === "error" && (
                        <Button type="button" variant="outline" size="sm" onClick={reload}>
                            <RefreshCw />
                            Coba lagi
                        </Button>
                    )}

                    <Button type="button" variant="outline" size="sm" nativeButton={false} render={<Link href="/dashboard" />}>
                        Kembali ke dashboard
                    </Button>
                </div>
            )}
        </main>
    )
}
