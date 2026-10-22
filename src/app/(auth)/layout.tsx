import Link from "next/link"
import type { ReactNode } from "react"

/**
 * Shared shell for every auth screen: the brand panel on the left, and a narrow
 * centred column on the right for whichever form is rendering.
 *
 * It stays a server component — the panel is static — so each page below it only
 * has to own its form.
 */

const highlights = [
    {
        title: "Kelola riset di satu tempat",
        description: "Susun kuesioner, kriteria responden, dan target dalam satu alur.",
    },
    {
        title: "Reward yang transparan",
        description: "Setiap token tercatat di ledger, dari reserve sampai reward responden.",
    },
    {
        title: "Data responden terlindungi",
        description: "Consent eksplisit untuk data sensitif, sejalan dengan UU PDP.",
    },
]

export default function AuthLayout({ children }: { children: ReactNode }) {
    return (
        <div className="grid min-h-dvh lg:grid-cols-2">
            {/* Brand panel — hidden on narrow screens so the form gets the full width. */}
            <aside className="relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between xl:p-14">
                <Link href="/" className="relative flex w-fit items-center gap-3">
                    <span className="text-lg font-bold tracking-tight">Responku</span>
                </Link>

                <div className="relative max-w-md space-y-6">
                    <h2 className="text-3xl leading-tight font-bold text-balance xl:text-4xl">Riset yang rapi, responden yang dihargai.</h2>
                    <p className="text-primary-foreground/80">
                        Satu tempat untuk menyusun kuesioner, menjangkau responden yang tepat, dan membayar reward dengan token.
                    </p>

                    <ul className="space-y-4">
                        {highlights.map(({ title, description }) => (
                            <li key={title} className="flex gap-3">
                                <div className="space-y-0.5">
                                    <p className="font-medium">{title}</p>
                                    <p className="text-sm text-primary-foreground/75">{description}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="relative text-sm text-primary-foreground/70">© 2026 Responku — Property of BukaWeb</p>
            </aside>

            {/* Form */}
            <main className="flex items-center justify-center px-4 py-10 sm:px-8">
                <div className="w-full max-w-sm">
                    <Link href="/" className="mb-8 flex w-fit items-center gap-2 lg:hidden">
                        <span className="text-lg font-bold tracking-tight">Responku</span>
                    </Link>

                    {children}
                </div>
            </main>
        </div>
    )
}
