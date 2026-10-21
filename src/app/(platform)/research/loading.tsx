export default function Loading() {
    return (
        <div className="h-dvh w-full animate-pulse overflow-hidden">
            {/* Main Layout */}
            <main className="container2nd mx-auto mt-15">
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
