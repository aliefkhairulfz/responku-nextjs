import Link from "next/link"
import type { ReactNode } from "react"
import SiteFooter from "@/components/landing/site-footer"
import AuthNav from "@/components/shared/auth-nav"

/**
 * The shell for the legal pages.
 *
 * Public, so there is no sidebar and no auth guard — just the wordmark back to the landing
 * page, the same sign-in control the other public headers use, and the footer.
 */
export default function Layout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-dvh flex-col bg-background">
            <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
                <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4 sm:px-6 lg:px-8">
                    <Link href="/" className="text-xl font-semibold tracking-tight">
                        Responku
                    </Link>

                    <div className="ml-auto flex items-center gap-2">
                        <AuthNav />
                    </div>
                </div>
            </header>

            <main className="flex-1">{children}</main>

            <SiteFooter />
        </div>
    )
}
