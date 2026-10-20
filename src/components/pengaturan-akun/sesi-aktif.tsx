'use client'

import { Monitor, Smartphone, Tablet } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const sessions = [
    {
        id: 1,
        device: 'Mac',
        browser: 'Chrome di macOS',
        location: 'Perangkat ini',
        lastActive: 'Sedang aktif',
        current: true,
        icon: Monitor,
    },
    {
        id: 2,
        device: 'Ponsel',
        browser: 'Chrome di Android',
        location: 'Lokasi tidak diketahui',
        lastActive: '2 hari yang lalu',
        current: false,
        icon: Smartphone,
    },
    {
        id: 3,
        device: 'Tablet',
        browser: 'Safari di iPadOS',
        location: 'Lokasi tidak diketahui',
        lastActive: '5 hari yang lalu',
        current: false,
        icon: Tablet,
    },
]

export default function SesiAktif() {
    return (
        <div>
            <h3 className="text-xl font-semibold leading-snug">Sesi Aktif</h3>
            <p className="leading-relaxed text-muted-foreground">
                Tinjau perangkat yang digunakan untuk mengakses akun Anda.
            </p>

            <Separator className="my-4" />

            <div className="max-w-2xl space-y-6">
                {sessions.map((session, index) => {
                    const Icon = session.icon

                    return (
                        <div key={session.id}>
                            <div className="flex items-start gap-3">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-md border">
                                    <Icon className="size-5 text-muted-foreground" />
                                </div>

                                <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-medium">{session.browser}</p>
                                        {session.current && (
                                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                                Perangkat ini
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-sm text-muted-foreground">
                                        {session.location}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {session.lastActive}
                                    </p>
                                </div>

                                {!session.current && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => console.log('Revoke session', session.id)}
                                    >
                                        Keluar
                                    </Button>
                                )}
                            </div>

                            {index < sessions.length - 1 && <Separator className="mt-4" />}
                        </div>
                    )
                })}

                <Separator />

                <Button
                    variant="destructive"
                    onClick={() => console.log('Revoke all other sessions requested')}
                >
                    Keluar dari Semua Perangkat Lain
                </Button>
            </div>
        </div>
    )
}
