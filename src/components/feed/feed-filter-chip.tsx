"use client"

import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/cn"

/**
 * One filter pill for the feed: an icon, a label and a count, in a rounded chip.
 *
 * The count is passed in rather than derived here, so a chip and the rows under it can never
 * disagree. The active chip is filled with the muted tone, the way the reference marks the
 * selected filter.
 */
export function FeedFilterChip({
    icon: Icon,
    label,
    count,
    active,
    onClick,
}: {
    icon: LucideIcon
    label: string
    count: number
    active: boolean
    onClick: () => void
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                active ? "border-transparent bg-muted" : "border-border bg-background hover:bg-muted",
            )}
        >
            <Icon className="size-4" />
            {label}
            <span className="text-muted-foreground tabular-nums">{count.toLocaleString("id-ID")}</span>
        </button>
    )
}
