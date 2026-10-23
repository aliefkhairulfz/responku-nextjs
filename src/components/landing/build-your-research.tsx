import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import { ArrowRight } from "./icons"

/**
 * The "build your own" band: a centred pitch over a fanned stack of cards, echoing the
 * reference's asset-count visual. Static, so it stays a server component.
 */

/** Placeholder platform figures — replace with real numbers before launch. */
const CARDS = ["12K+ Responden", "3.4K Riset", "1.2M Jawaban", "98% Domisili terverifikasi"]

export default function BuildYourResearch() {
    return (
        <section className="border-t">
            <div className="mx-auto w-full max-w-6xl px-4 pt-24 sm:px-6 sm:pt-32 lg:px-8">
                <div className="mx-auto max-w-3xl text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
                        Semua yang kamu butuhkan untuk menjalankan riset sendiri
                    </h2>
                    <p className="mx-auto mt-5 max-w-2xl leading-relaxed text-pretty text-muted-foreground">
                        Ubah kriteria responden menjadi riset dengan kuesioner kustom, penyaringan otomatis, dan reward yang transparan.
                    </p>

                    <div className="mt-8 flex justify-center">
                        <Link href="/register" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 rounded-full px-6 text-base")}>
                            Buat riset
                            <ArrowRight />
                        </Link>
                    </div>
                </div>

                {/* fanned cards, clipped at the bottom the way the reference is */}
                <div className="relative mx-auto mt-16 h-[320px] w-full max-w-3xl overflow-hidden sm:h-[380px]">
                    {CARDS.map((label, index) => (
                        <div
                            key={label}
                            className="absolute w-[44%] rounded-2xl border-2 border-foreground/70 bg-card"
                            style={{
                                left: `${index * 17}%`,
                                top: `${(CARDS.length - 1 - index) * 36}px`,
                                height: "300px",
                                transform: "rotate(-12deg)",
                                zIndex: index + 1,
                            }}
                        >
                            <span className="absolute top-5 left-6 text-sm font-medium">{label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
