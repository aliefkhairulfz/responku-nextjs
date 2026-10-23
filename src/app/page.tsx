import Link from "next/link"
import type { ReactNode } from "react"
import About from "@/components/landing/about"
import BuildYourResearch from "@/components/landing/build-your-research"
import FeaturedResearch from "@/components/landing/featured-research"
import Founders from "@/components/landing/founders"
import HeroTagline from "@/components/landing/hero-tagline"
import LearnCommunity from "@/components/landing/learn-community"
import SiteFooter from "@/components/landing/site-footer"
import AuthNav from "@/components/shared/auth-nav"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/cn"

/**
 * The public landing page.
 *
 * Static on purpose — it is a server component, so nothing here ships JavaScript beyond the
 * links. The layout follows the reference: a slim top bar, a centred hero, a wide visual with
 * a floating card, a partner row, then the product's own sections.
 */

const NAV_LINKS = [
    { label: "Jelajahi", href: "/feed" },
    { label: "Fitur", href: "#fitur" },
    { label: "Cara Kerja", href: "#cara-kerja" },
    { label: "Bantuan", href: "/help-center" },
]

const FEATURES = [
    {
        title: "Susun kuesioner",
        description: "Bangun soal pilihan ganda, skala, angka, atau esai, lalu tentukan mana yang wajib diisi.",
    },
    {
        title: "Saring responden",
        description: "Tetapkan kriteria usia, gender, dan wilayah domisili agar data datang dari orang yang tepat.",
    },
    {
        title: "Reward transparan",
        description: "Token direservasi sebagai escrow dan dicairkan otomatis ke responden setelah jawaban divalidasi.",
    },
]

const STEPS = [
    { title: "Buat riset", description: "Tentukan tujuan, target responden, dan reward per responden." },
    { title: "Sebarkan", description: "Publikasikan riset; responden yang memenuhi kriteria melihatnya di dashboard." },
    { title: "Terima hasil", description: "Pantau jawaban, validasi kualitas, lalu ekspor data untuk analisis." },
]

/** Placeholder partner wordmarks — swap these for the real partners before launch. */
const PARTNERS = [
    "Universitas Nusantara",
    "Pusat Riset Pasar",
    "DataLab Indonesia",
    "Klinik Survei",
    "Asosiasi Riset Digital",
    "Yayasan Literasi Data",
]

/** A small pill, matching the badge look without pulling a client component into the page. */
function Pill({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <span
            className={cn(
                "inline-flex h-5 w-fit shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium whitespace-nowrap text-secondary-foreground",
                className,
            )}
        >
            {children}
        </span>
    )
}

