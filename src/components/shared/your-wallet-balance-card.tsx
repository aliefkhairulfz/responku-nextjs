"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import * as Card from "@/components/ui/card"
import { toast } from "@/components/ui/toast"
import { formatIdr } from "@/lib/currency"

/** Withdrawing has no endpoint yet, so the button says so instead of doing nothing. */
function requestWithdrawal() {
    toast.add({ type: "info", title: "Penarikan belum tersedia", description: "Alur penarikan saldo belum dibangun." })
}

/** A wallet that could not be read is shown as unknown rather than as an empty one. */
export default function YourWalletBalanceCard({ balance, balanceIdr }: { balance: number | null; balanceIdr: number | null }) {
    return (
        <Card.Card className="w-full">
            <Card.CardHeader>
                <div className="flex flex-col gap-2">
                    <Card.CardTitle>Saldo Dompet Anda</Card.CardTitle>
                    <div className="flex flex-wrap items-baseline gap-2">
                        <p className="text-3xl font-bold tracking-tight">{balanceIdr === null ? "—" : formatIdr(balanceIdr)}</p>
                        <span className="text-muted-foreground">({balance === null ? "—" : balance.toLocaleString("id-ID")} Token)</span>
                    </div>
                </div>
            </Card.CardHeader>

            <Card.CardFooter className="flex gap-3 pt-6">
                <Button className="flex-1" onClick={requestWithdrawal}>
                    Tarik Saldo
                </Button>

                <Button className="flex-1" variant="outline" nativeButton={false} render={<Link href="/dashboard/wallet-balance" />}>
                    Riwayat
                </Button>
            </Card.CardFooter>
        </Card.Card>
    )
}
