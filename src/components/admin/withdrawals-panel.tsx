'use client'

import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { AdminPanel } from '@/components/admin/admin-panel'
import {
    QueueEmpty,
    QueueError,
    QueueForbidden,
    QueueLoading,
} from '@/components/admin/queue-states'
import { type AdminListState, useAdminList } from '@/components/admin/use-admin-data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/toast'
import { getJson, postJson } from '@/lib/api-client'
import type { AdminWithdrawal } from '@/lib/api-types'
import { formatIdr } from '@/lib/currency'

async function readWithdrawals(): Promise<AdminListState<AdminWithdrawal>> {
    const result = await getJson<{ withdrawals: AdminWithdrawal[] }>(
        '/api/admin/withdrawals?take=100',
    )

    if (result.statusCode === 401) return { status: 'unauthorized' }
    if (result.statusCode === 403) return { status: 'forbidden' }
    if (!result.ok || result.data === null) return { status: 'error', message: result.message }

    return { status: 'ready', items: result.data.withdrawals }
}

/**
 * The withdrawal queue.
 *
 * The tokens already left the wallet when the request was made, so settling is the last
 * step: `PAID` closes the order out, and `FAILED` returns the tokens with a refund ledger
 * row. Both are refused once the order is no longer pending, which is what stops a failed
 * withdrawal from being paid after its tokens were returned.
 */
export default function AdminWithdrawalsPanel() {
    const { state, reload } = useAdminList(readWithdrawals)
    const [busyId, setBusyId] = useState<string | null>(null)

    async function settle(id: string, decision: 'PAID' | 'FAILED') {
        setBusyId(id)
        const result = await postJson(`/api/admin/withdrawals/${id}/settle`, { decision })
        setBusyId(null)

        if (!result.ok) {
            toast.add({
                type: 'error',
                title: 'Gagal menyelesaikan penarikan',
                description: result.message,
            })
            return
        }

        toast.add({
            type: 'success',
            title:
                decision === 'PAID' ? 'Penarikan dibayar' : 'Penarikan gagal & token dikembalikan',
        })
        reload()
    }

    return (
        <AdminPanel
            title="Penarikan Saldo"
            description="Permintaan penarikan token. Token sudah keluar dari wallet saat diajukan."
            onRefresh={reload}
        >
            {state.status === 'loading' && <QueueLoading label="Memuat penarikan…" />}
            {state.status === 'forbidden' && <QueueForbidden />}
            {state.status === 'error' && <QueueError message={state.message} onRetry={reload} />}
            {state.status === 'ready' && state.items.length === 0 && (
                <QueueEmpty message="Tidak ada permintaan penarikan." />
            )}

            {state.status === 'ready' && state.items.length > 0 && (
                <div className="space-y-3">
                    {state.items.map((withdrawal) => (
                        <Card key={withdrawal.id}>
                            <CardHeader>
                                <CardTitle>{withdrawal.user.name}</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    {withdrawal.user.email}
                                </p>
                            </CardHeader>

                            <CardContent>
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <Badge variant="secondary">{withdrawal.status}</Badge>
                                    <span className="text-muted-foreground">
                                        {withdrawal.tokenAmount.toLocaleString('id-ID')} token
                                    </span>
                                    <span className="font-medium">
                                        {formatIdr(withdrawal.amountIdr)}
                                    </span>
                                </div>

                                {withdrawal.status === 'PENDING' ? (
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            size="sm"
                                            disabled={busyId === withdrawal.id}
                                            onClick={() => settle(withdrawal.id, 'PAID')}
                                        >
                                            {busyId === withdrawal.id && (
                                                <Loader2 className="animate-spin" />
                                            )}
                                            Tandai dibayar
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={busyId === withdrawal.id}
                                            onClick={() => settle(withdrawal.id, 'FAILED')}
                                        >
                                            Gagalkan & kembalikan token
                                        </Button>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        Sudah diselesaikan.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </AdminPanel>
    )
}
