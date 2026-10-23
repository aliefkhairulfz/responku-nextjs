import { LayoutDashboard } from "lucide-react"
import Link from "next/link"
import { type ReactNode, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export default function Layout({ children }: { children: ReactNode }) {
    return (
        <div className="w-full overflow-hidden">
            <header className="fixed inset-x-0 top-0 z-10 h-15 border-b bg-background px-2 md:px-0">
                <nav className="container2nd mx-auto flex h-full items-center justify-between">
                    <div className="flex h-4 items-center space-x-2">
                        <Link href="/" className="whitespace-nowrap text-lg font-bold">
                            Responku
                        </Link>
                        <Separator orientation="vertical" />
                        <span className="leading-relaxed text-muted-foreground">panel admin</span>
                    </div>

                    <Link href="/dashboard">
                        <Button variant="outline">
                            <LayoutDashboard className="size-4" />
                            <span>Dashboard</span>
                        </Button>
                    </Link>
                </nav>
            </header>

            {/* Wider than the app's own container: the queues here are dense lists, not prose. */}
            <main className="container2nd mx-auto mt-20 py-2">
                <Suspense>{children}</Suspense>
            </main>
        </div>
    )
}
