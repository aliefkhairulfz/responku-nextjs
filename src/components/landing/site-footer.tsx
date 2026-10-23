import Link from "next/link"

/**
 * The site footer: a warm band with the wordmark and four link groups, laid out two by two
 * the way the reference does.
 *
 * Static, so it stays a server component.
 */

/**
 * Ordered so a two-column grid reads Company/Legal on the first row and Product/Resources on
 * the second, matching the reference.
 */
const FOOTER_GROUPS = [
    {
        heading: "Perusahaan",
        links: [
            { label: "Tentang", href: "#tentang" },
            { label: "Kontak", href: "/help-center" },
        ],
    },
    {
        heading: "Legal",
        links: [
            { label: "Kebijakan Privasi", href: "/privacy" },
            { label: "Syarat & Ketentuan", href: "/terms" },
        ],
    },
    {
        heading: "Produk",
        links: [
            { label: "Jelajahi Riset", href: "/feed" },
            { label: "Fitur", href: "#fitur" },
            { label: "Cara Kerja", href: "#cara-kerja" },
        ],
    },
    {
        heading: "Sumber Daya",
        links: [
            { label: "Pusat Bantuan", href: "/help-center" },
            { label: "Masuk", href: "/login" },
            { label: "Daftar", href: "/register" },
        ],
    },
]

export default function SiteFooter() {
    return (
        <footer className="bg-muted">
            <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
                <div className="flex flex-col gap-12 lg:flex-row lg:justify-between">
                    <p className="text-3xl font-bold tracking-tight sm:text-4xl">Responku</p>

                    <div className="grid grid-cols-2 gap-x-16 gap-y-10 sm:gap-x-24">
                        {FOOTER_GROUPS.map((group) => (
                            <div key={group.heading} className="space-y-3">
                                <p className="text-sm font-semibold">{group.heading}</p>

                                <ul className="space-y-2">
                                    {group.links.map((link) => (
                                        <li key={link.label}>
                                            <Link href={link.href} className="text-sm text-foreground/70 transition-colors hover:text-foreground">
                                                {link.label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="border-t border-foreground/10">
                <p className="mx-auto w-full max-w-6xl px-4 py-6 text-sm text-foreground/70 sm:px-6 lg:px-8">© 2026 Responku — Property of BukaWeb</p>
            </div>
        </footer>
    )
}
