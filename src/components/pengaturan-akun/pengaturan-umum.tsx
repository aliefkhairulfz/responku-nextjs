'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'

export default function PengaturanUmum() {
    const [language, setLanguage] = useState('id')
    const [theme, setTheme] = useState('light')
    const [compactMode, setCompactMode] = useState(false)

    const handleSave = () => {
        console.log({
            language,
            theme,
            compactMode,
        })
    }

    return (
        <div>
            <h3 className="text-xl font-semibold leading-snug">Pengaturan Umum </h3>
            <p className="leading-relaxed text-muted-foreground">
                Sesuaikan preferensi tampilan dan bahasa.
            </p>

            <Separator className="my-4" />

            <div className="max-w-xl space-y-6">
                <section className="space-y-2">
                    <Label htmlFor="language">Bahasa Aplikasi</Label>
                    <p className="leading-relaxed text-muted-foreground">
                        Pilih bahasa untuk antarmuka pengguna.
                    </p>

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
                            <SelectItem value="id">Bahasa Indonesia</SelectItem>
                            <SelectItem value="en">English</SelectItem>
                        </SelectContent>
                    </Select>
                </section>

                <Separator />

                <section className="space-y-2">
                    <Label htmlFor="theme">Tema Tampilan</Label>
                    <p className="leading-relaxed text-muted-foreground">
                        Pilih mode tampilan yang nyaman di mata.
                    </p>

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
                            <SelectItem value="light">Terang</SelectItem>
                            <SelectItem value="dark" disabled>
                                Gelap (Coming Soon)
                            </SelectItem>
                            <SelectItem value="system">Ikuti Sistem</SelectItem>
                        </SelectContent>
                    </Select>
                </section>

                <Separator />

                <section className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                        <Label htmlFor="compactMode">Mode Ringkas</Label>
                        <p className="leading-relaxed text-muted-foreground">
                            Tampilkan lebih banyak konten dengan jarak antar elemen lebih kecil.
                        </p>
                    </div>

                    <Switch
                        id="compactMode"
                        checked={compactMode}
                        onCheckedChange={setCompactMode}
                    />
                </section>

                <Separator />

                <Button onClick={handleSave}>Simpan Preferensi</Button>
            </div>
        </div>
    )
}
