"use client"

import { Loader2, Monitor, RefreshCw, Smartphone, Tablet } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/toast"
import { deleteJson, getJson } from "@/lib/api-client"
import type { ActiveSession } from "@/lib/api-types"

/* ========== Data ========== */

type SessionsState = { status: "loading" } | { status: "ready"; sessions: ActiveSession[] } | { status: "error"; message: string }

/**
 * Reads the list, returning the next state rather than setting it.
 *
 * React Compiler rejects a helper that calls `setState` when it is reached from a mount
 * effect, so the effect only applies what this returns.
 */
async function readSessions(): Promise<SessionsState> {
    const result = await getJson<{ sessions: ActiveSession[] }>("/api/user/sessions")

    if (!result.ok || !result.data) return { status: "error", message: result.message }

    return { status: "ready", sessions: result.data.sessions }
}

/** When a session started, in the reader's own locale. */
function startedAt(value: string) {
    return new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
}

/**
 * A best-effort label for a stored user agent.
 *
 * This is a hint for a person reading the list, not a fingerprint — browsers freeze and
 * rewrite these strings freely, so nothing here should decide anything.
 */
function describeDevice(userAgent: string | null) {
    const ua = userAgent ?? ""

    const tablet = /iPad|Tablet/i.test(ua)
    const phone = !tablet && /Mobile|Android|iPhone/i.test(ua)

    // Chrome and Edge both carry "Safari/", so the more specific names are checked first.
    const browser = /Edg\//.test(ua)
        ? "Edge"
        : /OPR\//.test(ua)
          ? "Opera"
          : /Chrome\//.test(ua)
            ? "Chrome"
            : /Safari\//.test(ua)
              ? "Safari"
              : /Firefox\//.test(ua)
                ? "Firefox"
                : null

    const platform = /Windows/.test(ua)
        ? "Windows"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : /Android/.test(ua)
            ? "Android"
            : /Mac OS X|Macintosh/.test(ua)
              ? "macOS"
              : /Linux/.test(ua)
                ? "Linux"
                : null

    return {
        icon: tablet ? Tablet : phone ? Smartphone : Monitor,
        label: browser === null ? "Peramban tidak dikenal" : platform === null ? browser : `${browser} di ${platform}`,
    }
}

/* ========== Halaman ========== */

export default function ActiveSessions() {
    const [state, setState] = useState<SessionsState>({ status: "loading" })
    /** The row being ended, so only its own button shows a spinner. */
    const [endingId, setEndingId] = useState<string | null>(null)
    const [endingOthers, setEndingOthers] = useState(false)

    useEffect(() => {
        let cancelled = false

        void readSessions().then((next) => {
            if (!cancelled) setState(next)
        })

        return () => {
            cancelled = true
        }
    }, [])

    // Only ever reached from an action, where updating state is allowed directly.
    function reload() {
        void readSessions().then(setState)
    }

    async function end(session: ActiveSession) {
        setEndingId(session.id)
        const result = await deleteJson(`/api/user/sessions/${session.id}`)
        setEndingId(null)

        if (!result.ok) {
            toast.add({ type: "error", title: "Gagal mengakhiri sesi", description: result.message })
            return
        }

        toast.add({ type: "success", title: "Sesi diakhiri", description: "Perangkat itu sudah keluar dari akunmu." })
        reload()
    }

    async function endOthers() {
        setEndingOthers(true)
        const result = await deleteJson<{ revoked: number }>("/api/user/sessions")
        setEndingOthers(false)

        if (!result.ok) {
            toast.add({ type: "error", title: "Gagal mengakhiri sesi lain", description: result.message })
            return
        }

        const revoked = result.data?.revoked ?? 0

        toast.add({
            type: "success",
            title: "Perangkat lain dikeluarkan",
            description: revoked === 0 ? "Tidak ada perangkat lain yang sedang masuk." : `${revoked} sesi lain sudah diakhiri.`,
        })
        reload()
    }

    const sessions = state.status === "ready" ? state.sessions : []

    return (
        <div>
            <h3 className="text-xl leading-snug font-semibold">Sesi Aktif</h3>
            <p className="leading-relaxed text-muted-foreground">Tinjau perangkat yang digunakan untuk mengakses akun Anda.</p>

            <Separator className="my-4" />

            <div className="max-w-2xl space-y-6">
                {state.status === "loading" && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Memuat daftar sesi…
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

                {state.status === "ready" && sessions.length === 0 && (
                    <p className="text-sm text-muted-foreground">Tidak ada sesi aktif yang tercatat.</p>
                )}

                {state.status === "ready" &&
                    sessions.map((session, index) => {
                        const { icon: Icon, label } = describeDevice(session.userAgent)

                        return (
                            <div key={session.id}>
                                <div className="flex items-start gap-3">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md border">
                                        <Icon className="size-5 text-muted-foreground" />
                                    </div>

                                    <div className="min-w-0 flex-1 space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-medium">{label}</p>
                                            {session.current && (
                                                <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                                                    Perangkat ini
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-sm text-muted-foreground">
                                            {session.ipAddress === null ? "IP tidak tercatat" : `IP ${session.ipAddress}`}
                                        </p>

                                        {/* Nothing records activity per request, so the only honest
                                            time to show is when the session began. */}
                                        <p className="text-sm text-muted-foreground">
                                            {session.current ? "Sedang aktif" : `Masuk ${startedAt(session.createdAt)}`}
                                        </p>
                                    </div>

                                    {!session.current && (
                                        <Button variant="outline" size="sm" disabled={endingId === session.id} onClick={() => void end(session)}>
                                            {endingId === session.id && <Loader2 className="animate-spin" />}
                                            Keluar
                                        </Button>
                                    )}
                                </div>

                                {index < sessions.length - 1 && <Separator className="mt-4" />}
                            </div>
                        )
                    })}

                {state.status === "ready" && sessions.length > 0 && (
                    <>
                        <Separator />

                        <Button variant="destructive" disabled={endingOthers} onClick={() => void endOthers()}>
                            {endingOthers && <Loader2 className="animate-spin" />}
                            Keluar dari Semua Perangkat Lain
                        </Button>
                    </>
                )}
            </div>
        </div>
    )
}
