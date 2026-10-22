'use client'

import { createContext, type ReactNode, useContext, useRef } from 'react'
import { useStore } from 'zustand'
import { createWorkOnTimerStore, type WorkOnTimerStore } from './work-on-timer-store'

export type WorkOnTimerStoreApi = ReturnType<typeof createWorkOnTimerStore>
const WorkOnTimerStoreContext = createContext<WorkOnTimerStoreApi | undefined>(undefined)

export const WorkOnTimerStoreProvider = ({ children }: { children: ReactNode }) => {
    const storeRef = useRef<WorkOnTimerStoreApi | null>(null)
    if (storeRef.current === null) {
        storeRef.current = createWorkOnTimerStore()
    }

    return <WorkOnTimerStoreContext.Provider value={storeRef.current}>{children}</WorkOnTimerStoreContext.Provider>
}

export const useWorkOnTimerStore = <T,>(selector: (store: WorkOnTimerStore) => T): T => {
    const ctx = useContext(WorkOnTimerStoreContext)
    if (!ctx) throw new Error('useWorkOnTimerStore harus dipakai di dalam WorkOnTimerStoreProvider')

    return useStore(ctx, selector)
}
