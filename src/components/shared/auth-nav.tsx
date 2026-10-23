"use client"

import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import { useCurrentUser } from "@/lib/use-current-user"

/**
 * The sign-in controls for a public header.
 *
 * The session is read on the client rather than the server, so the pages that use this stay
 * static. Once the read lands, a signed-in visitor sees their own name — pointing at the
 * dashboard — instead of the "Masuk" and "Daftar" buttons.
 */
export default function AuthNav() {
    const state = useCurrentUser()

    if (state.status === "ready") {
        return (
            <Link
                href="/dashboard"
                title={state.user.name}
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "max-w-44 truncate rounded-full px-4")}
            >
                {state.user.name}
            </Link>
        )
    }

    return (
        <>
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "rounded-full px-4")}>
                Masuk
            </Link>
            <Link
                href="/register"
                className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "rounded-full border-transparent bg-foreground px-5 text-background hover:bg-foreground/90 hover:text-background",
                )}
            >
                Daftar
            </Link>
        </>
    )
}
