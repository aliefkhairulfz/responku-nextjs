'use client'

import { useForm } from '@tanstack/react-form'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '../ui/badge'

const TOPIC_CATEGORIES = [
    'Fintech & Perbankan',
    'Konsumen & Retail',
    'Pendidikan & Akademik',
    'Kesehatan & Gaya Hidup',
    'Teknologi & Internet',
] as const

const formSchema = z.object({
    title: z
        .string()
        .min(1, 'Judul kuesioner wajib diisi.')
        .max(120, 'Judul maksimal 120 karakter.'),
    description: z.string().max(1000, 'Deskripsi maksimal 1000 karakter.'),
    category: z.enum(TOPIC_CATEGORIES, 'Pilih kategori topik.'),
    estimatedMinutes: z
        .number('Durasi harus berupa angka.')
        .int('Durasi harus bilangan bulat.')
        .min(1, 'Minimal 1 menit.')
        .max(180, 'Maksimal 180 menit.'),
})

export default function IdentitasKuesioner() {
    const form = useForm({
        defaultValues: {
            title: '',
            description: '',
            category: '' as (typeof TOPIC_CATEGORIES)[number],
            estimatedMinutes: 10,
        },
        validators: {
            onSubmit: formSchema,
        },
        onSubmit: async ({ value }) => {
            // TODO: kirim ke API
            console.log(value)
        },
    })

    return (
        <Card className="w-full">
            <CardHeader className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                    <h3 className="text-xl font-semibold leading-snug">
                        Identitas &amp; Konsep Kuesioner
                    </h3>
                    <p className="leading-relaxed text-muted-foreground">
                        Informasi ini akan muncul di kartu feed calon responden Anda.
                    </p>
                </div>

                <Badge variant="secondary">Standar Akademik</Badge>
            </CardHeader>
            <CardContent>
                <form
                    id="form-questionnaire-identity"
                    onSubmit={(e) => {
                        e.preventDefault()
                        form.handleSubmit()
                    }}
                    className="space-y-4"
                >
                    {/* Judul */}
                    <form.Field name="title">
                        {(field) => {
                            const isInvalid =
                                field.state.meta.isTouched && !field.state.meta.isValid
                            return (
                                <Field data-invalid={isInvalid}>
                                    <FieldLabel htmlFor="questionnaire-title">
                                        Judul Kuesioner Riset *
                                    </FieldLabel>
                                    <Input
                                        id="questionnaire-title"
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                        aria-invalid={isInvalid}
                                        placeholder="Contoh: Pengaruh QRIS terhadap perilaku belanja mahasiswa"
                                    />
                                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                </Field>
                            )
                        }}
                    </form.Field>

                    {/* Deskripsi */}
                    <form.Field name="description">
                        {(field) => {
                            const isInvalid =
                                field.state.meta.isTouched && !field.state.meta.isValid
                            return (
                                <Field data-invalid={isInvalid}>
                                    <FieldLabel htmlFor="questionnaire-description">
                                        Deskripsi &amp; Pengantar Riset
                                    </FieldLabel>
                                    <Textarea
                                        id="questionnaire-description"
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                        aria-invalid={isInvalid}
                                        rows={5}
                                        placeholder="Jelaskan tujuan riset, institusi, dan bagaimana data responden akan digunakan."
                                    />
                                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                </Field>
                            )
                        }}
                    </form.Field>

                    <div className="flex items-start space-x-4">
                        {/* Kategori */}
                        <form.Field name="category">
                            {(field) => {
                                const isInvalid =
                                    field.state.meta.isTouched && !field.state.meta.isValid
                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor="questionnaire-category">
                                            Kategori Topik
                                        </FieldLabel>
                                        <Select
                                            name={field.name}
                                            value={field.state.value}
                                            onValueChange={(value) =>
                                                field.handleChange(
                                                    value as (typeof TOPIC_CATEGORIES)[number],
                                                )
                                            }
                                        >
                                            <SelectTrigger
                                                id="questionnaire-category"
                                                aria-invalid={isInvalid}
                                                onBlur={field.handleBlur}
                                                className="w-full"
                                            >
                                                <SelectValue placeholder="Pilih kategori topik" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {TOPIC_CATEGORIES.map((category) => (
                                                    <SelectItem key={category} value={category}>
                                                        {category}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {isInvalid && (
                                            <FieldError errors={field.state.meta.errors} />
                                        )}
                                    </Field>
                                )
                            }}
                        </form.Field>

                        {/* Durasi */}
                        <form.Field name="estimatedMinutes">
                            {(field) => {
                                const isInvalid =
                                    field.state.meta.isTouched && !field.state.meta.isValid
                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor="questionnaire-duration">
                                            Estimasi Durasi Pengerjaan
                                        </FieldLabel>
                                        <Input
                                            id="questionnaire-duration"
                                            name={field.name}
                                            type="number"
                                            inputMode="numeric"
                                            min={1}
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) =>
                                                field.handleChange(e.target.valueAsNumber)
                                            }
                                            aria-invalid={isInvalid}
                                        />
                                        <FieldDescription>Menit per responden.</FieldDescription>
                                        {isInvalid && (
                                            <FieldError errors={field.state.meta.errors} />
                                        )}
                                    </Field>
                                )
                            }}
                        </form.Field>
                    </div>
                </form>
            </CardContent>
            <CardFooter>
                <Field orientation="horizontal">
                    <Button type="button" variant="outline" onClick={() => form.reset()}>
                        Reset
                    </Button>
                    <Button type="submit" form="form-questionnaire-identity">
                        Simpan
                    </Button>
                </Field>
            </CardFooter>
        </Card>
    )
}
