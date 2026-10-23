import Link from "next/link"
import { type ReactNode, Suspense } from "react"
import FeedSearch from "@/components/feed/feed-search"
import AuthNav from "@/components/shared/auth-nav"
import { Separator } from "@/components/ui/separator"

/**
 * The feed shell: the same fixed header the other platform pages use, with the search box
 * added. The search reads and writes the URL, so it needs its own Suspense boundary — the
 * page below has one too, for its own `useSearchParams`.
 */
export default function Layout({ children }: { children: ReactNode }) {
    return (
        <div className="w-full overflow-hidden">
            <header className="fixed inset-x-0 top-0 z-10 h-15 border-b bg-background px-2 md:px-0">
                <nav className="container3nd mx-auto flex h-full items-center justify-between gap-3">
                    <div className="flex h-4 items-center space-x-2">
                        <Link href="/" className="whitespace-nowrap text-lg font-semibold">
                            Responku
                        </Link>
                        <Separator orientation="vertical" />
                        <span className="leading-relaxed text-muted-foreground">feed</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Suspense fallback={<div className="h-9 w-36 sm:w-64" />}>
                            <FeedSearch />
                        </Suspense>

                        <AuthNav />
                    </div>
                </nav>
            </header>

            <Suspense>{children}</Suspense>
        </div>
    )
}
