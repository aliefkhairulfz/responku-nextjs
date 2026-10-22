"use client"

import { CirclePlay, Clock, Coins } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import * as Card from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { AvailableResearchDetail, ResearchCriterion } from "@/lib/api-types"
import { formatIdr } from "@/lib/currency"
import { genderItems, regionItems } from "@/lib/editor-engine/research-editor-schema"
import { isParticipationDone, participationStatusLabel } from "@/lib/participation-status"
import { RESEARCH_CATEGORY_ITEMS } from "@/lib/research-category"

/**
 * What a respondent sees before taking a research: what it is, who is asking, what it
 * pays, how long it should take, and who it is for.
 *
 * The one action is starting the questionnaire — the answering and the sending-in happen
 * on the work-on page, so there is no submit here. Availability is not re-checked either:
 * the work-on page is where joining reports a closed research, a full quota, or criteria
 * the profile does not meet.
 */

function categoryLabel(category: string | null) {
    return RESEARCH_CATEGORY_ITEMS.find((item) => item.value === category)?.label ?? "Tanpa kategori"
}

/**
 * The stored screening rules as short lines a respondent can check themselves against.
 *
 * The two fields the editor offers that are not profile columns — `age` and `region` —
 * get labels here; anything else is shown as it is stored rather than guessed at.
 */
function criteriaLines(criteria: ResearchCriterion[]): string[] {
    return criteria.map((rule) => {
        if (rule.field === "age" && rule.operator === "GTE") return `Usia minimal ${rule.value} tahun`
        if (rule.field === "age" && rule.operator === "LTE") return `Usia maksimal ${rule.value} tahun`

        if (rule.field === "gender" && rule.operator === "EQ") {
            return `Gender: ${genderItems.find((item) => item.value === rule.value)?.label ?? rule.value}`
        }

        if (rule.field === "region" && rule.operator === "EQ") {
            return `Wilayah: ${regionItems.find((item) => item.value === rule.value)?.label ?? rule.value}`
        }

        return `${rule.field} ${rule.operator} ${rule.value}`
    })
}

export default function ResearchDetailView({
    research,
    respondentId,
    participation,
}: {
    research: AvailableResearchDetail
    respondentId: string
    participation: { id: string; status: string } | null
}) {
    const criteria = criteriaLines(research.criteria)
    const done = participation !== null && isParticipationDone(participation.status)

    return (
        <main className="mx-auto mt-10 flex w-full max-w-2xl flex-col space-y-4 px-4 py-10">
            <Card.Card>
                <Card.CardHeader className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge variant="secondary" className="rounded-full">
                            {categoryLabel(research.category)}
                        </Badge>

                        <Badge className="gap-1 rounded-full">
                            <Coins className="size-3.5" />+{research.tokenPerRespondent} Token (~{formatIdr(research.rewardIdr)})
                        </Badge>
                    </div>

                    <h1 className="text-2xl leading-snug font-semibold">{research.title}</h1>

                    <p className="text-sm font-medium">oleh {research.researcherName}</p>

                    <p className="text-muted-foreground text-sm leading-relaxed">{research.description}</p>
                </Card.CardHeader>

                <Separator />

                <Card.CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
                    <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground flex items-center gap-1 text-xs uppercase">
                            <Clock className="size-3.5" /> Estimasi Waktu
                        </span>
                        <span className="text-sm font-medium">{research.estimatedDurationMinutes} Menit</span>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground text-xs uppercase">Batas Pengisian</span>
                        <span className="text-sm font-medium">{research.daysLeft > 0 ? `${research.daysLeft} hari lagi` : "Hari ini terakhir"}</span>
                    </div>
                </Card.CardContent>

                <Separator />

                <Card.CardContent className="flex flex-col gap-2 pt-6">
                    <span className="text-muted-foreground text-xs uppercase">Kriteria Responden</span>

                    {criteria.length === 0 ? (
                        <span className="text-sm font-medium">Terbuka untuk siapa saja</span>
                    ) : (
                        <ul className="list-disc space-y-1 pl-5 text-sm font-medium">
                            {criteria.map((line) => (
                                <li key={line}>{line}</li>
                            ))}
                        </ul>
                    )}
                </Card.CardContent>
            </Card.Card>

            <Card.Card>
                <Card.CardHeader className="space-y-2">
                    <h2 className="text-lg font-semibold">Instruksi Pengisian</h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        Semua pertanyaan sudah dimuat sekaligus, jadi kamu bebas berpindah soal dan kembali lagi sebelum mengirim. Jawab dengan
                        teliti, lalu kirim satu kali di halaman terakhir.
                    </p>
                </Card.CardHeader>

                <Card.CardFooter>
                    {done ? (
                        <p className="text-muted-foreground text-sm">
                            Kamu sudah mengirim jawaban untuk riset ini ({participationStatusLabel(participation.status)}).
                        </p>
                    ) : (
                        <Button className="w-full" nativeButton={false} render={<Link href={`/research/${research.id}/work-on/${respondentId}`} />}>
                            <CirclePlay className="size-4" />
                            {participation === null ? "Mulai Isi Kuesioner" : "Lanjutkan Kuesioner"}
                        </Button>
                    )}
                </Card.CardFooter>
            </Card.Card>
        </main>
    )
}
