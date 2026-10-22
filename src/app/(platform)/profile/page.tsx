"use client"

import DataPrivacyRights from "@/components/profile/data-privacy-rights"
import DemographicProfile from "@/components/profile/demographic-profile"
import IdentityData from "@/components/profile/identity-data"
import SecurityAndPassword from "@/components/profile/security-and-password"
import { Button } from "@/components/ui/button"
import { getJson } from "@/lib/api-client"
import type { CurrentUser, UserProfile } from "@/lib/api-types"
import { Loader2, LockKeyhole, RefreshCw, ShieldCheck, UserRound, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

const menuItems = [
    { label: "Data Identitas", icon: UserRound },
    { label: "Demografi & UU", icon: Users },
    { label: "Keamanan & Sandi", icon: ShieldCheck },
    { label: "Hak Privasi Data", icon: LockKeyhole },
]

/**
 * The account is fetched once, here, and handed to whichever tab is open — so a tab
 * switch never refetches, and the forms below mount with the data they need instead
 * of having to patch it in afterwards.
 */
type AccountState =
    | { status: "loading" }
    | { status: "ready"; user: CurrentUser; profile: UserProfile | null }
    | { status: "unauthenticated" }
    | { status: "error"; message: string }

/**
 * Reads the account and answers with the state to show.
 *
 * Returning the state rather than setting it keeps this free of React, and lets the
 * effect apply the answer in a callback — which is where an effect is allowed to put
 * state.
 */
async function readAccount(): Promise<AccountState> {
    const [me, profile] = await Promise.all([
        getJson<{ user: CurrentUser }>("/api/auth/me"),
        getJson<{ profile: UserProfile | null }>("/api/user/profile"),
    ])

    // Catching an expired session here is what keeps a signed-out visitor from seeing
    // an empty profile shell.
    if (me.statusCode === 401 || profile.statusCode === 401) return { status: "unauthenticated" }
    if (!me.ok || !me.data?.user) return { status: "error", message: me.message }

    return { status: "ready", user: me.data.user, profile: profile.data?.profile ?? null }
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
    const [activeMenu, setActiveMenu] = useState("Data Identitas")
    const [state, setState] = useState<AccountState>({ status: "loading" })

    useEffect(() => {
        let cancelled = false

        void readAccount().then((next) => {
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
        void readAccount().then(setState)
    }, [])

    useEffect(() => {
        if (state.status === "unauthenticated") router.replace("/login")
    }, [state.status, router])

    const updateUser = (user: CurrentUser) => setState((current) => (current.status === "ready" ? { ...current, user } : current))
    const updateProfile = (profile: UserProfile) => setState((current) => (current.status === "ready" ? { ...current, profile } : current))

    return (
        <main className="container2nd mx-auto mt-15 grid h-[calc(100dvh-60px)] grid-rows-[auto_1fr] md:grid-cols-[240px_minmax(0,1fr)] md:grid-rows-1">
            <aside className="min-h-0 border-b py-4 md:border-r md:border-b-0 md:py-4 md:pr-4">
                <MenuList activeMenu={activeMenu} onMenuChange={setActiveMenu} />
            </aside>

            <section className="min-h-0 overflow-y-auto px-2 py-4 pb-16 md:pl-4">
                {state.status === "loading" && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Memuat data akun…
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
                        {activeMenu === "Data Identitas" && (
                            <IdentityData user={state.user} profile={state.profile} onUserUpdated={updateUser} onProfileUpdated={updateProfile} />
                        )}
                        {activeMenu === "Demografi & UU" && <DemographicProfile initialProfile={state.profile} onSaved={updateProfile} />}
                        {activeMenu === "Keamanan & Sandi" && <SecurityAndPassword />}
                        {activeMenu === "Hak Privasi Data" && <DataPrivacyRights />}
                    </>
                )}
            </section>
        </main>
    )
}
