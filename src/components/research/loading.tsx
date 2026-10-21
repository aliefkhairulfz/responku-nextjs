import * as Card from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function RisetDetailSkeleton() {
    return (
        <main className="mx-auto flex w-full max-w-2xl animate-pulse flex-col gap-6 px-4 py-10">
            {/* HEADER RISET SKELETON */}
            <Card.Card>
                <Card.CardHeader className="space-y-4">
                    {/* Badges Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="h-6 w-36 rounded-full bg-muted" />
                        <div className="h-6 w-32 rounded-full bg-muted" />
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                        <div className="h-7 w-4/5 rounded-md bg-muted" />
                        <div className="h-7 w-2/3 rounded-md bg-muted" />
                    </div>

                    {/* Researcher Info */}
                    <div className="space-y-1.5">
                        <div className="h-4 w-40 rounded bg-muted" />
                        <div className="h-3.5 w-56 rounded bg-muted" />
                    </div>

                    {/* Description Paragraphs */}
                    <div className="space-y-2 pt-1">
                        <div className="h-4 w-full rounded bg-muted" />
                        <div className="h-4 w-full rounded bg-muted" />
                        <div className="h-4 w-3/4 rounded bg-muted" />
                    </div>
                </Card.CardHeader>

                <Separator />

                {/* Metadata Grid */}
                <Card.CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                        <div className="h-3 w-28 rounded bg-muted" />
                        <div className="h-5 w-44 rounded bg-muted" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="h-3 w-32 rounded bg-muted" />
                        <div className="h-5 w-36 rounded bg-muted" />
                    </div>
                </Card.CardContent>
            </Card.Card>

            {/* INSTRUKSI SKELETON */}
            <Card.Card>
                <Card.CardHeader className="space-y-2">
                    <div className="h-6 w-60 rounded-md bg-muted" />
                    <div className="space-y-2 pt-1">
                        <div className="h-4 w-full rounded bg-muted" />
                        <div className="h-4 w-4/5 rounded bg-muted" />
                    </div>
                </Card.CardHeader>
                <Card.CardContent className="flex flex-col gap-3">
                    <div className="h-10 w-full rounded-md bg-muted" />
                </Card.CardContent>
            </Card.Card>

            {/* ATTENTION CHECK SKELETON */}
            <Card.Card>
                <Card.CardHeader className="space-y-2">
                    <div className="h-6 w-72 rounded-md bg-muted" />
                    <div className="space-y-2 pt-1">
                        <div className="h-4 w-full rounded bg-muted" />
                        <div className="h-4 w-3/4 rounded bg-muted" />
                    </div>
                </Card.CardHeader>

                <Card.CardContent className="flex flex-col gap-4">
                    {/* Radio Options Skeleton */}
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                                <div className="size-4 shrink-0 rounded-full bg-muted" />
                                <div className="h-4 w-full rounded bg-muted" />
                            </div>
                        ))}
                    </div>
                </Card.CardContent>

                <Card.CardFooter>
                    <div className="h-10 w-full rounded-md bg-muted" />
                </Card.CardFooter>
            </Card.Card>
        </main>
    );
}
