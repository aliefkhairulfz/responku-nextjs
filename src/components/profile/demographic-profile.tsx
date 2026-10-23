"use client"

import { useForm } from "@tanstack/react-form"
import { BadgeCheck, Info, LocateFixed, Loader2 } from "lucide-react"
import { useState } from "react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/toast"
import { patchJson } from "@/lib/api-client"
import type { UserProfile } from "@/lib/api-types"
import { hasFieldError, toFieldErrors } from "@/lib/form-error"
import { EDUCATIONS, EDUCATION_ITEMS, GENDERS, GENDER_ITEMS, RELIGIONS, RELIGION_ITEMS, type Gender } from "@/lib/profile-vocabulary"

/* ========== Validasi ========== */

const within = (raw: string, limit: number) => Number.isFinite(Number(raw)) && Math.abs(Number(raw)) <= limit

/**
 * The coordinates are strings in the form but numbers in the request: an empty
 * number input reads as `0`, which would silently save the Gulf of Guinea as
 * someone's domicile.
 */
const demographicSchema = z
    .object({
        gender: z.enum(GENDERS, { error: "Pilih jenis kelamin." }),
        education: z.enum(EDUCATIONS, { error: "Pilih pendidikan terakhir." }),
        province: z.string().trim().min(1, "Provinsi wajib diisi.").max(100, "Provinsi maksimal 100 karakter."),
        city: z.string().trim().min(1, "Kota atau kabupaten wajib diisi.").max(100, "Kota maksimal 100 karakter."),
        occupation: z.string().trim().min(1, "Pekerjaan wajib diisi.").max(100, "Pekerjaan maksimal 100 karakter."),
        latitude: z
            .string()
            .trim()
            .min(1, "Tentukan koordinat domisili dulu.")
            .refine((raw) => within(raw, 90), "Latitude harus antara -90 dan 90."),
        longitude: z
            .string()
            .trim()
            .min(1, "Tentukan koordinat domisili dulu.")
            .refine((raw) => within(raw, 180), "Longitude harus antara -180 dan 180."),
        religion: z.enum(RELIGIONS).optional(),
        religionConsent: z.boolean(),
    })
    .refine((values) => !values.religion || values.religionConsent, {
        path: ["religionConsent"],
        error: "Persetujuan diperlukan untuk memproses data agama.",
    })

type DemographicValues = z.infer<typeof demographicSchema>

type DemographicInput = {
    gender: Gender | ""
    education: DemographicValues["education"] | ""
    province: string
    city: string
    occupation: string
    latitude: string
    longitude: string
    religion?: DemographicValues["religion"]
    religionConsent: boolean
}

/** Stored value to a form value, so an unexpected string cannot be handed to a select. */
function asOption<T extends string>(values: readonly T[], value: string | null | undefined): T | "" {
    return values.find((item) => item === value) ?? ""
}

function toFormValues(profile: UserProfile | null): DemographicInput {
    return {
        gender: asOption(GENDERS, profile?.gender),
        education: asOption(EDUCATIONS, profile?.education),
        province: profile?.province ?? "",
        city: profile?.city ?? "",
        occupation: profile?.occupation ?? "",
        latitude: profile ? String(profile.latitude) : "",
        longitude: profile ? String(profile.longitude) : "",
        religion: asOption(RELIGIONS, profile?.religion) || undefined,
        religionConsent: profile?.religionConsent ?? false,
    }
}

/* ========== Halaman ========== */

