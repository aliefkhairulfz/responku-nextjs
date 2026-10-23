import { createStore } from "zustand/vanilla"

export type UserMode = "peneliti" | "responden"
export type DashboardState = { userMode: UserMode }
export type DashboardActions = { changeMode: () => void; setMode: (mode: UserMode) => void }
export type DashboardStore = DashboardState & DashboardActions

/** Where the chosen mode is remembered between visits. */
const MODE_STORAGE_KEY = "responku:user-mode"

export const defaultInitState: DashboardState = {
    userMode: "peneliti",
}

/**
 * The last mode this browser chose, or `null` when there is none to read.
 *
 * Guarded on `window` so it stays safe to call from a module a server render may import.
 */
export function readStoredMode(): UserMode | null {
    if (typeof window === "undefined") return null

    const stored = window.localStorage.getItem(MODE_STORAGE_KEY)
    return stored === "peneliti" || stored === "responden" ? stored : null
}

function writeStoredMode(mode: UserMode) {
    if (typeof window === "undefined") return

    window.localStorage.setItem(MODE_STORAGE_KEY, mode)
}

export const createDashboardStore = (initState: DashboardState = defaultInitState) => {
    return createStore<DashboardStore>()((set) => ({
        ...initState,
        changeMode: () =>
            set((state) => {
                const mode: UserMode = state.userMode === "peneliti" ? "responden" : "peneliti"
                writeStoredMode(mode)
                return { userMode: mode }
            }),
        setMode: (mode) => {
            writeStoredMode(mode)
            set({ userMode: mode })
        },
    }))
}
