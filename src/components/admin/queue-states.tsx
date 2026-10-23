'use client'

import { Loader2, RefreshCw, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** The four states every admin read can be in, rendered the same way everywhere. */

export function QueueLoading({ label }: { label: string }) {
    return (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {label}
        </p>
    )
}

export function QueueError({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <div className="space-y-3">
            <p role="alert" className="text-sm text-destructive">
                {message}
            </p>

            <Button variant="outline" size="sm" onClick={onRetry}>
                <RefreshCw />
                Coba lagi
            </Button>
        </div>
    )
}

export function QueueForbidden() {
    return (
        <div className="flex items-start gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <p>Akun ini tidak punya akses admin, jadi antrean ini tidak bisa dibuka.</p>
        </div>
    )
}

export function QueueEmpty({ message }: { message: string }) {
    return <p className="text-sm text-muted-foreground">{message}</p>
}
