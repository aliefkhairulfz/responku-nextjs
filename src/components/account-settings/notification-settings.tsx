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
 * Every toggle here is one field of `settings`, so the group's keys double as the
 * request body: no mapping layer to keep in step with the API.
 */
const notificationGroups = [
    {
        title: "Channel Notifikasi",
        options: [
            {
                key: "notifyEmail",
                label: "Notifikasi Email",
                description: "Terima update melalui email terdaftar",
            },
            {
                key: "notifyPush",
                label: "Push Notification",
                description: "Notifikasi langsung di browser",
            },
        ],
    },
    {
        title: "Jenis Notifikasi",
        options: [
            {
                key: "notifySurveyReminder",
                label: "Pengingat Survei",
                description: "Reminder untuk survei yang belum dikerjakan",
            },
            {
                key: "notifyReward",
                label: "Reward & Pencairan",
                description: "Notifikasi saat token reward masuk atau dicairkan",
            },
            {
                key: "notifyWeeklySummary",
                label: "Ringkasan Mingguan",
                description: "Email digest mingguan aktivitas akun",
            },
            {
                key: "notifyPromotion",
                label: "Info & Promo",
                description: "Update produk, tips, dan penawaran khusus",
            },
        ],
    },
] as const

type NotificationKey = (typeof notificationGroups)[number]["options"][number]["key"]

export default function NotificationSettings({ settings, onSaved }: { settings: AccountSettings; onSaved: (settings: AccountSettings) => void }) {
    const [preferences, setPreferences] = useState<Record<NotificationKey, boolean>>({
        notifyEmail: settings.notifyEmail,
        notifyPush: settings.notifyPush,
        notifySurveyReminder: settings.notifySurveyReminder,
        notifyReward: settings.notifyReward,
        notifyWeeklySummary: settings.notifyWeeklySummary,
        notifyPromotion: settings.notifyPromotion,
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

        toast.add({ type: "success", title: "Preferensi tersimpan", description: "Preferensi notifikasi sudah diperbarui." })
        if (result.data?.settings) onSaved(result.data.settings)
    }

    return (
        <div>
            <h3 className="text-xl leading-snug font-semibold">Preferensi Notifikasi</h3>
            <p className="leading-relaxed text-muted-foreground">Kontrol jenis notifikasi yang ingin Anda terima.</p>

            <Separator className="my-4" />

            <div className="max-w-xl space-y-6">
                {notificationGroups.map((group, groupIndex) => (
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

                        {groupIndex < notificationGroups.length - 1 && <Separator className="mt-6" />}
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
