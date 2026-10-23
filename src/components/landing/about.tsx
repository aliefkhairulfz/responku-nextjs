import { cn } from "@/lib/cn"

/**
 * The "about" band: a short statement of what Responku is, over three pillars.
 *
 * Static, so it stays a server component. The pillar glyphs are drawn inline to keep the
 * page free of an icon dependency.
 */

/** A small flow diagram — the transparent-methodology mark. */
function FlowIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            className="size-7"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect x="9" y="3" width="6" height="6" rx="1" />
            <path d="M12 9v3M6 12h12M6 12v3M18 12v3" />
            <rect x="3" y="15" width="6" height="6" rx="1" />
            <rect x="15" y="15" width="6" height="6" rx="1" />
        </svg>
    )
}

/** Two people — the community-validation mark. */
function PeopleIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            className="size-7"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="9" cy="8" r="3.2" />
            <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
            <circle cx="17" cy="9.5" r="2.6" />
            <path d="M14.5 19.5a5 5 0 0 1 6-4.6" />
        </svg>
    )
}

/** Angle brackets — the trusted-by mark, matching the reference. */
function BracketsIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            className="size-7"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M9 7l-5 5 5 5M15 7l5 5-5 5" />
        </svg>
    )
}

const PILLARS = [
    { icon: <FlowIcon />, title: "Metodologi yang transparan" },
    { icon: <PeopleIcon />, title: "Kualitas jawaban tervalidasi" },
    { icon: <BracketsIcon />, title: "Dipercaya peneliti & lembaga riset" },
]

export default function About() {
    return (
        <section id="tentang" className="scroll-mt-24 border-t">
            <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
                <p className="font-mono text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">Tentang Responku</p>

                <p className="mt-6 max-w-4xl text-xl leading-relaxed font-medium text-balance sm:text-2xl">
                    Responku adalah platform riset dan survei yang menghubungkan peneliti dengan responden terverifikasi. Peneliti menyusun kuesioner,
                    menyaring responden lewat kriteria domisili dan usia, lalu membayar reward dengan token — transparan dan dapat diaudit. Kami
                    bekerja bersama kampus, lembaga riset, dan perusahaan untuk mengubah pertanyaan menjadi data yang bisa diandalkan.
                </p>

                <div className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-0">
                    {PILLARS.map((pillar, index) => (
                        <div key={pillar.title} className={cn("space-y-5 sm:px-8", index === 0 && "sm:pl-0", index > 0 && "sm:border-l")}>
                            {pillar.icon}
                            <h3 className="max-w-[16rem] text-xl leading-snug font-medium">{pillar.title}</h3>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
