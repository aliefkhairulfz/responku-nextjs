'use client'

import { RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

/**
 * The frame every admin queue shares: a title, a one-line description, and a refresh button.
 *
 * The refresh is always there because every panel here is a work queue — an admin who has
 * just acted on one row wants to see the list without it, and a reload is the honest way to
 * get that.
 */
export function AdminPanel({
    title,
    description,
    onRefresh,
    children,
}: {
    title: string
    description: string
    onRefresh: () => void
    children: ReactNode
}) {
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="text-xl font-semibold leading-snug">{title}</h3>
                    <p className="leading-relaxed text-muted-foreground">{description}</p>
                </div>

                <Button variant="outline" size="sm" onClick={onRefresh}>
                    <RefreshCw />
                    Muat ulang
                </Button>
            </div>

            {children}
        </div>
    )
}
