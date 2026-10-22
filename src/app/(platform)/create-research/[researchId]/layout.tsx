import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { LayoutDashboard } from "lucide-react"
import Link from "next/link"
import { type ReactNode, Suspense } from "react"

export default function Layout({ children }: { children: ReactNode }) {
    return (
        <div className="w-full overflow-hidden">
            <header className="fixed inset-x-0 top-0 z-10 h-15 border-b bg-background px-2 md:px-0">
                <nav className="container2nd mx-auto flex h-full items-center justify-between">
                    <div className="flex h-4 items-center space-x-2">
                        <h3 className="whitespace-nowrap text-lg font-bold">Responku</h3>
                        <Separator orientation="vertical" />
                        <span className="leading-relaxed text-muted-foreground">buat riset</span>
                    </div>

                    <Link href="/dashboard">
                        <Button variant="outline">
                            <LayoutDashboard className="size-4" />
                            <span>Dashboard</span>
                        </Button>
                    </Link>
                </nav>
            </header>

            <Suspense>{children}</Suspense>
        </div>
    )
}
