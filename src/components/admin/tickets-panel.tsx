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
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { getJson, postJson } from '@/lib/api-client'
import type { AdminTicket } from '@/lib/api-types'
import { ticketCategoryLabel, ticketStatusLabel } from '@/lib/ticket'

async function readTickets(): Promise<AdminListState<AdminTicket>> {
    const result = await getJson<{ tickets: AdminTicket[] }>('/api/ticket/admin?take=100')

    if (result.statusCode === 401) return { status: 'unauthorized' }
    if (result.statusCode === 403) return { status: 'forbidden' }
    if (!result.ok || result.data === null) return { status: 'error', message: result.message }

    return { status: 'ready', items: result.data.tickets }
}

/**
 * The support-ticket queue.
 *
 * A ticket is reviewed once, and the note is the admin's own record of what was decided —
 * it is never shown to the ticket's owner, which is why the owner's own list leaves it out.
 */
export default function AdminTicketsPanel() {
    const { state, reload } = useAdminList(readTickets)
    const [busyId, setBusyId] = useState<string | null>(null)
    const [notes, setNotes] = useState<Record<string, string>>({})

    async function decide(id: string, status: 'RESOLVED' | 'REJECTED') {
        setBusyId(id)
        const result = await postJson(`/api/ticket/${id}/review`, {
            status,
            resolutionNote: notes[id]?.trim() || null,
        })
        setBusyId(null)

        if (!result.ok) {
            toast.add({ type: 'error', title: 'Gagal meninjau tiket', description: result.message })
            return
        }

        toast.add({
            type: 'success',
            title: status === 'RESOLVED' ? 'Tiket diselesaikan' : 'Tiket ditolak',
        })
        reload()
    }

    return (
        <AdminPanel
            title="Tiket Bantuan"
            description="Tiket dari pengguna. Menutupnya sekali; catatan hanya untuk admin."
            onRefresh={reload}
        >
            {state.status === 'loading' && <QueueLoading label="Memuat tiket…" />}
            {state.status === 'forbidden' && <QueueForbidden />}
            {state.status === 'error' && <QueueError message={state.message} onRetry={reload} />}
            {state.status === 'ready' && state.items.length === 0 && (
                <QueueEmpty message="Tidak ada tiket yang menunggu." />
            )}

            {state.status === 'ready' && state.items.length > 0 && (
                <div className="space-y-3">
                    {state.items.map((ticket) => (
                        <Card key={ticket.id}>
                            <CardHeader>
                                <CardTitle>{ticket.subject}</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    {ticket.requester.name} · {ticket.requester.email}
                                </p>
                            </CardHeader>

                            <CardContent>
                                <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>

                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <Badge variant="secondary">
                                        {ticketStatusLabel(ticket.status)}
                                    </Badge>
                                    <Badge variant="outline">
                                        {ticketCategoryLabel(ticket.category)}
                                    </Badge>
                                </div>

                                {ticket.status === 'REVIEW' ? (
                                    <div className="space-y-2">
                                        <Textarea
                                            placeholder="Catatan penyelesaian (opsional)"
                                            value={notes[ticket.id] ?? ''}
                                            onChange={(event) =>
                                                setNotes((old) => ({
                                                    ...old,
                                                    [ticket.id]: event.target.value,
                                                }))
                                            }
                                        />

                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                size="sm"
                                                disabled={busyId === ticket.id}
                                                onClick={() => decide(ticket.id, 'RESOLVED')}
                                            >
                                                {busyId === ticket.id && (
                                                    <Loader2 className="animate-spin" />
                                                )}
                                                Selesaikan
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={busyId === ticket.id}
                                                onClick={() => decide(ticket.id, 'REJECTED')}
                                            >
                                                Tolak
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        {ticket.resolutionNote
                                            ? `Catatan: ${ticket.resolutionNote}`
                                            : 'Sudah ditinjau.'}
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
