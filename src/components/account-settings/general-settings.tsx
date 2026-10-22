"use client"

import { Loader2, Save } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
import { LANGUAGE_ITEMS, THEME_SELECT_ITEMS } from "@/lib/account-settings"
import { patchJson } from "@/lib/api-client"
import type { AccountSettings } from "@/lib/api-types"

/**
 * Display and language preferences.
 *
 * The form is seeded from the settings the account page already fetched, so opening the
 * tab costs no request. It is remounted on every tab switch, which is what lets plain
 * `useState` seed work without an effect trying to re-sync it.
 */
export default function GeneralSettings({ settings, onSaved }: { settings: AccountSettings; onSaved: (settings: AccountSettings) => void }) {
    const [language, setLanguage] = useState(settings.language)
    const [theme, setTheme] = useState(settings.theme)
    const [compactMode, setCompactMode] = useState(settings.compactMode)
    const [saving, setSaving] = useState(false)

    async function save() {
        setSaving(true)
        const result = await patchJson<{ settings: AccountSettings }>("/api/user/settings", { language, theme, compactMode })
        setSaving(false)

        // The controls can only produce values the API accepts, so a rejection here is a
        // server or network problem rather than something to point at a field.
        if (!result.ok) {
            toast.add({ type: "error", title: "Preferensi gagal disimpan", description: result.message })
            return
        }

        toast.add({ type: "success", title: "Preferensi tersimpan", description: "Pengaturan umum sudah diperbarui." })
        if (result.data?.settings) onSaved(result.data.settings)
    }

    return (
        <div>
            <h3 className="text-xl leading-snug font-semibold">Pengaturan Umum</h3>
            <p className="leading-relaxed text-muted-foreground">Sesuaikan preferensi tampilan dan bahasa.</p>

            <Separator className="my-4" />

            <div className="max-w-xl space-y-6">
                <section className="space-y-2">
                    <Label htmlFor="language">Bahasa Aplikasi</Label>
                    <p className="leading-relaxed text-muted-foreground">Pilih bahasa untuk antarmuka pengguna.</p>

                    <Select
                        value={language}
                        onValueChange={(value) => {
                            if (value !== null) setLanguage(value)
                        }}
                    >
                        <SelectTrigger id="language" className="w-full">
                            <SelectValue placeholder="Pilih bahasa" />
                        </SelectTrigger>
                        <SelectContent>
                            {LANGUAGE_ITEMS.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </section>

                <Separator />

                <section className="space-y-2">
                    <Label htmlFor="theme">Tema Tampilan</Label>
                    <p className="leading-relaxed text-muted-foreground">Pilih mode tampilan yang nyaman di mata.</p>

                    <Select
                        value={theme}
                        onValueChange={(value) => {
                            if (value !== null) setTheme(value)
                        }}
                    >
                        <SelectTrigger id="theme" className="w-full">
                            <SelectValue placeholder="Pilih tema" />
                        </SelectTrigger>
                        <SelectContent>
                            {THEME_SELECT_ITEMS.map((item) => (
                                <SelectItem key={item.value} value={item.value} disabled={item.disabled}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </section>

                <Separator />

                <section className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                        <Label htmlFor="compactMode">Mode Ringkas</Label>
                        <p className="leading-relaxed text-muted-foreground">Tampilkan lebih banyak konten dengan jarak antar elemen lebih kecil.</p>
                    </div>

                    <Switch id="compactMode" checked={compactMode} onCheckedChange={setCompactMode} />
                </section>

                <Separator />

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
