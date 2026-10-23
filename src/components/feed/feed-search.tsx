"use client"

import { Search } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"

/**
 * The feed's search box, living in the feed layout's header.
 *
 * The term is kept in the URL (`?q=`) rather than in component state, so the page below can
 * read it, the back button works, and a search can be shared as a link.
 */
export default function FeedSearch() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [value, setValue] = useState(searchParams.get("q") ?? "")

    // Keep the box in step with the URL when it changes from elsewhere (e.g. the back button).
    useEffect(() => {
        setValue(searchParams.get("q") ?? "")
    }, [searchParams])

    function update(next: string) {
        setValue(next)

        const params = new URLSearchParams(searchParams.toString())
        if (next.trim() === "") params.delete("q")
        else params.set("q", next)

        const query = params.toString()
        router.replace(query === "" ? pathname : `${pathname}?${query}`, { scroll: false })
    }

    return (
        <div className="relative w-36 sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
                type="search"
                value={value}
                onChange={(event) => update(event.target.value)}
                placeholder="Cari riset…"
                aria-label="Cari riset"
                className="rounded-full pl-9"
            />
        </div>
    )
}
