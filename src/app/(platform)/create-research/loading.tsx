export default function Loading() {
    return (
        <div className="h-dvh w-full animate-pulse overflow-hidden">
            {/* Header */}
            <header className="fixed inset-x-0 top-0 z-10 h-15 border-b bg-background px-2 md:px-0">
                <nav className="container2nd mx-auto flex h-full items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-6 w-24 rounded bg-muted" />
                        <div className="h-6 w-px bg-muted" />
                        <div className="h-4 w-28 rounded bg-muted" />
                    </div>

                    <div className="h-9 w-28 rounded-md bg-muted" />
                </nav>
            </header>

            {/* Main Layout */}
            <main className="container2nd mx-auto mt-15 grid h-[calc(100dvh-60px)] grid-rows-[auto_1fr] md:grid-cols-[240px_minmax(0,1fr)] md:grid-rows-1">
                {/* Sidebar */}
                <aside className="flex flex-col gap-2 border-b py-4 md:border-b-0 md:border-r md:pr-4">
                    <div className="h-10 rounded-md bg-muted" />
                    <div className="h-10 rounded-md bg-muted" />
                    <div className="h-10 rounded-md bg-muted" />
                </aside>

                {/* Content */}
                <section className="space-y-6 overflow-hidden p-4">
                    <div className="h-7 w-48 rounded bg-muted" />
                    <div className="h-4 w-72 max-w-full rounded bg-muted" />

                    <div className="space-y-4 rounded-xl border p-5">
                        <div className="h-5 w-40 rounded bg-muted" />
                        <div className="h-10 w-full rounded-md bg-muted" />
                        <div className="h-24 w-full rounded-md bg-muted" />
                        <div className="h-10 w-full rounded-md bg-muted" />
                    </div>

                    <div className="space-y-4 rounded-xl border p-5">
                        <div className="h-5 w-36 rounded bg-muted" />
                        <div className="h-10 w-full rounded-md bg-muted" />
                        <div className="h-10 w-full rounded-md bg-muted" />
                    </div>
                </section>
            </main>
        </div>
    );
}
