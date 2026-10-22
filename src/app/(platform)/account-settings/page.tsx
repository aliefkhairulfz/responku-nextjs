"use client"

import { Bell, Loader2, RefreshCw, Settings, ShieldCheck, Smartphone } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import ActiveSessions from "@/components/account-settings/active-sessions"
import GeneralSettings from "@/components/account-settings/general-settings"
import NotificationSettings from "@/components/account-settings/notification-settings"
import PrivacySecurity from "@/components/account-settings/privacy-security"
import { Button } from "@/components/ui/button"
import { getJson } from "@/lib/api-client"
import type { AccountSettings } from "@/lib/api-types"

const menuItems = [
    { label: "Umum", icon: Settings },
    { label: "Notifikasi", icon: Bell },
    { label: "Privasi & Keamanan", icon: ShieldCheck },
    { label: "Sesi Aktif", icon: Smartphone },
]

/**
 * The three preference tabs read one resource, so it is fetched once here and handed to
 * whichever tab is open. `Sesi Aktif` is left to fetch its own list: it is a different
 * resource, and it re-reads itself after every session is ended.
 */
type SettingsState =
    { status: "loading" } | { status: "ready"; settings: AccountSettings } | { status: "unauthenticated" } | { status: "error"; message: string }

/**
 * Reads the settings and answers with the state to show.
 *
 * Returning the state rather than setting it keeps this free of React, which is what
 * lets the effect below apply the answer in a callback.
 */
async function readSettings(): Promise<SettingsState> {
    const result = await getJson<{ settings: AccountSettings }>("/api/user/settings")

    // A dead session is worth its own state, so the page can send the visitor to sign in
    // instead of showing a retry that cannot succeed.
    if (result.statusCode === 401) return { status: "unauthenticated" }
    if (!result.ok || !result.data?.settings) return { status: "error", message: result.message }

    return { status: "ready", settings: result.data.settings }
}

function MenuList({ activeMenu, onMenuChange }: { activeMenu: string; onMenuChange: (label: string) => void }) {
    return (
        <ul className="flex flex-col gap-1">
            {menuItems.map(({ label, icon: Icon }) => (
                <li key={label}>
                    <button
                        type="button"
                        onClick={() => onMenuChange(label)}
                        className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition-colors ${
                            activeMenu === label ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                    >
                        <Icon className="size-5 shrink-0" />
                        <span>{label}</span>
                    </button>
                </li>
            ))}
        </ul>
    )
}

export default function Page() {
    const router = useRouter()
    const [activeMenu, setActiveMenu] = useState("Umum")
    const [state, setState] = useState<SettingsState>({ status: "loading" })

    useEffect(() => {
        let cancelled = false

        void readSettings().then((next) => {
            if (!cancelled) setState(next)
        })

        return () => {
            cancelled = true
        }
    }, [])

    useEffect(() => {
        if (state.status === "unauthenticated") router.replace("/login")
    }, [state.status, router])

    // The spinner is only needed for a retry: the first render is already loading.
    const reload = useCallback(() => {
        setState({ status: "loading" })
        void readSettings().then(setState)
    }, [])

    /** Folds a saved tab's answer back in, so the other tabs see it without a refetch. */
    const updateSettings = (settings: AccountSettings) => setState((current) => (current.status === "ready" ? { ...current, settings } : current))

    return (
        <main className="container2nd mx-auto mt-15 grid h-[calc(100dvh-60px)] grid-rows-[auto_1fr] md:grid-cols-[240px_minmax(0,1fr)] md:grid-rows-1">
            <aside className="min-h-0 border-b py-4 md:border-r md:border-b-0 md:py-4 md:pr-4">
                <MenuList activeMenu={activeMenu} onMenuChange={setActiveMenu} />
            </aside>

            <section className="min-h-0 overflow-y-auto px-2 py-4 pb-16 md:pl-4">
                {state.status === "loading" && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Memuat pengaturan…
                    </p>
                )}

                {state.status === "unauthenticated" && (
                    <p className="text-sm text-muted-foreground">Sesi kamu sudah berakhir. Mengalihkan ke halaman masuk…</p>
                )}

                {state.status === "error" && (
                    <div className="space-y-3">
                        <p role="alert" className="text-sm text-destructive">
                            {state.message}
                        </p>

                        <Button type="button" variant="outline" size="sm" onClick={reload}>
                            <RefreshCw />
                            Coba lagi
                        </Button>
                    </div>
                )}

                {state.status === "ready" && (
                    <>
                        {activeMenu === "Umum" && <GeneralSettings settings={state.settings} onSaved={updateSettings} />}
                        {activeMenu === "Notifikasi" && <NotificationSettings settings={state.settings} onSaved={updateSettings} />}
                        {activeMenu === "Privasi & Keamanan" && <PrivacySecurity settings={state.settings} onSaved={updateSettings} />}
                        {activeMenu === "Sesi Aktif" && <ActiveSessions />}
                    </>
                )}
            </section>
        </main>
    )
}
