"use client"

import { Loader2, Save } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
import { patchJson } from "@/lib/api-client"
import type { AccountSettings } from "@/lib/api-types"

/**
 * As on the notification tab, each key is a field of `settings`, so the group's keys are
 * the request body.
 *
 * `securityTwoFactorAuth` only records the intent — two-factor authentication is not
 * implemented, so turning this on does not add a login step.
 */
const privacyGroups = [
    {
        title: "Visibilitas",
        options: [
            {
                key: "privacyPublicProfile",
                label: "Profil Publik",
                description: "Izinkan peneliti melihat nama dan badge Anda (tanpa data sensitif)",
            },
            {
                key: "privacyOnlineStatus",
                label: "Status Online",
                description: "Tampilkan status aktif Anda kepada pengguna lain",
            },
        ],
    },
    {
        title: "Keamanan",
        options: [
            {
                key: "securityTwoFactorAuth",
                label: "Autentikasi Dua Faktor (2FA)",
                description: "Tambahkan lapisan keamanan dengan OTP saat login",
            },
            {
                key: "privacyAnalyticsSharing",
                label: "Bagikan Data Analitik",
                description: "Bantu kami meningkatkan produk dengan data penggunaan anonim",
            },
        ],
    },
] as const

type PrivacyKey = (typeof privacyGroups)[number]["options"][number]["key"]

export default function PrivacySecurity({ settings, onSaved }: { settings: AccountSettings; onSaved: (settings: AccountSettings) => void }) {
    const [preferences, setPreferences] = useState<Record<PrivacyKey, boolean>>({
        privacyPublicProfile: settings.privacyPublicProfile,
        privacyOnlineStatus: settings.privacyOnlineStatus,
        securityTwoFactorAuth: settings.securityTwoFactorAuth,
        privacyAnalyticsSharing: settings.privacyAnalyticsSharing,
    })
    const [saving, setSaving] = useState(false)

    async function save() {
        setSaving(true)
        const result = await patchJson<{ settings: AccountSettings }>("/api/user/settings", preferences)
        setSaving(false)

        if (!result.ok) {
            toast.add({ type: "error", title: "Preferensi gagal disimpan", description: result.message })
            return
        }

        toast.add({ type: "success", title: "Preferensi tersimpan", description: "Pengaturan privasi & keamanan sudah diperbarui." })
        if (result.data?.settings) onSaved(result.data.settings)
    }

    return (
        <div>
            <h3 className="text-xl leading-snug font-semibold">Privasi & Keamanan</h3>
            <p className="leading-relaxed text-muted-foreground">Kelola siapa yang bisa melihat data Anda dan tingkatkan keamanan akun.</p>

            <Separator className="my-4" />

            <div className="max-w-xl space-y-6">
                {privacyGroups.map((group, groupIndex) => (
                    <section key={group.title} className="space-y-6">
                        <h3 className="font-medium">{group.title}</h3>

                        <div className="space-y-5">
                            {group.options.map((option, index) => (
                                <div key={option.key}>
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <Label htmlFor={option.key} className="font-medium">
                                                {option.label}
                                            </Label>
                                            <p className="text-sm text-muted-foreground">{option.description}</p>
                                        </div>

                                        <Switch
                                            id={option.key}
                                            checked={preferences[option.key]}
                                            onCheckedChange={(checked) =>
                                                setPreferences((current) => ({
                                                    ...current,
                                                    [option.key]: checked,
                                                }))
                                            }
                                        />
                                    </div>

                                    {index < group.options.length - 1 && <Separator className="mt-5" />}
                                </div>
                            ))}
                        </div>

                        {groupIndex < privacyGroups.length - 1 && <Separator className="mt-6" />}
                    </section>
                ))}

                <Button disabled={saving} onClick={() => void save()}>
                    {saving ? (
                        <>
                            <Loader2 className="animate-spin" />
                            Menyimpan…
                        </>
                    ) : (
                        <>
                            <Save />
                            Simpan Preferensi
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}
