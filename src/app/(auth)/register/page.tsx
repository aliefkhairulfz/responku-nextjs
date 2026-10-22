"use client"

import { useForm } from "@tanstack/react-form"
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { postJson } from "@/lib/api-client"
import { hasFieldError, toFieldErrors } from "@/lib/form-error"

/* ========== Validasi ========== */

/**
 * Mirrors the API's rules for `POST /api/auth/register`, plus a confirmation field
 * the API has no use for but a sign-up form does — the password is never shown
 * back, so a typo has to be catchable before the account exists.
 */
const registerSchema = z
    .object({
        name: z.string().trim().min(1, "Nama wajib diisi.").max(100, "Nama maksimal 100 karakter."),
        email: z.string().trim().pipe(z.email("Masukkan alamat email yang valid.")),
        password: z.string().min(8, "Kata sandi minimal 8 karakter.").max(72, "Kata sandi maksimal 72 karakter."),
        confirmPassword: z.string().min(1, "Ulangi kata sandi."),
    })
    .refine((values) => values.password === values.confirmPassword, {
        path: ["confirmPassword"],
        error: "Kata sandi tidak cocok.",
    })

type RegisterValues = z.infer<typeof registerSchema>

type RegisterData = { user: { id: string; email: string }; verificationSent: boolean }

/** Where the OTP screen lives, and what it needs to know. */
function verifyUrl(email: string, verificationSent: boolean) {
    return `/register/verify?email=${encodeURIComponent(email)}&sent=${verificationSent ? "1" : "0"}`
}

/* ========== Halaman ========== */

export default function RegisterPage() {
    const router = useRouter()
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmation, setShowConfirmation] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [redirecting, setRedirecting] = useState(false)

    const form = useForm({
        defaultValues: { name: "", email: "", password: "", confirmPassword: "" } as RegisterValues,
        validators: { onSubmit: registerSchema },
        onSubmit: async ({ value }) => {
            setFormError(null)
            setFieldErrors({})

            const email = value.email.trim()

            // The confirmation field is checked here only; the API has no such concept.
            const result = await postJson<RegisterData>("/api/auth/register", {
                name: value.name.trim(),
                email,
                password: value.password,
            })

            if (!result.ok) {
                if (result.statusCode === 409) {
                    setFieldErrors({ email: "Email ini sudah terdaftar. Coba masuk atau pakai email lain." })
                    return
                }

                setFormError(result.message)
                setFieldErrors(result.errors)
                return
            }

            // The account exists either way — `verificationSent: false` only means the
            // mail did not go out, which the OTP screen offers to retry.
            setRedirecting(true)
            router.push(verifyUrl(email, result.data?.verificationSent ?? false))
        },
    })

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>
                        <h1 className="text-xl font-semibold">Buat akun Responku</h1>
                    </CardTitle>
                    <CardDescription>Gratis, dan langsung bisa mulai membuat riset.</CardDescription>
                </CardHeader>

                <CardContent>
                    <form
                        className="space-y-4"
                        noValidate
                        onSubmit={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            form.handleSubmit()
                        }}
                    >
                        {formError && (
                            <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                {formError}
                            </p>
                        )}

                        <form.Field name="name">
                            {(field) => {
                                const messages = [...field.state.meta.errors, fieldErrors.name]

                                return (
                                    <div className="space-y-2">
                                        <Label htmlFor={field.name}>Nama</Label>
                                        <div className="relative">
                                            <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                id={field.name}
                                                name={field.name}
                                                autoComplete="name"
                                                placeholder="Nama lengkap"
                                                className="pl-9"
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={(event) => field.handleChange(event.target.value)}
                                                aria-invalid={hasFieldError(messages)}
                                            />
                                        </div>
                                        <FieldError errors={toFieldErrors(messages)} />
                                    </div>
                                )
                            }}
                        </form.Field>

                        <form.Field name="email">
                            {(field) => {
                                const messages = [...field.state.meta.errors, fieldErrors.email]

                                return (
                                    <div className="space-y-2">
                                        <Label htmlFor={field.name}>Email</Label>
                                        <div className="relative">
                                            <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                id={field.name}
                                                name={field.name}
                                                type="email"
                                                inputMode="email"
                                                autoComplete="email"
                                                placeholder="nama@email.com"
                                                className="pl-9"
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={(event) => field.handleChange(event.target.value)}
                                                aria-invalid={hasFieldError(messages)}
                                            />
                                        </div>
                                        <FieldError errors={toFieldErrors(messages)} />
                                    </div>
                                )
                            }}
                        </form.Field>

                        <form.Field name="password">
                            {(field) => {
                                const messages = [...field.state.meta.errors, fieldErrors.password]

                                return (
                                    <div className="space-y-2">
                                        <Label htmlFor={field.name}>Kata Sandi</Label>
                                        <div className="relative">
                                            <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                id={field.name}
                                                name={field.name}
                                                type={showPassword ? "text" : "password"}
                                                autoComplete="new-password"
                                                placeholder="Minimal 8 karakter"
                                                className="pr-10 pl-9"
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={(event) => field.handleChange(event.target.value)}
                                                aria-invalid={hasFieldError(messages)}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => setShowPassword((visible) => !visible)}
                                                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                                                className="absolute top-1/2 right-0.5 -translate-y-1/2 text-muted-foreground"
                                            >
                                                {showPassword ? <EyeOff /> : <Eye />}
                                            </Button>
                                        </div>
                                        <FieldError errors={toFieldErrors(messages)} />
                                    </div>
                                )
                            }}
                        </form.Field>

                        <form.Field name="confirmPassword">
                            {(field) => {
                                const messages = [...field.state.meta.errors, fieldErrors.confirmPassword]

                                return (
                                    <div className="space-y-2">
                                        <Label htmlFor={field.name}>Ulangi Kata Sandi</Label>
                                        <div className="relative">
                                            <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                id={field.name}
                                                name={field.name}
                                                type={showConfirmation ? "text" : "password"}
                                                autoComplete="new-password"
                                                placeholder="Ulangi kata sandi"
                                                className="pr-10 pl-9"
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={(event) => field.handleChange(event.target.value)}
                                                aria-invalid={hasFieldError(messages)}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => setShowConfirmation((visible) => !visible)}
                                                aria-label={showConfirmation ? "Sembunyikan ulangi kata sandi" : "Tampilkan ulangi kata sandi"}
                                                className="absolute top-1/2 right-0.5 -translate-y-1/2 text-muted-foreground"
                                            >
                                                {showConfirmation ? <EyeOff /> : <Eye />}
                                            </Button>
                                        </div>
                                        <FieldError errors={toFieldErrors(messages)} />
                                    </div>
                                )
                            }}
                        </form.Field>

                        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
                            {([canSubmit, isSubmitting]) => {
                                const busy = isSubmitting || redirecting

                                return (
                                    <Button type="submit" className="w-full" disabled={!canSubmit || busy}>
                                        {busy ? (
                                            <>
                                                <Loader2 className="animate-spin" />
                                                {redirecting ? "Mengalihkan…" : "Membuat akun…"}
                                            </>
                                        ) : (
                                            <>
                                                Daftar
                                                <ArrowRight />
                                            </>
                                        )}
                                    </Button>
                                )
                            }}
                        </form.Subscribe>
                    </form>
                </CardContent>
            </Card>

            <p className="mt-6 text-center text-sm text-muted-foreground">
                Sudah punya akun?{" "}
                <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                    Masuk di sini
                </Link>
            </p>
        </>
    )
}
