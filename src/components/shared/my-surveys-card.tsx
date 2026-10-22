"use client"

import { FileSpreadsheet } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import * as Card from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/toast"
import type { ResearchSummary } from "@/lib/api-types"
import { researchStatusLabel, researchStatusVariant } from "@/lib/research-status"

function updatedOn(value: string) {
    return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
}

/** Exporting is not wired up: the API has no export endpoint yet. */
function exportCsv() {
    toast.add({ type: "info", title: "Ekspor CSV belum tersedia", description: "Endpoint ekspor datanya belum ada." })
}

/**
 * One row of "Riset Saya".
 *
 * Everything here comes from the list endpoint. Who has *answered* is not part of it
 * — there is no participation flow yet — so the card shows the target and the escrow
 * instead of a progress bar that would have to be invented.
 */
export default function MySurveysCard({ research }: { research: ResearchSummary }) {
    // Over-delivery happens, so the bar is clamped even though the numbers beside it are not.
    const percent =
        research.targetRespondentCount === 0 ? 0 : Math.min(100, Math.round((research.respondentCount / research.targetRespondentCount) * 100))

    return (
        <div className="flex w-full items-center justify-center">
            <Card.Card className="w-full">
                <Card.CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div className="space-y-2">
                        <h3 className="text-xl font-semibold leading-snug">{research.title.trim() === "" ? "Draft tanpa judul" : research.title}</h3>
                        <p className="text-muted-foreground">Diperbarui {updatedOn(research.updatedAt)}</p>
                    </div>

                    <Badge variant={researchStatusVariant(research.status)}>{researchStatusLabel(research.status)}</Badge>
                </Card.CardHeader>

                <Card.CardContent className="space-y-4">
                    <p className="text-muted-foreground">{research.questionCount} pertanyaan</p>

                    {research.targetRespondentCount > 0 ? (
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-muted-foreground">Responden terkumpul</span>
                                <span className="font-semibold">
                                    {research.respondentCount}/{research.targetRespondentCount} ({percent}%)
                                </span>
                            </div>

                            <Progress value={percent} className="w-full" />
                        </div>
                    ) : (
                        <p className="text-muted-foreground">Belum ada target responden.</p>
                    )}
                </Card.CardContent>

                <Separator />

                <Card.CardFooter className="flex flex-row flex-wrap items-center justify-between gap-4">
                    <p className="text-muted-foreground">
                        Escrow: <b className="text-foreground">{research.tokensReserved.toLocaleString("id-ID")} token</b>
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button nativeButton={false} render={<Link href={`/create-research/${research.id}`} />}>
                            Buka editor
                        </Button>

                        <Button variant="outline" onClick={exportCsv}>
                            <FileSpreadsheet />
                            Export CSV
                        </Button>
                    </div>
                </Card.CardFooter>
            </Card.Card>
        </div>
    )
}
