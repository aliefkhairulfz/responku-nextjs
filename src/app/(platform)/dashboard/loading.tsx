export default function Loading() {
    return (
        <div className="animate-pulse space-y-6">
            {/* Page Header */}
            <div className="space-y-2">
                <div className="h-7 w-48 rounded-md bg-muted" />
                <div className="h-4 w-72 max-w-full rounded-md bg-muted" />
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-3 rounded-xl border p-5">
                        <div className="h-4 w-28 rounded bg-muted" />
                        <div className="h-8 w-20 rounded bg-muted" />
                        <div className="h-3 w-36 max-w-full rounded bg-muted" />
                    </div>
                ))}
            </div>

            {/* Main Content */}
            <div className="space-y-4 rounded-xl border p-5">
                <div className="h-5 w-40 rounded bg-muted" />
                <div className="h-4 w-full rounded bg-muted" />
                <div className="h-4 w-5/6 rounded bg-muted" />
                <div className="h-4 w-2/3 rounded bg-muted" />

                <div className="space-y-3 pt-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-12 rounded-md bg-muted" />
                    ))}
                </div>
            </div>
        </div>
    );
}
