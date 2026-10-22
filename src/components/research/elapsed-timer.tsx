"use client"

import { Clock } from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/cn"

/** `mm:ss`, with minutes allowed to run past 59 — the clock only ever counts up. */
function formatElapsed(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

/**
 * How long the questionnaire has been open, counted up from when it was first opened.
 *
 * The start is the stored `startedAt`, not the moment this mounts, so a refresh carries on
 * from the same instant instead of restarting at zero. The colour only flags whether the
 * research's own estimate has been passed; the clock itself never stops.
 */
export function ElapsedTimer({ startedAt, estimatedMinutes }: { startedAt: string; estimatedMinutes: number }) {
    const startMs = new Date(startedAt).getTime()
    const [elapsedSeconds, setElapsedSeconds] = useState(() => Math.max(0, Math.floor((Date.now() - startMs) / 1000)))

    useEffect(() => {
        const tick = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)))

        tick()
        const interval = setInterval(tick, 1000)
        return () => clearInterval(interval)
    }, [startMs])

    const overEstimate = elapsedSeconds >= estimatedMinutes * 60

    return (
        <span className={cn("flex items-center gap-1.5 text-sm font-medium tabular-nums", overEstimate ? "text-neutral-800" : "text-blue-500")}>
            <Clock className="size-3.5" />
            {formatElapsed(elapsedSeconds)}
        </span>
    )
}
