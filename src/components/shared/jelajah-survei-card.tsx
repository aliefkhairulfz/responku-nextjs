import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import * as Card from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

export default function JelajahSurveiCard() {
    return (
        <div className="flex w-full items-center justify-center">
            <Card.Card className="w-full">
                <Card.CardHeader className="flex flex-row items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">Fintech & Perbankan</Badge>
                        <span>
                            oleh <b>Fakultas Ekonomi UI</b>
                        </span>
                    </div>
                    <Badge variant="default">99% Cocok</Badge>
                </Card.CardHeader>

                <Card.CardContent className="space-y-4">
                    <div className="space-y-2">
                        <h3 className="text-xl font-semibold leading-snug">
                            Survei Preferensi Penggunaan Aplikasi Finansial & Dompet Digital 2026
                        </h3>
                        <p className="leading-relaxed text-muted-foreground">
                            Riset pola transaksi nontunai, fitur transfer instan, dan kebiasaan
                            menabung generasi muda Indonesia untuk keperluan skripsi ekonomi.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">Reward: Rp1.600</Badge>
                        <Badge variant="secondary">~8 Menit</Badge>
                        <Badge variant="secondary">
                            Batas pengisian: <b>2 hari lagi</b>
                        </Badge>
                    </div>
                </Card.CardContent>

                <Separator />

                <Card.CardFooter className="flex flex-col gap-4">
                    <div className="flex w-full flex-col gap-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <Badge variant="ghost">Kuota Terkumpul</Badge>
                            <span className="text-muted-foreground">82 / 100 Responden (82%)</span>
                        </div>
                        <Progress value={82} className="w-full" />
                    </div>

                    <Button className="w-full">Mulai Isi Kuesioner</Button>
                </Card.CardFooter>
            </Card.Card>
        </div>
    )
}
