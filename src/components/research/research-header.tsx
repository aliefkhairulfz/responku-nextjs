"use client"

import { LayoutDashboard } from "lucide-react"
import Link from "next/link"
import { ElapsedTimer } from "@/components/research/elapsed-timer"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useWorkOnTimerStore } from "@/lib/stores/work-on-timer-store-provider"

/**
 * The bar above every research page.
 *
 * It is a client component only so it can read the work-on clock the questionnaire page
 * publishes; the timer stays hidden on every other page under this layout.
 */
export function ResearchHeader() {
    const startedAt = useWorkOnTimerStore((store) => store.startedAt)
    const estimatedMinutes = useWorkOnTimerStore((store) => store.estimatedMinutes)

    return (
        <header className="fixed inset-x-0 top-0 z-10 h-15 border-b bg-background px-2 md:px-0">
            <nav className="container2nd mx-auto flex h-full items-center justify-between">
                <div className="flex h-4 items-center space-x-2">
                    <h3 className="whitespace-nowrap text-lg font-bold">Responku</h3>
                    <Separator orientation="vertical" />
                    <span className="leading-relaxed text-muted-foreground">kerjakan riset</span>
                </div>

                <div className="flex items-center gap-3">
                    {startedAt !== null && estimatedMinutes !== null && (
                        <ElapsedTimer startedAt={startedAt} estimatedMinutes={estimatedMinutes} />
                    )}

                    <Link href="/dashboard">
                        <Button variant="outline">
                            <LayoutDashboard className="size-4" />
                            <span>Dashboard</span>
                        </Button>
                    </Link>
                </div>
            </nav>
        </header>
    )
}
