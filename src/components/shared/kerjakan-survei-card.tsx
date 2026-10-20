import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import * as Card from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

export default function KerjakanSurveiCard() {
    return (
        <div className="flex w-full items-center justify-center">
            <Card.Card className="w-full">
                <Card.CardHeader className="flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                        <h3 className="text-xl font-semibold leading-snug">
                            Survei Kebiasaan Belanja Online Mingguan Produk Kebutuhan Rumah
                        </h3>
                        <Badge variant="default">Konsumen & Retail</Badge>
                    </div>

                    <div className="flex  items-center gap-2">
                        <Badge variant="secondary">Rp800</Badge>
                        <Badge variant="secondary">~5 Menit</Badge>
                        <Badge variant="secondary">Besok, 23:59 WIB</Badge>
                    </div>
                </Card.CardHeader>

                <Card.CardContent className="space-y-4">
                    <div className="flex w-full flex-col gap-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <Badge variant="ghost">Kuota Terisi</Badge>
                            <span className="text-muted-foreground">38/50 (76%)</span>
                        </div>
                        <Progress value={82} className="w-full" />
                    </div>
                </Card.CardContent>

                <Separator />

                <Card.CardFooter className="flex items-center justify-between gap-4">
                    <Badge variant="secondary">Sesuai Profil</Badge>
                    <Button>Kerjakan</Button>
                </Card.CardFooter>
            </Card.Card>
        </div>
    )
}
