/**
 * Stable keys for the placeholder rows.
 *
 * The tab placeholders mirror the real tabs, so the skeleton and the loaded screen line up;
 * an index key would be flagged by the linter and is unstable besides.
 */
const TAB_PLACEHOLDERS = [
    'overview',
    'participations',
    'quality-checks',
    'reports',
    'tickets',
    'withdrawals',
    'users',
]
const CARD_PLACEHOLDERS = ['partisipasi', 'quality', 'laporan', 'tiket']

export default function Loading() {
    return (
        <div className="animate-pulse space-y-6">
            <div className="space-y-2">
                <div className="h-8 w-48 rounded-md bg-muted" />
                <div className="h-4 w-72 max-w-full rounded-md bg-muted" />
            </div>

            <div className="flex flex-wrap gap-2 border-b pb-3">
                {TAB_PLACEHOLDERS.map((tab) => (
                    <div key={tab} className="h-8 w-24 rounded-md bg-muted" />
                ))}
            </div>

            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-4">
                {CARD_PLACEHOLDERS.map((card) => (
                    <div key={card} className="space-y-3 rounded-xl border p-5">
                        <div className="h-4 w-24 rounded bg-muted" />
                        <div className="h-7 w-16 rounded bg-muted" />
                        <div className="h-3 w-32 max-w-full rounded bg-muted" />
                    </div>
                ))}
            </div>
        </div>
    )
}
