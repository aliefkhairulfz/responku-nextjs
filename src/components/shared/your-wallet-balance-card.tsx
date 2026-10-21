import { Button } from '@/components/ui/button'
import * as Card from '@/components/ui/card'

export default function YourWalletBalanceCard() {
    return (
        <Card.Card className="w-full">
            <Card.CardHeader>
                <div className="flex flex-col gap-2">
                    <Card.CardTitle>Saldo Dompet Anda</Card.CardTitle>
                    <div className="flex flex-wrap items-baseline gap-2">
                        <p className="text-3xl font-bold tracking-tight">Rp100.000</p>
                        <span className="text-muted-foreground">(100,0 Token)</span>
                    </div>
                </div>
            </Card.CardHeader>

            <Card.CardFooter className="flex gap-3 pt-6">
                <Button className="flex-1">Tarik Saldo</Button>
                <Button className="flex-1" variant="outline">
                    Riwayat
                </Button>
            </Card.CardFooter>
        </Card.Card>
    )
}
