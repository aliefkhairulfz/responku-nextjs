"use client"

import Link from "next/link"
import { MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import * as Card from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import type { AvailableResearchRow } from "@/lib/api-types"
import { regionItems } from "@/lib/editor-engine/research-editor-schema"
import { participationStatusLabel } from "@/lib/participation-status"
import { RESEARCH_CATEGORY_ITEMS } from "@/lib/research-category"

function categoryLabel(category: string | null) {
    return RESEARCH_CATEGORY_ITEMS.find((item) => item.value === category)?.label ?? "Tanpa kategori"
}

/** The domicile region key as its label, falling back to "Seluruh Indonesia" for an unknown key. */
function regionLabel(region: string) {
    return regionItems.find((item) => item.value === region)?.label ?? regionItems[0].label
}

/**
 * One survey a respondent can take, or carry on.
 *
 * Everything here comes from the feed endpoint, including the reward in rupiah and the
 * days left — the token price is a server variable, and the clock is not a component's to
 * read. Who *answered* is counted from submitted participations, the same rule the
 * researcher's own list uses.
 *
 * A row the caller has already begun keeps its place in the feed, carrying its status, so
 * unfinished work cannot quietly become unreachable.
 */
export default function BrowseSurveyCard({ research, respondentId }: { research: AvailableResearchRow; respondentId: string | null }) {
    const percent =
        research.targetRespondentCount === 0 ? 0 : Math.min(100, Math.round((research.respondentCount / research.targetRespondentCount) * 100))
    const reward = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(research.rewardIdr)

    const participation = research.participation
    // Carrying on goes straight into the questionnaire; starting goes through the detail page,
    // where the criteria and the reward can be read first.
    const href = participation !== null && respondentId !== null ? `/research/${research.id}/work-on/${respondentId}` : `/research/${research.id}`

    return (
        <div className="@container flex w-full h-full items-center justify-center">
            <Card.Card className="w-full h-full">
                <Card.CardHeader className="flex flex-row items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{categoryLabel(research.category)}</Badge>
                        <span>
                            oleh <b>{research.researcherName}</b>
                        </span>
                        {participation !== null && <Badge className="rounded-full">{participationStatusLabel(participation.status)}</Badge>}
                    </div>
                </Card.CardHeader>

                <Card.CardContent className="space-y-4">
                    <div className="space-y-2">
                        <h3 className="text-xl font-semibold leading-snug @xl:text-2xl">{research.title}</h3>
                        <p className="leading-relaxed text-muted-foreground @xl:text-lg @xl:-mt-2">{research.description}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">Reward: {reward}</Badge>
                        <Badge variant="outline">~{research.estimatedDurationMinutes} Menit</Badge>
                        <Badge variant="outline">
                            <MapPin className="size-3.5" />
                            Domisili: {regionLabel(research.region)}
                        </Badge>
                        <Badge variant="outline">
                            Batas pengisian: <b>{research.daysLeft} hari lagi</b>
                        </Badge>
                    </div>
                </Card.CardContent>

                <Separator />

                <Card.CardFooter className="flex flex-col gap-4">
                    <div className="flex w-full flex-col gap-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <Badge variant="ghost">Kuota Terkumpul</Badge>
                            <span className="text-muted-foreground">
                                {research.respondentCount} / {research.targetRespondentCount} Responden ({percent}%)
                            </span>
                        </div>

                        <Progress value={percent} className="w-full" />
                    </div>

                    <Button className="w-full" nativeButton={false} render={<Link href={href} />}>
                        {participation === null ? "Mulai Isi Kuesioner" : "Lanjutkan Kuesioner"}
                    </Button>
                </Card.CardFooter>
            </Card.Card>
        </div>
    )
}
