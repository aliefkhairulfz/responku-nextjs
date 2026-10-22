"use client"

import { useForm } from "@tanstack/react-form"
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react"
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
 * Mirrors the API's own rules, so an obviously wrong value never leaves the
 * browser and the server's `422` is left for cases this cannot express.
 */
const loginSchema = z.object({
    email: z.string().trim().pipe(z.email("Masukkan alamat email yang valid.")),
    password: z.string().min(1, "Kata sandi wajib diisi."),
})

type LoginValues = z.infer<typeof loginSchema>

/* ========== Halaman ========== */

export default function LoginPage() {
    const router = useRouter()
    const [showPassword, setShowPassword] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [redirecting, setRedirecting] = useState(false)

    const form = useForm({
        defaultValues: { email: "", password: "" } as LoginValues,
        validators: { onSubmit: loginSchema },
        onSubmit: async ({ value }) => {
            setFormError(null)
            setFieldErrors({})

            const result = await postJson("/api/auth/login", {
                email: value.email.trim(),
                password: value.password,
            })

            if (!result.ok) {
                // The API deliberately answers the same way for an unknown account and
                // a wrong password, so a wrong password is the only thing to say here.
                setFormError(result.statusCode === 401 ? "Email atau kata sandi salah." : result.message)
                setFieldErrors(result.errors)
                return
            }

            // The session cookie is already set by the API response; refreshing makes
            // the server components read it before the dashboard renders.
            setRedirecting(true)
            router.replace("/dashboard")
            router.refresh()
        },
    })

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>
                        <h1 className="text-xl font-semibold">Masuk ke akun Anda</h1>
                    </CardTitle>
                    <CardDescription>Gunakan email dan kata sandi yang kamu daftarkan.</CardDescription>
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
                                                autoComplete="current-password"
                                                placeholder="••••••••"
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

                        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
                            {([canSubmit, isSubmitting]) => {
                                const busy = isSubmitting || redirecting

                                return (
                                    <Button type="submit" className="w-full" disabled={!canSubmit || busy}>
                                        {busy ? (
                                            <>
                                                <Loader2 className="animate-spin" />
                                                {redirecting ? "Mengalihkan…" : "Memproses…"}
                                            </>
                                        ) : (
                                            <>
                                                Masuk
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
                Belum punya akun?{" "}
                <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
                    Daftar sekarang
                </Link>
            </p>
        </>
    )
}