export default function DemographicProfile({
    initialProfile,
    onSaved,
}: {
    initialProfile: UserProfile | null
    onSaved: (profile: UserProfile) => void
}) {
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [locating, setLocating] = useState(false)
    const [locationError, setLocationError] = useState<string | null>(null)

    const form = useForm({
        defaultValues: toFormValues(initialProfile) satisfies DemographicInput as DemographicInput,
        validators: { onSubmit: demographicSchema },
        onSubmit: async ({ value }) => {
            setFieldErrors({})

            const result = await patchJson<{ profile: UserProfile }>("/api/user/profile", {
                gender: value.gender,
                education: value.education,
                province: value.province.trim(),
                city: value.city.trim(),
                occupation: value.occupation.trim(),
                latitude: Number(value.latitude),
                longitude: Number(value.longitude),
                // Consent off clears the religion in the same request — the API refuses
                // a religion that would be left without consent.
                religion: value.religionConsent ? (value.religion ?? null) : null,
                religionConsent: value.religionConsent,
            })

            if (!result.ok) {
                setFieldErrors(result.errors)

                // When the API names fields, those messages are the useful part — a toast
                // would only repeat "Validation failed" next to them.
                if (Object.keys(result.errors).length === 0) {
                    toast.add({ type: "error", title: "Profil gagal disimpan", description: result.message })
                }

                return
            }

            toast.add({ type: "success", title: "Profil tersimpan", description: "Data demografi kamu sudah diperbarui." })
            if (result.data?.profile) onSaved(result.data.profile)
        },
    })

    /** Fills the coordinates from the browser, since typing them is not realistic. */
    function useCurrentLocation() {
        if (!("geolocation" in navigator)) {
            setLocationError("Perangkat ini tidak mendukung geolokasi.")
            return
        }

        setLocating(true)
        setLocationError(null)

        navigator.geolocation.getCurrentPosition(
            (position) => {
                form.setFieldValue("latitude", String(position.coords.latitude))
                form.setFieldValue("longitude", String(position.coords.longitude))
                setLocating(false)
            },
            () => {
                setLocationError("Izin lokasi ditolak atau lokasi tidak tersedia.")
                setLocating(false)
            },
        )
    }

    return (
        <div>
            <div>
                <h3 className="text-xl leading-snug font-semibold">Profil Demografi</h3>
                <p className="leading-relaxed text-muted-foreground">
                    Data digunakan untuk mencocokkan survei secara anonim tanpa membuka identitas ke peneliti.
                </p>
            </div>

            <Separator className="my-4" />

            <form
                className="space-y-6"
                noValidate
                onSubmit={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    form.handleSubmit()
                }}
            >
                <form.Field name="gender">
                    {(field) => {
                        const messages = [...field.state.meta.errors, fieldErrors.gender]

                        return (
                            <div className="space-y-2">
                                <Label>Jenis Kelamin</Label>

                                <RadioGroup
                                    value={field.state.value}
                                    onValueChange={(value) => field.handleChange(value as DemographicInput["gender"])}
                                    onBlur={field.handleBlur}
                                >
                                    {GENDER_ITEMS.map((option) => (
                                        <div key={option.value} className="flex items-center gap-2">
                                            <RadioGroupItem value={option.value} id={`gender-${option.value}`} />
                                            <Label htmlFor={`gender-${option.value}`}>{option.label}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>

                                <FieldError errors={toFieldErrors(messages)} />
                            </div>
                        )
                    }}
                </form.Field>

                <form.Field name="education">
                    {(field) => {
                        const messages = [...field.state.meta.errors, fieldErrors.education]

                        return (
                            <div className="space-y-2">
                                <Label htmlFor="education">Pendidikan Terakhir</Label>

                                <Select
                                    value={field.state.value}
                                    onValueChange={(value) => field.handleChange(value as DemographicValues["education"])}
                                >
                                    <SelectTrigger id="education" className="w-full" aria-invalid={hasFieldError(messages)}>
                                        <SelectValue placeholder="Pilih pendidikan terakhir" />
                                    </SelectTrigger>

                                    <SelectContent>
                                        {EDUCATION_ITEMS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <FieldError errors={toFieldErrors(messages)} />
                            </div>
                        )
                    }}
                </form.Field>

                <form.Field name="province">
                    {(field) => {
                        const messages = [...field.state.meta.errors, fieldErrors.province]

                        return (
                            <div className="space-y-2">
                                <Label htmlFor="province">Provinsi Domisili</Label>

                                <Input
                                    id="province"
                                    name={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                    placeholder="Masukkan provinsi"
                                    aria-invalid={hasFieldError(messages)}
                                />

                                <FieldError errors={toFieldErrors(messages)} />
                            </div>
                        )
                    }}
                </form.Field>

                <form.Field name="city">
                    {(field) => {
                        const messages = [...field.state.meta.errors, fieldErrors.city]

                        return (
                            <div className="space-y-2">
                                <Label htmlFor="city">Kota / Kabupaten</Label>

                                <Input
                                    id="city"
                                    name={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                    placeholder="Masukkan kota atau kabupaten"
                                    aria-invalid={hasFieldError(messages)}
                                />

                                <FieldError errors={toFieldErrors(messages)} />
                            </div>
                        )
                    }}
                </form.Field>

                <form.Field name="occupation">
                    {(field) => {
                        const messages = [...field.state.meta.errors, fieldErrors.occupation]

                        return (
                            <div className="space-y-2">
                                <Label htmlFor="occupation">Pekerjaan / Bidang</Label>

                                <Input
                                    id="occupation"
                                    name={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                    placeholder="Masukkan pekerjaan atau bidang"
                                    aria-invalid={hasFieldError(messages)}
                                />

                                <FieldError errors={toFieldErrors(messages)} />
                            </div>
                        )
                    }}
                </form.Field>

                {/* The API requires coordinates on the first save, so the form has to ask. */}
                <section className="space-y-3">
                    <div className="space-y-1">
                        <h4 className="flex items-center gap-2 font-medium">
                            <LocateFixed className="size-4" />
                            Koordinat Domisili
                        </h4>
                        <p className="text-sm text-muted-foreground">
                            Dipakai untuk memverifikasi domisili dan mencocokkan riset di sekitar kamu. Ambil dari perangkat agar tidak perlu diisi
                            manual.
                        </p>
                    </div>

                    <Button type="button" variant="outline" size="sm" disabled={locating} onClick={useCurrentLocation}>
                        {locating ? <Loader2 className="animate-spin" /> : <LocateFixed />}
                        {locating ? "Mencari lokasi…" : "Gunakan lokasi saat ini"}
                    </Button>

                    {locationError && <p className="text-sm text-destructive">{locationError}</p>}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <form.Field name="latitude">
                            {(field) => {
                                const messages = [...field.state.meta.errors, fieldErrors.latitude]

                                return (
                                    <div className="space-y-2">
                                        <Label htmlFor="latitude">Latitude</Label>

                                        <Input
                                            id="latitude"
                                            name={field.name}
                                            type="number"
                                            step="any"
                                            inputMode="decimal"
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(event) => field.handleChange(event.target.value)}
                                            placeholder="-6.261493"
                                            aria-invalid={hasFieldError(messages)}
                                        />

                                        <FieldError errors={toFieldErrors(messages)} />
                                    </div>
                                )
                            }}
                        </form.Field>

                        <form.Field name="longitude">
                            {(field) => {
                                const messages = [...field.state.meta.errors, fieldErrors.longitude]

                                return (
                                    <div className="space-y-2">
                                        <Label htmlFor="longitude">Longitude</Label>

                                        <Input
                                            id="longitude"
                                            name={field.name}
                                            type="number"
                                            step="any"
                                            inputMode="decimal"
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(event) => field.handleChange(event.target.value)}
                                            placeholder="106.8106"
                                            aria-invalid={hasFieldError(messages)}
                                        />

                                        <FieldError errors={toFieldErrors(messages)} />
                                    </div>
                                )
                            }}
                        </form.Field>
                    </div>

                    {initialProfile && (
                        <p className="text-sm text-muted-foreground">
                            {initialProfile.domicileVerified ? (
                                <span className="inline-flex items-center gap-1.5 font-medium text-success">
                                    <BadgeCheck className="size-4" />
                                    Domisili sudah terverifikasi
                                </span>
                            ) : (
                                "Domisili belum diverifikasi."
                            )}
                        </p>
                    )}
                </section>

                <Separator className="my-4" />

                <div className="space-y-1">
                    <h3 className="flex items-center gap-2 font-semibold">
                        <Info className="size-4" />
                        Data Sensitif (UU PDP)
                    </h3>

                    <p className="text-sm text-muted-foreground">
                        Data agama bersifat opsional. Hanya digunakan untuk algoritma matching riset keagamaan.
                    </p>
                </div>

                <form.Field name="religion">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor="religion">Agama (Opsional)</Label>

                            <Select
                                value={field.state.value ?? ""}
                                onValueChange={(value) => field.handleChange(value as DemographicValues["religion"])}
                            >
                                <SelectTrigger id="religion" className="w-full">
                                    <SelectValue placeholder="Pilih agama (opsional)" />
                                </SelectTrigger>

                                <SelectContent>
                                    {RELIGION_ITEMS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </form.Field>

                <form.Field name="religionConsent">
                    {(field) => {
                        const messages = [...field.state.meta.errors, fieldErrors.religionConsent]

                        return (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="religionConsent"
                                        checked={field.state.value}
                                        onCheckedChange={(checked) => field.handleChange(checked === true)}
                                    />

                                    <Label htmlFor="religionConsent" className="leading-relaxed font-normal">
                                        Saya memberikan persetujuan eksplisit untuk pemrosesan data agama dalam penapisan riset ilmiah.
                                    </Label>
                                </div>

                                <FieldError errors={toFieldErrors(messages)} />
                            </div>
                        )
                    }}
                </form.Field>

                <Separator className="my-4" />

                <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
                    {([canSubmit, isSubmitting]) => (
                        <Button type="submit" disabled={!canSubmit || isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="animate-spin" />
                                    Menyimpan…
                                </>
                            ) : (
                                "Simpan Perubahan"
                            )}
                        </Button>
                    )}
                </form.Subscribe>
            </form>
        </div>
    )
}