export default function Page() {
    return (
        <div className="flex min-h-dvh flex-col bg-background">
            {/* top bar */}
            <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
                <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4 sm:px-6 lg:px-8">
                    <Link href="/" className="text-xl font-semibold tracking-tight">
                        Responku
                    </Link>

                    <nav className="hidden items-center gap-6 md:flex">
                        {NAV_LINKS.map((link) => (
                            <Link
                                key={link.label}
                                href={link.href}
                                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="ml-auto flex items-center gap-2">
                        <AuthNav />
                    </div>
                </div>
            </header>

            <main className="flex-1">
                {/* hero */}
                <section className="mx-auto w-full max-w-6xl px-4 pt-20 pb-12 text-center sm:px-6 sm:pt-28 lg:px-8">
                    <HeroTagline />

                    <h1 className="mx-auto mt-6 max-w-5xl text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl lg:text-5xl">
                        Menghubungkan riset dengan responden yang tepat
                    </h1>

                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">
                        Satu platform untuk menyusun kuesioner, menyaring responden lewat kriteria domisili dan usia, lalu membayar reward dengan
                        token — transparan dari awal sampai selesai.
                    </p>

                    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                        <Link href="/register" className={cn(buttonVariants({ size: "lg" }), "h-11 rounded-full px-6 text-base")}>
                            Mulai Buat Riset
                        </Link>
                        <Link href="/feed" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 rounded-full px-6 text-base")}>
                            Jelajahi Riset
                        </Link>
                    </div>

                    <p className="mt-6 text-center text-sm text-muted-foreground">Responden terverifikasi domisili &amp; usia</p>
                </section>

                {/* hero visual */}
                <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 sm:pb-24 lg:px-8">
                    <div className="relative overflow-hidden rounded-2xl ring-1 ring-foreground/10">
                        <div className="relative aspect-[16/10] w-full sm:aspect-[16/7]">
                            <svg
                                viewBox="0 0 1200 420"
                                preserveAspectRatio="xMidYMid slice"
                                className="absolute inset-0 h-full w-full"
                                aria-hidden="true"
                            >
                                <defs>
                                    <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.05" />
                                        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.22" />
                                    </linearGradient>
                                    <linearGradient id="hero-peak" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.55" />
                                        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.22" />
                                    </linearGradient>
                                </defs>

                                <rect width="1200" height="420" fill="url(#hero-sky)" />

                                {/* back range */}
                                <path
                                    d="M0 300 L180 190 L320 262 L470 150 L640 282 L820 172 L980 262 L1200 182 L1200 420 L0 420 Z"
                                    fill="var(--primary)"
                                    fillOpacity="0.16"
                                />

                                {/* main peak */}
                                <path d="M300 420 L600 118 L900 420 Z" fill="url(#hero-peak)" />
                                <path d="M600 118 L692 214 L642 206 L600 238 L558 206 L508 214 Z" fill="white" fillOpacity="0.85" />

                                {/* front range */}
                                <path
                                    d="M0 420 L220 300 L420 382 L640 292 L860 382 L1080 300 L1200 362 L1200 420 Z"
                                    fill="var(--primary)"
                                    fillOpacity="0.3"
                                />
                            </svg>

                            {/* floating card, echoing the reference's overlay */}
                            <div className="absolute right-4 bottom-4 w-60 rounded-xl bg-card p-4 shadow-lg ring-1 ring-foreground/10 sm:right-8 sm:bottom-8 sm:w-72">
                                <div className="flex items-center justify-between gap-2">
                                    <Pill>Fintech &amp; Perbankan</Pill>
                                    <span className="text-xs text-muted-foreground">2 hari lagi</span>
                                </div>
                                <p className="mt-3 text-sm leading-snug font-semibold">Survei Preferensi Dompet Digital 2026</p>
                                <p className="mt-1 text-xs text-muted-foreground">oleh Fakultas Ekonomi UI</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* partners */}
                <section className="border-t">
                    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
                        <p className="text-center font-mono text-xs font-medium tracking-[0.2em] text-muted-foreground">
                            Dipercaya oleh tim riset di
                        </p>

                        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
                            {PARTNERS.map((name) => (
                                <span key={name} className="text-lg font-semibold text-muted-foreground/60">
                                    {name}
                                </span>
                            ))}
                        </div>
                    </div>
                </section>

                {/* featured research */}
                <FeaturedResearch />

                {/* features */}
                <section id="fitur" className="scroll-mt-24 border-t">
                    <div className="mx-auto w-full max-w-6xl px-4 py-24 text-center sm:px-6 sm:py-32 sm:text-left lg:px-8">
                        <div className="max-w-2xl">
                            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Semua yang dibutuhkan untuk satu riset</h2>
                            <p className="mt-4 leading-relaxed text-muted-foreground">
                                Dari menyusun pertanyaan sampai mencairkan reward, tanpa berpindah alat.
                            </p>
                        </div>

                        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {FEATURES.map(({ title, description }) => (
                                <div key={title} className="rounded-xl bg-card p-6 shadow-xs ring-1 ring-foreground/10">
                                    <h3 className="font-semibold">{title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* how it works */}
                <section id="cara-kerja" className="scroll-mt-24 border-t">
                    <div className="mx-auto w-full max-w-6xl px-4 py-24 text-center sm:px-6 sm:py-32 sm:text-left lg:px-8">
                        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Tiga langkah, satu alur</h2>

                        <ol className="mt-10 grid gap-8 sm:grid-cols-3">
                            {STEPS.map((step, index) => (
                                <li key={step.title} className="space-y-3">
                                    <span className="mx-auto flex size-9 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background sm:mx-0">
                                        {index + 1}
                                    </span>
                                    <h3 className="font-semibold">{step.title}</h3>
                                    <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                {/* build your own */}
                <BuildYourResearch />

                {/* learn from the community */}
                <LearnCommunity />

                {/* closing call to action */}
                <section id="mulai" className="scroll-mt-24 border-t">
                    <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
                        <div className="flex flex-col items-center gap-6 rounded-2xl bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12">
                            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                                Siap memulai riset berikutnya?
                            </h2>
                            <p className="max-w-xl leading-relaxed text-primary-foreground/80">
                                Buat akun, susun kuesioner pertamamu, dan jangkau responden yang tepat hari ini.
                            </p>
                            <Link
                                href="/register"
                                className={cn(
                                    buttonVariants({ variant: "outline", size: "lg" }),
                                    "h-11 rounded-full border-transparent bg-background px-6 text-base text-foreground hover:bg-background/90 hover:text-foreground",
                                )}
                            >
                                Daftar Sekarang
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            {/* about */}
            <About />

            {/* founders */}
            <Founders />

            <SiteFooter />
        </div>
    )
}
