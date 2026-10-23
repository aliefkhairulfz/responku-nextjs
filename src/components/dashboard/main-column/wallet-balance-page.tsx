"use client"

import { ArrowDownLeft, ArrowUpRight, Coins, History, Loader2, RefreshCw, Wallet as WalletIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/toast"
import { getJson, postJson } from "@/lib/api-client"
import type { Payment, TopupResult, Wallet, WalletTransaction, WithdrawResult } from "@/lib/api-types"
import { formatIdr } from "@/lib/currency"
import { isCredit, tokenTransactionDescription, tokenTransactionLabel } from "@/lib/token-transaction"
import { useRefreshOnFocus } from "@/lib/use-refresh-on-focus"

/* ========== Konstanta ========== */

/**
 * How often a pending top-up is re-checked while its dialog is open.
 *
 * The payment settles in the gateway's own tab, so asking again is the only way to
 * notice it — and the wallet only moves once the gateway says so.
 */
const POLL_INTERVAL_MS = 5000

/* ========== Data ========== */

type WalletState = { status: "loading" } | { status: "ready"; wallet: Wallet } | { status: "unauthorized" } | { status: "error"; message: string }

/**
 * Reads the caller's wallet and its ledger.
 *
 * Answering with the state rather than setting it keeps this free of React, so the
 * effect can apply it in a callback — which is where an effect is allowed to put state.
 */
async function readWallet(): Promise<WalletState> {
    const result = await getJson<{ wallet: Wallet }>("/api/payment/wallet")

    if (result.statusCode === 401) return { status: "unauthorized" }
    if (!result.ok || result.data === null) return { status: "error", message: result.message }

    return { status: "ready", wallet: result.data.wallet }
}

/** When a ledger row was written, with the time — the ledger is read in order. */
function movedAt(value: string) {
    return new Date(value).toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}

/* ========== Top up ========== */

/**
 * Opens a top-up and follows it to the end.
 *
 * Creating the order moves nothing: the wallet is credited when the gateway reports
 * the payment as settled, which happens in the payment page this dialog opens. So the
 * dialog stays up, re-reads the payment until it is `PAID`, and only then refreshes
 * the wallet behind it.
 *
 * With no gateway configured the order is recorded locally and there is no page to
 * open — the dialog says so rather than waiting for a payment that cannot arrive.
 */
function TopupDialog({ tokenPriceIdr, onCredited }: { tokenPriceIdr: number; onCredited: () => void }) {
    const [open, setOpen] = useState(false)
    const [amount, setAmount] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [checking, setChecking] = useState(false)
    const [payment, setPayment] = useState<Payment | null>(null)
    const [redirectUrl, setRedirectUrl] = useState<string | null>(null)

    const tokens = Number(amount)
    const valid = Number.isInteger(tokens) && tokens >= 1
    const paymentId = payment?.id ?? null
    const pending = payment?.status === "PENDING"

    const reset = useCallback(() => {
        setOpen(false)
        setAmount("")
        setPayment(null)
        setRedirectUrl(null)
    }, [])

    const check = useCallback(async () => {
        if (paymentId === null) return

        setChecking(true)
        const result = await getJson<{ payment: Payment }>(`/api/payment/${paymentId}`)
        setChecking(false)

        if (!result.ok || result.data === null) {
            toast.add({ type: "error", title: "Gagal memeriksa status", description: result.message })
            return
        }

        setPayment(result.data.payment)

        if (result.data.payment.status === "PAID") {
            toast.add({
                type: "success",
                title: "Top up berhasil",
                description: `${result.data.payment.tokenAmount.toLocaleString("id-ID")} token sudah masuk ke saldo.`,
            })
            onCredited()
            reset()
        }
    }, [paymentId, onCredited, reset])

    useEffect(() => {
        if (!open || !pending) return

        const timer = setInterval(() => void check(), POLL_INTERVAL_MS)
        return () => clearInterval(timer)
    }, [open, pending, check])

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!valid) return

        setSubmitting(true)
        const result = await postJson<TopupResult>("/api/payment/topup", { tokenAmount: tokens })
        setSubmitting(false)

        if (!result.ok || result.data === null) {
            toast.add({ type: "error", title: "Gagal membuat order", description: result.message })
            return
        }

        setPayment(result.data.payment)
        setRedirectUrl(result.data.redirectUrl)

        // The hosted page is where the money actually moves. Opened from the click that
        // created the order, so the popup blocker lets it through.
        if (result.data.redirectUrl !== null) window.open(result.data.redirectUrl, "_blank", "noopener,noreferrer")
    }

    return (
        <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : reset())}>
            <DialogTrigger>
                <Button nativeButton={false} variant="outline" render={<div />}>
                    <ArrowDownLeft />
                    <span>Top Up Token</span>
                </Button>
            </DialogTrigger>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Top Up Token</DialogTitle>
                    <DialogDescription>
                        {payment === null
                            ? "Masukkan jumlah token yang ingin dibeli."
                            : "Selesaikan pembayaran di halaman yang terbuka, saldo masuk otomatis setelah gateway melaporkannya lunas."}
                    </DialogDescription>
                </DialogHeader>

                {payment === null ? (
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="space-y-2">
                            <Label htmlFor="topup-amount">Jumlah Token</Label>
                            <Input
                                id="topup-amount"
                                type="number"
                                min="1"
                                step="1"
                                placeholder="Contoh: 50"
                                value={amount}
                                onChange={(event) => setAmount(event.target.value)}
                                required
                            />
                            <p className="text-sm text-muted-foreground">1 Token = {formatIdr(tokenPriceIdr)}</p>
                        </div>

                        {valid && (
                            <div className="rounded-lg bg-muted p-3">
                                <p className="text-sm text-muted-foreground">Total pembayaran</p>
                                <p className="text-lg font-semibold">{formatIdr(tokens * tokenPriceIdr)}</p>
                            </div>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={reset}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={!valid || submitting}>
                                {submitting && <Loader2 className="animate-spin" />}
                                Lanjutkan Top Up
                            </Button>
                        </DialogFooter>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-2 rounded-lg bg-muted p-3">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm text-muted-foreground">Status</span>
                                <Badge variant={payment.status === "PAID" ? "default" : "secondary"}>{payment.status}</Badge>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm text-muted-foreground">Token</span>
                                <span className="font-medium">{payment.tokenAmount.toLocaleString("id-ID")}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm text-muted-foreground">Total</span>
                                <span className="font-medium">{formatIdr(payment.amountIdr)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm text-muted-foreground">Order</span>
                                <span className="truncate font-mono text-xs">{payment.providerRef}</span>
                            </div>
                        </div>

                        {redirectUrl === null && (
                            <p className="text-sm text-muted-foreground">
                                Gateway pembayaran belum dikonfigurasi, jadi order ini hanya tercatat lokal dan saldonya belum bisa bertambah.
                            </p>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={reset}>
                                Tutup
                            </Button>

                            {redirectUrl !== null && (
                                <Button variant="secondary" nativeButton={false} render={<a href={redirectUrl} target="_blank" rel="noreferrer" />}>
                                    Buka halaman pembayaran
                                </Button>
                            )}

                            <Button type="button" onClick={() => void check()} disabled={checking || !pending}>
                                {checking ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                                Cek status
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

/* ========== Tarik tunai ========== */

/**
 * Requests a withdrawal.
 *
 * The tokens leave the wallet as soon as the request is accepted, so the dialog closes and
 * the page reloads its balance rather than waiting for the payout — which an admin settles
 * afterwards. The fee is shown from the server's own numbers, so the client never recomputes
 * it.
 */
function WithdrawDialog({ tokenPriceIdr, onWithdrawn }: { tokenPriceIdr: number; onWithdrawn: () => void }) {
    const [open, setOpen] = useState(false)
    const [amount, setAmount] = useState("")
    const [submitting, setSubmitting] = useState(false)

    const tokens = Number(amount)
    const valid = Number.isInteger(tokens) && tokens > 0

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!valid) return

        setSubmitting(true)
        const result = await postJson<WithdrawResult>("/api/payment/withdraw", { tokenAmount: tokens })
        setSubmitting(false)

        if (!result.ok || result.data === null) {
            toast.add({ type: "error", title: "Gagal mengajukan penarikan", description: result.message })
            return
        }

        toast.add({
            type: "success",
            title: "Penarikan diajukan",
            description: `${result.data.netTokens.toLocaleString("id-ID")} Token (${formatIdr(result.data.amountIdr)}) akan ditransfer setelah diproses.`,
        })

        setOpen(false)
        setAmount("")
        onWithdrawn()
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>
                <Button nativeButton={false} render={<div />}>
                    <ArrowUpRight />
                    <span>Tarik Tunai</span>
                </Button>
            </DialogTrigger>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Tarik Tunai</DialogTitle>
                    <DialogDescription>Masukkan jumlah token yang ingin ditarik menjadi uang tunai.</DialogDescription>
                </DialogHeader>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                        <Label htmlFor="withdraw-amount">Jumlah Token</Label>
                        <Input
                            id="withdraw-amount"
                            type="number"
                            min="1"
                            step="1"
                            placeholder="Contoh: 50"
                            value={amount}
                            onChange={(event) => setAmount(event.target.value)}
                            required
                        />
                        <p className="text-sm text-muted-foreground">1 Token = {formatIdr(tokenPriceIdr)}</p>
                    </div>

                    {valid && (
                        <div className="rounded-lg bg-muted p-3">
                            <p className="text-sm text-muted-foreground">Estimasi penarikan</p>
                            <p className="text-lg font-semibold">{formatIdr(tokens * tokenPriceIdr)}</p>
                            <p className="text-xs text-muted-foreground">Sebelum biaya penarikan.</p>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={!valid || submitting}>
                            {submitting ? "Memproses..." : "Ajukan Penarikan"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

/* ========== Ledger ========== */

/** One movement of the balance. The sign of the amount decides which way it went. */
function LedgerRow({ transaction }: { transaction: WalletTransaction }) {
    const credit = isCredit(transaction.amount)

    return (
        <div className="flex flex-col gap-3 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex min-w-0 items-start gap-2">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    {credit ? <ArrowDownLeft className="size-4 text-success" /> : <Coins className="size-4 text-warning" />}
                </div>

                <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{tokenTransactionLabel(transaction.type)}</Badge>
                        <p className="font-medium">{tokenTransactionDescription(transaction.type)}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{movedAt(transaction.createdAt)}</p>
                </div>
            </div>

            <p className={`shrink-0 pl-12 font-semibold tabular-nums sm:pl-0 ${credit ? "text-success" : "text-foreground"}`}>
                {credit ? "+" : "-"}
                {Math.abs(transaction.amount).toLocaleString("id-ID")} Token
            </p>
        </div>
    )
}

/* ========== Halaman ========== */

export default function WalletBalancePage({ tokenPriceIdr }: { tokenPriceIdr: number }) {
    const router = useRouter()
    const [state, setState] = useState<WalletState>({ status: "loading" })

    useEffect(() => {
        let cancelled = false

        void readWallet().then((next) => {
            if (!cancelled) setState(next)
        })

        return () => {
            cancelled = true
        }
    }, [])

    // Putting the spinner up is only needed when retrying: the first render is already
    // the loading state.
    const reload = useCallback(() => {
        setState({ status: "loading" })
        void readWallet().then(setState)
    }, [])

    /**
     * Re-reads without the spinner, for when the page comes back into view.
     *
     * A reward is credited by an admin from another session, so a wallet left open would
     * otherwise keep showing the balance and ledger it had when it mounted. A failed
     * background read is ignored rather than replacing a page that is already showing data.
     */
    const refresh = useCallback(() => {
        void readWallet().then((next) => {
            if (next.status === "ready" || next.status === "unauthorized") setState(next)
        })
    }, [])

    useRefreshOnFocus(refresh)

    // An expired session belongs on the sign-in screen, not in an empty wallet.
    useEffect(() => {
        if (state.status === "unauthorized") router.replace("/login")
    }, [state.status, router])

    const wallet = state.status === "ready" ? state.wallet : null
    const transactions = wallet?.transactions ?? []

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="text-xl font-semibold leading-snug">Dompet Akun</h3>
                    <p className="text-muted-foreground">Kelola saldo token riset, top-up kuota, dan penarikan reward responden.</p>
                </div>

                <Button variant="outline" size="sm" onClick={reload} disabled={state.status === "loading"}>
                    {state.status === "loading" ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                    Muat ulang
                </Button>
            </div>

            {state.status === "error" && (
                <p role="alert" className="text-sm text-destructive">
                    {state.message}
                </p>
            )}

            <Card>
                <CardContent className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <WalletIcon className="size-4" />
                            Total Saldo Tersedia
                        </div>

                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-bold tracking-tight text-success">
                                {wallet === null ? "—" : wallet.balance.toLocaleString("id-ID")}
                            </span>
                            <span className="text-xl font-semibold">Token</span>
                        </div>

                        <p className="text-muted-foreground">
                            {wallet === null ? "Saldo belum terbaca." : `≈ ${formatIdr(wallet.balanceIdr)}`} (1 Token = {formatIdr(tokenPriceIdr)})
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <TopupDialog tokenPriceIdr={tokenPriceIdr} onCredited={reload} />
                        <WithdrawDialog tokenPriceIdr={tokenPriceIdr} onWithdrawn={reload} />
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
                    <span className="hidden text-sm text-muted-foreground sm:inline">Ledger Transparan</span>
                </CardHeader>

                <Separator />

                <CardContent className="p-4">
                    {state.status === "loading" && (
                        <p className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground sm:px-6">
                            <Loader2 className="size-4 animate-spin" />
                            Memuat mutasi…
                        </p>
                    )}

                    {wallet !== null && wallet.transactions.length === 0 && (
                        <p className="px-4 py-2 text-sm text-muted-foreground sm:px-6">Belum ada mutasi. Top up dulu untuk mulai mengisi ledger.</p>
                    )}

                    {transactions.map((transaction, index) => (
                        <div key={transaction.id}>
                            <LedgerRow transaction={transaction} />

                            {index < transactions.length - 1 && <Separator />}
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    )
}
