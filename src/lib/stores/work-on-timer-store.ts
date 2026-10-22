import { createStore } from 'zustand/vanilla'

/**
 * The clock the work-on header shows, published by the questionnaire page.
 *
 * The header lives in the layout, above the page that actually loads the participation, so
 * the two cannot share props. The page drops the timing here once it has it, and the header
 * reads it back; `null` means "no questionnaire open", which is what every other page under
 * this layout leaves it at.
 */
export type WorkOnTimerState = {
    startedAt: string | null
    estimatedMinutes: number | null
}
export type WorkOnTimerActions = {
    setTimer: (timer: { startedAt: string; estimatedMinutes: number }) => void
    clearTimer: () => void
}
export type WorkOnTimerStore = WorkOnTimerState & WorkOnTimerActions

export const defaultInitState: WorkOnTimerState = {
    startedAt: null,
    estimatedMinutes: null,
}

export const createWorkOnTimerStore = (initState: WorkOnTimerState = defaultInitState) => {
    return createStore<WorkOnTimerStore>()((set) => ({
        ...initState,
        setTimer: ({ startedAt, estimatedMinutes }) => set({ startedAt, estimatedMinutes }),
        clearTimer: () => set({ startedAt: null, estimatedMinutes: null }),
    }))
}
