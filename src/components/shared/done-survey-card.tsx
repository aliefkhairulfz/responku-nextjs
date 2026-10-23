"use client"

import { BadgeCheck, Clock, Coins } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import * as Card from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { Participation } from "@/lib/api-types"
import { participationStatusLabel } from "@/lib/participation-status"
import { RESEARCH_CATEGORY_ITEMS } from "@/lib/research-category"
import { rewardStatusLabel } from "@/lib/reward-status"

function categoryLabel(category: string | null) {
    return RESEARCH_CATEGORY_ITEMS.find((item) => item.value === category)?.label ?? "Tanpa kategori"
}

function submittedOn(value: string) {
    return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
}

/**
 * One survey a respondent has already worked on and sent in.
 *
 * Read from the participation list, so the reward shown is what the submission actually
 * ended up as — `PENDING` until an admin decides it — rather than the research's advertised
 * amount. The reward falls back to `tokenPerRespondent` only while no reward row exists yet.
 */
export default function DoneSurveyCard({ participation }: { participation: Participation }) {
    const { research, reward } = participation
    const tokenAmount = reward?.tokenAmount ?? research.tokenPerRespondent
    // A rejected submission is not waiting on a decision, so it must not read as one.
    const rejected = participation.status === "REJECTED"

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

                    <Badge variant={rejected ? "destructive" : "outline"} className="rounded-full">
                        <BadgeCheck className="size-3.5" />
                        {participationStatusLabel(participation.status)}
                    </Badge>
                </Card.CardHeader>

                <Card.CardContent className="space-y-4">
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold leading-snug">{research.title}</h3>
                        <p className="leading-relaxed text-muted-foreground">{research.description}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={reward?.status === "PAID" ? "secondary" : "outline"}>
                            <Coins className="size-3.5" />
                            Reward: {tokenAmount} token
                            {reward !== null && ` · ${rewardStatusLabel(reward.status)}`}
                        </Badge>

                        <Badge variant="secondary">
                            <Clock className="size-3.5" />~{research.estimatedDurationMinutes} Menit
                        </Badge>

                        {participation.submittedAt !== null && (
                            <Badge variant="secondary">
                                Dikirim: <b>{submittedOn(participation.submittedAt)}</b>
                            </Badge>
                        )}
                    </div>
                </Card.CardContent>

                <Separator />

                <Card.CardFooter>
                    <p className="text-sm text-muted-foreground">
                        {rejected
                            ? "Jawaban kamu ditolak, jadi reward tidak diberikan untuk survei ini."
                            : reward?.status === "PAID"
                              ? `Reward ${tokenAmount} token sudah masuk ke saldo kamu.`
                              : "Reward akan dicairkan setelah jawaban divalidasi."}
                    </p>
                </Card.CardFooter>
            </Card.Card>
        </div>
    )
}
