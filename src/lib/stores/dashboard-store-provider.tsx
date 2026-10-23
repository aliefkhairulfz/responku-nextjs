"use client"

import { createContext, type ReactNode, useContext, useEffect, useRef } from "react"
import { useStore } from "zustand"
import { createDashboardStore, readStoredMode, type DashboardStore, type UserMode } from "./dashboard-store"

export type DashboardStoreApi = ReturnType<typeof createDashboardStore>
const DashboardStoreContext = createContext<DashboardStoreApi | undefined>(undefined)

export const DashboardStoreProvider = ({ children, initialMode }: { children: ReactNode; initialMode?: UserMode }) => {
    const storeRef = useRef<DashboardStoreApi | null>(null)
    if (storeRef.current === null) {
        storeRef.current = createDashboardStore(initialMode ? { userMode: initialMode } : undefined)
    }

    // Restore the last mode after mount. Done here rather than in the initial state because a
    // server render cannot read `localStorage`: starting from the default and correcting it in
    // an effect keeps the server markup in step with the first client render. An explicit
    // `initialMode` is treated as the caller's decision and is not overridden.
    useEffect(() => {
        if (initialMode !== undefined) return

        const stored = readStoredMode()
        if (stored !== null) storeRef.current?.getState().setMode(stored)
    }, [initialMode])

    return <DashboardStoreContext.Provider value={storeRef.current}>{children}</DashboardStoreContext.Provider>
}

export const useDashboardStore = <T,>(selector: (store: DashboardStore) => T): T => {
    const ctx = useContext(DashboardStoreContext)
    if (!ctx) throw new Error("useDashboardStore harus dipakai di dalam DashboardStoreProvider")

    return useStore(ctx, selector)
}
