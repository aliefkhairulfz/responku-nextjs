'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'

const privacyGroups = [
    {
        title: 'Visibilitas',
        options: [
            {
                id: 'publicProfile',
                label: 'Profil Publik',
                description: 'Izinkan peneliti melihat nama dan badge Anda (tanpa data sensitif)',
            },
            {
                id: 'onlineStatus',
                label: 'Status Online',
                description: 'Tampilkan status aktif Anda kepada pengguna lain',
            },
        ],
    },
    {
        title: 'Keamanan',
        options: [
            {
                id: 'twoFactorAuth',
                label: 'Autentikasi Dua Faktor (2FA)',
                description: 'Tambahkan lapisan keamanan dengan OTP saat login',
            },
            {
                id: 'analyticsSharing',
                label: 'Bagikan Data Analitik',
                description: 'Bantu kami meningkatkan produk dengan data penggunaan anonim',
            },
        ],
    },
] as const

type PrivacyOption = (typeof privacyGroups)[number]['options'][number]['id']

export default function PrivasiKeamanan() {
    const [preferences, setPreferences] = useState<Record<PrivacyOption, boolean>>({
        publicProfile: true,
        onlineStatus: true,
        twoFactorAuth: false,
        analyticsSharing: false,
    })

    const handleSave = () => {
        console.log('Preferensi privasi dan keamanan:', preferences)
    }

    return (
        <div>
            <h3 className="text-xl font-semibold leading-snug">Privasi & Keamanan</h3>
            <p className="leading-relaxed text-muted-foreground">
                Kelola siapa yang bisa melihat data Anda dan tingkatkan keamanan akun.
            </p>

            <Separator className="my-4" />

            <div className="max-w-xl space-y-6">
                {privacyGroups.map((group, groupIndex) => (
                    <section key={group.title} className="space-y-6">
                        <h3 className="font-medium">{group.title}</h3>

                        <div className="space-y-5">
                            {group.options.map((option, index) => (
                                <div key={option.id}>
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <Label htmlFor={option.id} className="font-medium">
                                                {option.label}
                                            </Label>
                                            <p className="text-sm text-muted-foreground">
                                                {option.description}
                                            </p>
                                        </div>

                                        <Switch
                                            id={option.id}
                                            checked={preferences[option.id]}
                                            onCheckedChange={(checked) =>
                                                setPreferences((current) => ({
                                                    ...current,
                                                    [option.id]: checked,
                                                }))
                                            }
                                        />
                                    </div>

                                    {index < group.options.length - 1 && (
                                        <Separator className="mt-5" />
                                    )}
                                </div>
                            ))}
                        </div>

                        {groupIndex < privacyGroups.length - 1 && <Separator className="mt-6" />}
                    </section>
                ))}

                <Button onClick={handleSave}>Simpan Preferensi</Button>
            </div>
        </div>
    )
}
