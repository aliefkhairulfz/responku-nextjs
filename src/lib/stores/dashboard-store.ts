import { createStore } from 'zustand/vanilla'

export type UserMode = 'peneliti' | 'responden'
export type DashboardState = { userMode: UserMode }
export type DashboardActions = { changeMode: () => void; setMode: (mode: UserMode) => void }
export type DashboardStore = DashboardState & DashboardActions

export const defaultInitState: DashboardState = {
    userMode: 'peneliti',
}

export const createDashboardStore = (initState: DashboardState = defaultInitState) => {
    return createStore<DashboardStore>()((set) => ({
        ...initState,
        changeMode: () =>
            set((state) => ({
                userMode: state.userMode === 'peneliti' ? 'responden' : 'peneliti',
            })),
        setMode: (mode) => set({ userMode: mode }),
    }))
}
