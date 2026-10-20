import { FileSpreadsheet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import * as Card from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

export default function SurveiSayaCard() {
    return (
        <div className="flex w-full items-center justify-center">
            <Card.Card className="w-full">
                <Card.CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div className="space-y-2">
                        <h3 className="text-xl font-semibold leading-snug">
                            Survei Preferensi Penggunaan E-Wallet di Jabodetabek
                        </h3>
                        <p className="text-muted-foreground">Dibuat 2 Sep 2026</p>
                    </div>
                    <Badge>Recruiting</Badge>
                </Card.CardHeader>

                <Card.CardContent className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-muted-foreground">Responden terkumpul</span>
                            <span className="font-semibold">68/100 (68%)</span>
                        </div>
                        <Progress value={68} className="w-full" />
                    </div>
                </Card.CardContent>

                <Separator />

                <Card.CardFooter className="flex flex-row flex-wrap items-center justify-between gap-4">
                    <p className="text-muted-foreground">
                        Escrow: <b className="text-foreground">100 Token</b>
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline">Studio Soal</Button>
                        <Button className="gap-2 bg-green-600 text-white hover:bg-green-700">
                            <FileSpreadsheet />
                            CSV
                        </Button>
                    </div>
                </Card.CardFooter>
            </Card.Card>
        </div>
    )
}
