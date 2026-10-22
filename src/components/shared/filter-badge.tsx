"use client"

import { Badge } from "@/components/ui/badge"

/**
 * A filter chip that shows how many rows it would leave.
 *
 * The count is passed in rather than derived here, so a badge and the rows under it can
 * never disagree: both come from the same list.
 */
export function FilterBadge({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
    return (
        <Badge variant={active ? "default" : "outline"} className="px-4! py-3!" render={<button type="button" onClick={onClick} />}>
            {label} ({count})
        </Badge>
    )
}
