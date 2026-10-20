'use client'

import { useForm } from '@tanstack/react-form'
import { Info } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

const demographicSchema = z
    .object({
        gender: z.enum(['male', 'female'], {
            error: 'Pilih jenis kelamin.',
        }),
        education: z.enum(['high_school', 'diploma', 'bachelor', 'master', 'doctorate'], {
            error: 'Pilih pendidikan terakhir.',
        }),
        province: z.string().trim().min(1, 'Provinsi wajib dipilih.'),
        city: z.string().trim().min(1, 'Kota atau kabupaten wajib dipilih.'),
        occupation: z.string().trim().min(1, 'Pekerjaan wajib diisi.'),
        religion: z
            .enum(['islam', 'protestant', 'catholic', 'hindu', 'buddhist', 'confucian'])
            .optional(),
        religionConsent: z.boolean(),
    })
    .refine((data) => !data.religion || data.religionConsent, {
        path: ['religionConsent'],
        error: 'Persetujuan diperlukan untuk memproses data agama.',
    })

type DemographicFormValues = z.infer<typeof demographicSchema>
type DemographicFormInput = {
    gender: DemographicFormValues['gender'] | ''
    education: DemographicFormValues['education'] | ''
    province: string
    city: string
    occupation: string
    religion?: DemographicFormValues['religion']
    religionConsent: boolean
}

const educationOptions = [
    { value: 'high_school', label: 'SMA / SMK' },
    { value: 'diploma', label: 'Diploma (D3)' },
    { value: 'bachelor', label: 'S1 / Sarjana' },
    { value: 'master', label: 'S2 / Magister' },
    { value: 'doctorate', label: 'S3 / Doktoral' },
] as const

const religionOptions = [
    { value: 'islam', label: 'Islam' },
    { value: 'protestant', label: 'Kristen Protestan' },
    { value: 'catholic', label: 'Katolik' },
    { value: 'hindu', label: 'Hindu' },
    { value: 'buddhist', label: 'Buddha' },
    { value: 'confucian', label: 'Konghucu' },
] as const

function FieldErrors({ errors }: { errors: unknown[] }) {
    if (errors.length === 0) return null

    return (
        <div className="space-y-1">
            {errors.map((error, index) => (
                <p className="text-sm text-destructive" key={index}>
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

export default function ProfilDemografi() {
    const form = useForm({
        defaultValues: {
            gender: '',
            education: '',
            province: '',
            city: '',
            occupation: '',
            religion: undefined,
            religionConsent: false,
        } satisfies DemographicFormInput as DemographicFormInput,
        validators: {
            onSubmit: demographicSchema,
        },
        onSubmit: async ({ value }) => {
            const parsed = demographicSchema.parse(value)
            console.log(parsed)
        },
    })

    return (
        <div>
            <div>
                <h3 className="text-xl font-semibold leading-snug">Profil Demografi</h3>
                <p className="leading-relaxed text-muted-foreground">
                    Data digunakan untuk mencocokkan survei secara anonim tanpa membuka identitas ke
                    peneliti.
                </p>
            </div>

            <Separator className="my-4" />

            <form
                className="space-y-6"
                onSubmit={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    form.handleSubmit()
                }}
            >
                <form.Field name="gender">
                    {(field) => (
                        <div className="space-y-2">
                            <Label>Jenis Kelamin</Label>

                            <RadioGroup
                                value={field.state.value}
                                onValueChange={(value) =>
                                    field.handleChange(value as 'male' | 'female')
                                }
                                onBlur={field.handleBlur}
                            >
                                <div className="flex items-center gap-2">
                                    <RadioGroupItem value="male" id="gender-male" />
                                    <Label htmlFor="gender-male">Laki-laki</Label>
                                </div>

                                <div className="flex items-center gap-2">
                                    <RadioGroupItem value="female" id="gender-female" />
                                    <Label htmlFor="gender-female">Perempuan</Label>
                                </div>
                            </RadioGroup>

                            <FieldErrors errors={field.state.meta.errors} />
                        </div>
                    )}
                </form.Field>

                <form.Field name="education">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor="education">Pendidikan Terakhir</Label>

                            <Select
                                value={field.state.value}
                                onValueChange={(value) =>
                                    field.handleChange(value as DemographicFormValues['education'])
                                }
                            >
                                <SelectTrigger id="education" className="w-full">
                                    <SelectValue placeholder="Pilih pendidikan terakhir" />
                                </SelectTrigger>

                                <SelectContent>
                                    {educationOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <FieldErrors errors={field.state.meta.errors} />
                        </div>
                    )}
                </form.Field>

                <form.Field name="province">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor="province">Provinsi Domisili</Label>

                            <Input
                                id="province"
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(event) => field.handleChange(event.target.value)}
                                placeholder="Masukkan provinsi"
                            />

                            <FieldErrors errors={field.state.meta.errors} />
                        </div>
                    )}
                </form.Field>

                <form.Field name="city">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor="city">Kota / Kabupaten</Label>

                            <Input
                                id="city"
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(event) => field.handleChange(event.target.value)}
                                placeholder="Masukkan kota atau kabupaten"
                            />

                            <FieldErrors errors={field.state.meta.errors} />
                        </div>
                    )}
                </form.Field>

                <form.Field name="occupation">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor="occupation">Pekerjaan / Bidang</Label>

                            <Input
                                id="occupation"
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(event) => field.handleChange(event.target.value)}
                                placeholder="Masukkan pekerjaan atau bidang"
                            />

                            <FieldErrors errors={field.state.meta.errors} />
                        </div>
                    )}
                </form.Field>

                <Separator className="my-4" />

                <div className="space-y-1">
                    <h3 className="flex items-center gap-2 font-semibold">
                        <Info className="size-4" />
                        Data Sensitif (UU PDP)
                    </h3>

                    <p className="text-sm text-muted-foreground">
                        Data agama bersifat opsional. Hanya digunakan untuk algoritma matching riset
                        keagamaan.
                    </p>
                </div>

                <form.Field name="religion">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor="religion">Agama (Opsional)</Label>

                            <Select
                                value={field.state.value ?? ''}
                                onValueChange={(value) => {
                                    field.handleChange(value as DemographicFormValues['religion'])

                                    if (value) {
                                        form.setFieldValue('religionConsent', false)
                                    } else {
                                        form.setFieldValue('religionConsent', false)
                                    }
                                }}
                            >
                                <SelectTrigger id="religion" className="w-full">
                                    <SelectValue placeholder="Pilih agama (opsional)" />
                                </SelectTrigger>

                                <SelectContent>
                                    {religionOptions.map((option) => (
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
                    {(field) => (
                        <div className="space-y-2">
                            <div className="flex items-start gap-2">
                                <Checkbox
                                    id="religionConsent"
                                    checked={field.state.value}
                                    onCheckedChange={(checked) =>
                                        field.handleChange(checked === true)
                                    }
                                />

                                <Label
                                    htmlFor="religionConsent"
                                    className="font-normal leading-relaxed"
                                >
                                    Saya memberikan persetujuan eksplisit untuk pemrosesan data
                                    agama dalam penapisan riset ilmiah.
                                </Label>
                            </div>

                            <FieldErrors errors={field.state.meta.errors} />
                        </div>
                    )}
                </form.Field>

                <Separator className="my-4" />

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
