"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import * as Card from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import type { AvailableResearch } from "@/lib/api-types"
import { RESEARCH_CATEGORY_ITEMS } from "@/lib/research-category"

const DAY_MS = 86_400_000

function categoryLabel(category: string | null) {
    return RESEARCH_CATEGORY_ITEMS.find((item) => item.value === category)?.label ?? "Tanpa kategori"
}

/**
 * One survey a respondent can take.
 *
 * Everything here comes from the feed endpoint, including the reward in rupiah — the
 * token price is a server variable, so the conversion happens there rather than in the
 * browser. Who *answered* is counted from submitted participations, the same rule the
 * researcher's own list uses.
 */
export default function BrowseSurveyCard({ research }: { research: AvailableResearch }) {
    const daysLeft = Math.ceil((new Date(research.deadline).getTime() - Date.now()) / DAY_MS)
    const percent =
        research.targetRespondentCount === 0 ? 0 : Math.min(100, Math.round((research.respondentCount / research.targetRespondentCount) * 100))
    const reward = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(research.rewardIdr)

    return (
        <div className="flex w-full items-center justify-center">
            <Card.Card className="w-full">
                <Card.CardHeader className="flex flex-row items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{categoryLabel(research.category)}</Badge>
                        <span>
                            oleh <b>{research.researcherName}</b>
                        </span>
                    </div>
                </Card.CardHeader>

                <Card.CardContent className="space-y-4">
                    <div className="space-y-2">
                        <h3 className="text-xl font-semibold leading-snug">{research.title}</h3>
                        <p className="leading-relaxed text-muted-foreground">{research.description}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">Reward: {reward}</Badge>
                        <Badge variant="secondary">~{research.estimatedDurationMinutes} Menit</Badge>
                        <Badge variant="secondary">
                            Batas pengisian: <b>{daysLeft} hari lagi</b>
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

                    <Button className="w-full" nativeButton={false} render={<Link href={`/research/${research.id}`} />}>
                        Mulai Isi Kuesioner
                    </Button>
                </Card.CardFooter>
            </Card.Card>
        </div>
    )
}
