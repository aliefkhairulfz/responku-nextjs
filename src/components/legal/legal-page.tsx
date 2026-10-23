import type { ReactNode } from "react"

/**
 * The shared shell for a legal document — a title, the date it was last updated, and the
 * sections below. Static, so it stays a server component.
 */
export function LegalPage({ title, updatedAt, children }: { title: string; updatedAt: string; children: ReactNode }) {
    return (
        <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
            <p className="font-mono text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">Legal</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-balance sm:text-4xl">{title}</h1>
            <p className="mt-3 text-sm text-muted-foreground">Terakhir diperbarui {updatedAt}</p>

            <div className="mt-10 space-y-10">{children}</div>
        </div>
    )
}

/** One numbered section of a legal document. */
export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
    return (
        <section className="space-y-3">
            <h2 className="text-lg font-semibold">{heading}</h2>
            <div className="space-y-3 leading-relaxed text-muted-foreground">{children}</div>
        </section>
    )
}

/** A bulleted list of plain points. Keyed by the point itself, which is unique within a list. */
export function LegalList({ items }: { items: string[] }) {
    return (
        <ul className="list-disc space-y-2 pl-5">
            {items.map((item) => (
                <li key={item}>{item}</li>
            ))}
        </ul>
    )
}

/** A bulleted list of `term — definition` entries, keyed by the term. */
export function LegalTerms({ items }: { items: { term: string; definition: string }[] }) {
    return (
        <ul className="list-disc space-y-2 pl-5">
            {items.map((item) => (
                <li key={item.term}>
                    <b className="text-foreground">{item.term}</b> — {item.definition}
                </li>
            ))}
        </ul>
    )
}
