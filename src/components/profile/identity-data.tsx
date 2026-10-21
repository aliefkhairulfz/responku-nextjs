'use client'

import { useForm } from '@tanstack/react-form'
import { Camera, CheckCircle2, ClipboardList, ShieldCheck, Star, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

const identitySchema = z.object({
    name: z.string().trim().min(1, 'Nama lengkap wajib diisi.'),
    email: z.string().trim().email('Alamat email tidak valid.'),
    phone: z.string().trim().min(1, 'Nomor telepon wajib diisi.'),
})

type IdentityFormValues = z.infer<typeof identitySchema>

const MAX_FILE_SIZE = 2 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function FieldErrors({ errors }: { errors: unknown[] }) {
    if (errors.length === 0) return null

    return (
        <div className="space-y-1">
            {errors.map((error, index) => (
                <p key={index} className="text-sm text-destructive">
                    {typeof error === 'string'
                        ? error
                        : error && typeof error === 'object' && 'message' in error
                          ? String(error.message)
                          : 'Input tidak valid.'}
                </p>
            ))}
        </div>
    )
}

export default function IdentityForm() {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [photo, setPhoto] = useState<string | null>(null)
    const [photoError, setPhotoError] = useState('')

    // Contoh statistik; nantinya ganti dengan data dari API.
    const stats = {
        qualityScore: 98,
        completedSurveys: 24,
        verificationStatus: 'Terverifikasi',
    }

    const form = useForm({
        defaultValues: {
            name: '',
            email: '',
            phone: '',
        } as IdentityFormValues,
        validators: {
            onSubmit: identitySchema,
        },
        onSubmit: async ({ value }) => {
            console.log(value)
            // Kirim data dan file foto ke backend di sini.
        },
    })

    const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setPhotoError('')

        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
            setPhotoError('Gunakan foto berformat JPG, PNG, atau WebP.')
            event.target.value = ''
            return
        }

        if (file.size > MAX_FILE_SIZE) {
            setPhotoError('Ukuran foto maksimal 2 MB.')
            event.target.value = ''
            return
        }

        const reader = new FileReader()

        reader.onload = () => {
            if (typeof reader.result === 'string') {
                setPhoto(reader.result)
            }
        }

        reader.readAsDataURL(file)
    }

    const handleRemovePhoto = () => {
        setPhoto(null)
        setPhotoError('')

        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    return (
        <div>
            <div>
                <h3 className="text-xl font-semibold leading-snug">Informasi Dasar</h3>
                <p className="leading-relaxed text-muted-foreground">
                    Kelola foto, identitas, dan informasi akun Anda.
                </p>
            </div>

            <Separator className="my-4" />

            <div className="space-y-6">
                {/* Foto profil */}
                <section className="space-y-3">
                    <p className="leading-relaxed text-muted-foreground">Foto Profil</p>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted">
                            {photo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={photo}
                                    alt="Preview foto profil"
                                    className="size-full object-cover"
                                />
                            ) : (
                                <span className="text-2xl font-semibold text-muted-foreground">
                                    BS
                                </span>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex flex-wrap gap-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    onChange={handlePhotoChange}
                                />

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Camera />
                                    {photo ? 'Ganti Foto' : 'Upload Foto'}
                                </Button>

                                {photo && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={handleRemovePhoto}
                                    >
                                        <Trash2 />
                                        Hapus
                                    </Button>
                                )}
                            </div>

                            <p className="text-xs text-muted-foreground">
                                JPG, PNG, atau WebP. Maksimal 2 MB.
                            </p>

                            {photoError && <p className="text-sm text-destructive">{photoError}</p>}
                        </div>
                    </div>
                </section>

                <Separator />

                {/* Statistik responden */}
                <section className="space-y-3">
                    <p className="leading-relaxed text-muted-foreground">Statistik Responden</p>

                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-2 rounded-lg border p-4">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Star className="size-4" />
                                <span className="text-sm">Skor Kualitas</span>
                            </div>

                            <p className="text-2xl font-semibold">{stats.qualityScore}%</p>

                            <p className="text-xs text-muted-foreground">Sangat Baik</p>
                        </div>

                        <div className="space-y-2 rounded-lg border p-4">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <ClipboardList className="size-4" />
                                <span className="text-sm">Survei Selesai</span>
                            </div>

                            <p className="text-2xl font-semibold">{stats.completedSurveys}</p>

                            <p className="text-xs text-muted-foreground">Total survei</p>
                        </div>

                        <div className="space-y-2 rounded-lg border p-4">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <ShieldCheck className="size-4" />
                                <span className="text-sm">Status Akun</span>
                            </div>

                            <p className="flex items-center gap-1.5 text-sm font-semibold">
                                <CheckCircle2 className="size-4 text-green-600" />
                                {stats.verificationStatus}
                            </p>

                            <p className="text-xs text-muted-foreground">
                                Identitas telah diverifikasi
                            </p>
                        </div>
                    </div>
                </section>
            </div>

            <Separator className="my-4" />

            {/* Form identitas */}
            <form
                className="space-y-6"
                onSubmit={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    form.handleSubmit()
                }}
            >
                <form.Field name="name">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor={field.name}>Nama Lengkap</Label>
                            <Input
                                id={field.name}
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(event) => field.handleChange(event.target.value)}
                            />
                            <FieldErrors errors={field.state.meta.errors} />
                        </div>
                    )}
                </form.Field>

                <form.Field name="email">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor={field.name}>Alamat Email</Label>
                            <Input
                                id={field.name}
                                name={field.name}
                                type="email"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(event) => field.handleChange(event.target.value)}
                            />

                            <p className="flex items-center gap-1 text-sm text-muted-foreground">
                                <CheckCircle2 className="size-4 shrink-0" />
                                Email telah diverifikasi. Hubungi bantuan jika perlu mengganti.
                            </p>

                            <FieldErrors errors={field.state.meta.errors} />
                        </div>
                    )}
                </form.Field>

                <form.Field name="phone">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor={field.name}>Nomor WhatsApp / Telepon</Label>
                            <Input
                                id={field.name}
                                name={field.name}
                                type="tel"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(event) => field.handleChange(event.target.value)}
                            />
                            <FieldErrors errors={field.state.meta.errors} />
                        </div>
                    )}
                </form.Field>

                <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                    {([canSubmit, isSubmitting]) => (
                        <Button type="submit" disabled={!canSubmit || isSubmitting}>
                            {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </Button>
                    )}
                </form.Subscribe>
            </form>
        </div>
    )
}
