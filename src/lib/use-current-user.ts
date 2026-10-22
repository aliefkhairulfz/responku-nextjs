"use client"

/**
 * Reads the signed-in user on the client.
 *
 * The shell needs identity for its avatars and nothing else — the demographic
 * profile lives on its own endpoint — so this asks only `/api/auth/me`. Kept as a
 * hook rather than a fetch per avatar, so the two avatars in the shell (and any
 * avatar added later) share one request and one answer.
 */

import { useEffect, useState } from "react"
import { getJson } from "@/lib/api-client"
import type { CurrentUser } from "@/lib/api-types"

/** Where the read got to. `error` covers "no session" as well as a dead request. */
export type CurrentUserState = { status: "loading" } | { status: "ready"; user: CurrentUser } | { status: "error" }

/**
 * The read itself, as a module-level function that *returns* the next state.
 *
 * React Compiler rejects a helper that calls `setState` when it is reached from a
 * mount effect, so the effect below only applies what this returns.
 */
async function readCurrentUser(): Promise<CurrentUserState> {
    const result = await getJson<{ user: CurrentUser }>("/api/auth/me")

    // A 401 is an ordinary answer here — the shell still renders, it just has no
    // name or photo to show.
    if (!result.ok || !result.data?.user) return { status: "error" }

    return { status: "ready", user: result.data.user }
}

export function useCurrentUser(): CurrentUserState {
    const [state, setState] = useState<CurrentUserState>({ status: "loading" })

    useEffect(() => {
        let cancelled = false

        void readCurrentUser().then((next) => {
            if (!cancelled) setState(next)
        })

        return () => {
            cancelled = true
        }
    }, [])

    return state
}
