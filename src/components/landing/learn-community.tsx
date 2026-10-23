import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import { ArrowRight } from "./icons"

/**
 * The "learn from the community" band: three video cards, styled after the reference.
 *
 * Static, so it stays a server component. The thumbnails are gradients rather than photos and
 * the cards are not links — there is no video to open yet, so a click must not navigate
 * anywhere. Point each card at its video once the content exists.
 */

const VIDEOS = [
    { title: "Wawancara: Merancang kuesioner yang kuat", gradient: "from-muted via-muted/60 to-muted/30" },
    { title: "Menyiapkan riset pertamamu di Responku", gradient: "from-primary/70 via-primary/40 to-primary/20" },
    { title: "Live Q&A: Membaca hasil riset", gradient: "from-warning/70 via-primary/40 to-info/50" },
]

/** The play affordance, drawn inline to keep the page free of an icon dependency. */
function PlayIcon() {
    return (
        <svg viewBox="0 0 24 24" className="size-4 text-foreground" aria-hidden="true" fill="currentColor">
            <path d="M8 5v14l11-7z" />
        </svg>
    )
}

export default function LearnCommunity() {
    return (
        <section className="border-t">
            <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">Belajar dari komunitas peneliti</h2>

                    <Link href="/help-center" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "shrink-0 rounded-full px-5")}>
                        Lihat semua
                        <ArrowRight />
                    </Link>
                </div>

                <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {VIDEOS.map((video) => (
                        <article key={video.title} className="relative aspect-[4/3] overflow-hidden rounded-2xl ring-1 ring-foreground/10">
                            <div className={cn("absolute inset-0 bg-linear-to-br", video.gradient)} />
                            {/* keeps the white title legible over a light thumbnail */}
                            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent" />

                            <span
                                aria-hidden="true"
                                className="absolute top-4 left-4 flex size-10 items-center justify-center rounded-full bg-background/80 backdrop-blur"
                            >
                                <PlayIcon />
                            </span>

                            <h3 className="absolute inset-x-4 bottom-4 text-lg leading-snug font-semibold text-white">{video.title}</h3>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    )
}
