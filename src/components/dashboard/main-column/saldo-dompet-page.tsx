'use client'

import { ArrowDownLeft, ArrowUpRight, Coins, History, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

const transactions = [
    {
        id: 1,
        category: 'Reward Cair',
        description: 'Reward Jawaban Survei',
        date: '20 Okt 2026, 09.06',
        amount: '+0,8',
        type: 'income',
    },
    {
        id: 2,
        category: 'Reward Cair',
        description: 'Reward Jawaban Survei',
        date: '19 Okt 2026, 09.06',
        amount: '+1,6',
        type: 'income',
    },
    {
        id: 3,
        category: 'Top-up Saldo',
        description: 'Top-up Kuota Token',
        date: '17 Okt 2026, 11.06',
        amount: '+50',
        type: 'income',
    },
    {
        id: 4,
        category: 'Cadangan Riset',
        description: 'Alokasi Cadangan Riset',
        date: '17 Okt 2026, 11.06',
        amount: '-50',
        type: 'expense',
    },
] as const

function TokenDialog({ type }: { type: 'topup' | 'withdraw' }) {
    const [open, setOpen] = useState(false)
    const [amount, setAmount] = useState('')
    const isTopup = type === 'topup'

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        console.log({ type, amount: Number(amount) })

        setOpen(false)
        setAmount('')
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>
                {isTopup ? (
                    <Button nativeButton={false} variant="outline" render={<div />}>
                        <ArrowDownLeft />
                        <span>Top Up Token</span>
                    </Button>
                ) : (
                    <Button nativeButton={false} render={<div />}>
                        <ArrowUpRight />
                        <span>Tarik Tunai</span>
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isTopup ? 'Top Up Token' : 'Tarik Tunai'}</DialogTitle>
                    <DialogDescription>
                        {isTopup
                            ? 'Masukkan jumlah token yang ingin dibeli.'
                            : 'Masukkan jumlah token yang ingin ditarik menjadi uang tunai.'}
                    </DialogDescription>
                </DialogHeader>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                        <Label htmlFor={`${type}-amount`}>Jumlah Token</Label>
                        <Input
                            id={`${type}-amount`}
                            type="number"
                            min="1"
                            step="0.1"
                            placeholder="Contoh: 50"
                            value={amount}
                            onChange={(event) => setAmount(event.target.value)}
                            required
                        />
                        <p className="text-sm text-muted-foreground">1 Token = Rp1.000</p>
                    </div>

                    {amount && Number(amount) > 0 && (
                        <div className="rounded-lg bg-muted p-3">
                            <p className="text-sm text-muted-foreground">
                                {isTopup ? 'Total pembayaran' : 'Estimasi penarikan'}
                            </p>
                            <p className="text-lg font-semibold">
                                {new Intl.NumberFormat('id-ID', {
                                    style: 'currency',
                                    currency: 'IDR',
                                    maximumFractionDigits: 0,
                                }).format(Number(amount) * 1000)}
                            </p>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={!amount || Number(amount) <= 0}>
                            {isTopup ? 'Lanjutkan Top Up' : 'Ajukan Penarikan'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default function SaldoDompetPage() {
    const balance = 32

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-xl font-semibold leading-snug">Dompet Akun</h3>
                <p className="text-muted-foreground">
                    Kelola saldo token riset, top-up kuota, dan penarikan reward responden.
                </p>
            </div>

            <Card>
                <CardContent className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Wallet className="size-4" />
                            Total Saldo Tersedia
                        </div>

                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-bold tracking-tight text-emerald-600">
                                {balance}
                            </span>
                            <span className="text-xl font-semibold">Token</span>
                        </div>

                        <p className="text-muted-foreground">
                            ≈{' '}
                            {new Intl.NumberFormat('id-ID', {
                                style: 'currency',
                                currency: 'IDR',
                                maximumFractionDigits: 0,
                            }).format(balance * 1000)}{' '}
                            (1 Token = Rp1.000)
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <TokenDialog type="topup" />
                        <TokenDialog type="withdraw" />
                    </div>
                </CardContent>
            </Card>

            <Card className="gap-0 py-0">
                <CardHeader className="flex flex-row items-center justify-between py-5">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <History className="size-5" />
                            Riwayat Transaksi
                        </CardTitle>
                        <CardDescription>Catatan pergerakan saldo token akun Anda.</CardDescription>
                    </div>
                    <span className="hidden text-sm text-muted-foreground sm:inline">
                        Ledger Transparan
                    </span>
                </CardHeader>

                <Separator />

                <CardContent className="p-4">
                    {transactions.map((transaction, index) => (
                        <div key={transaction.id}>
                            <div className="flex flex-col gap-3 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                <div className="flex min-w-0 items-start gap-2">
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                                        {transaction.type === 'income' ? (
                                            <ArrowDownLeft className="size-4 text-emerald-600" />
                                        ) : (
                                            <Coins className="size-4 text-amber-600" />
                                        )}
                                    </div>

                                    <div className="min-w-0 space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant="secondary">
                                                {transaction.category}
                                            </Badge>
                                            <p className="font-medium">{transaction.description}</p>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {transaction.date}
                                        </p>
                                    </div>
                                </div>

                                <p
                                    className={`shrink-0 pl-12 font-semibold tabular-nums sm:pl-0 ${
                                        transaction.type === 'income'
                                            ? 'text-emerald-600'
                                            : 'text-foreground'
                                    }`}
                                >
                                    {transaction.amount} Token
                                </p>
                            </div>

                            {index < transactions.length - 1 && <Separator />}
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    )
}
