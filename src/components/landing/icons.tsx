/**
 * The two inline glyphs the landing page needs.
 *
 * Drawn by hand rather than pulled from an icon package, so the page carries no icon
 * dependency. Shared between the landing sections that use them.
 */

export function ArrowRight() {
    return (
        <svg
            viewBox="0 0 16 16"
            className="size-4"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M3 8h10M9 4l4 4-4 4" />
        </svg>
    )
}

export function CaretUp() {
    return (
        <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true" fill="currentColor">
            <path d="M6 3l4 5H2z" />
        </svg>
    )
}
