'use client'

import { createContext, type ReactNode, useContext, useRef } from 'react'
import { useStore } from 'zustand'
import { createDashboardStore, type DashboardStore, type UserMode } from './dashboard-store'

export type DashboardStoreApi = ReturnType<typeof createDashboardStore>
const DashboardStoreContext = createContext<DashboardStoreApi | undefined>(undefined)

export const DashboardStoreProvider = ({
    children,
    initialMode,
}: {
    children: ReactNode
    initialMode?: UserMode
}) => {
    const storeRef = useRef<DashboardStoreApi | null>(null)
    if (storeRef.current === null) {
        storeRef.current = createDashboardStore(initialMode ? { userMode: initialMode } : undefined)
    }

    return (
        <DashboardStoreContext.Provider value={storeRef.current}>
            {children}
        </DashboardStoreContext.Provider>
    )
}

export const useDashboardStore = <T,>(selector: (store: DashboardStore) => T): T => {
    const ctx = useContext(DashboardStoreContext)
    if (!ctx) throw new Error('useDashboardStore harus dipakai di dalam DashboardStoreProvider')

    return useStore(ctx, selector)
}
