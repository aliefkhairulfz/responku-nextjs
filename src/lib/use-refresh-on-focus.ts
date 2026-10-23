'use client'

import { useEffect, useRef } from 'react'

/**
 * Re-runs `refresh` when the page comes back into view.
 *
 * A screen that reads its data once on mount goes stale the moment something changes it from
 * elsewhere — an admin approving a submission credits the respondent's wallet from another
 * session, and a dashboard left open in a tab never notices. Re-reading when the tab or
 * window regains focus is what closes that gap.
 *
 * `refresh` is expected to be stable and non-destructive: it should update what it can and
 * leave the current view alone when the read fails, because a background failure is not worth
 * replacing a page that is already showing data.
 */

/** How long two focus events are treated as one, in milliseconds. */
const DEDUPE_MS = 1_000

export function useRefreshOnFocus(refresh: () => void) {
    const lastRun = useRef(0)

    useEffect(() => {
        function onFocus() {
            // A hidden tab still fires `focus` in some browsers, and returning to a tab fires
            // both events — so the state is checked, and the two are collapsed into one read.
            if (document.visibilityState !== 'visible') return

            const now = Date.now()
            if (now - lastRun.current < DEDUPE_MS) return

            lastRun.current = now
            refresh()
        }

        document.addEventListener('visibilitychange', onFocus)
        window.addEventListener('focus', onFocus)

        return () => {
            document.removeEventListener('visibilitychange', onFocus)
            window.removeEventListener('focus', onFocus)
        }
    }, [refresh])
}
