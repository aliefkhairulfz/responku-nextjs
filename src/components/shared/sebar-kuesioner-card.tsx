import { Button } from '@/components/ui/button'
import * as Card from '@/components/ui/card'

export default function SebarkanKuesionerCard() {
    return (
        <div className="flex w-full items-center justify-center">
            <Card.Card className="flex w-full flex-row items-center justify-between gap-6 p-6">
                <Card.CardHeader className="flex-1 p-0">
                    <Card.CardTitle>Punya Kuesioner? Sebarkan di Responku!</Card.CardTitle>
                    <Card.CardDescription>
                        Dapatkan responden untuk riset atau skripsimu dengan menjangkau lebih banyak
                        orang yang sesuai dengan kebutuhan penelitianmu.
                    </Card.CardDescription>
                </Card.CardHeader>

                <Card.CardFooter className="flex shrink-0 flex-row gap-3 p-0">
                    <Button>Sebar Kuesioner</Button>
                    <Button variant="outline">Pelajari Caranya</Button>
                </Card.CardFooter>
            </Card.Card>
        </div>
    )
}
