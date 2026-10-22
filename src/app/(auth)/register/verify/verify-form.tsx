"use client"

import { useForm } from "@tanstack/react-form"
import Link from "next/link"
import { useEffect, useState } from "react"
import { z } from "zod"
import { Button, buttonVariants } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { OTP_LENGTH, OtpInput } from "@/components/ui/otp-input"
import { postJson } from "@/lib/api-client"
import { cn } from "@/lib/cn"
import { hasFieldError, toFieldErrors } from "@/lib/form-error"

/* ========== Konstanta ========== */

/** Matches the cooldown `POST /api/auth/resend-verification` enforces. */
const RESEND_COOLDOWN_SECONDS = 60

/* ========== Validasi ========== */

const verifySchema = z.object({
    email: z.string().trim().pipe(z.email("Masukkan alamat email yang valid.")),
    code: z.string().regex(/^\d{6}$/, "Masukkan 6 digit kode."),
})

type VerifyValues = z.infer<typeof verifySchema>

type VerifyData = { user: { id: string; email: string }; alreadyVerified: boolean }
type ResendData = { verificationSent: boolean; alreadyVerified: boolean; expiresAt: string | null }

/* ========== Halaman ========== */

/**
 * @param initialEmail Email being verified, handed over by the register screen.
 * @param codeSent Whether a code was just emailed: absent means "unknown", so no
 *   cooldown is assumed and nothing is warned about.
 */
export function VerifyForm({ initialEmail, codeSent }: { initialEmail: string; codeSent?: boolean }) {
    const [verified, setVerified] = useState<{ alreadyVerified: boolean; email: string } | null>(null)
    const [formError, setFormError] = useState<string | null>(null)
    const [warning, setWarning] = useState<string | null>(
        codeSent === false ? "Kode sudah dibuat, tapi emailnya gagal terkirim. Coba kirim ulang sebentar lagi." : null,
    )
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    // Registering has just sent a code, so its cooldown is already ticking.
    const [cooldown, setCooldown] = useState(codeSent === undefined ? 0 : RESEND_COOLDOWN_SECONDS)
    const [resending, setResending] = useState(false)

    useEffect(() => {
        if (cooldown <= 0) return

        const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000)
        return () => clearTimeout(timer)
    }, [cooldown])

    const form = useForm({
        defaultValues: { email: initialEmail, code: "" } as VerifyValues,
        validators: { onSubmit: verifySchema },
        onSubmit: async ({ value }) => {
            setFormError(null)
            setFieldErrors({})

            const result = await postJson<VerifyData>("/api/auth/confirm-verification", {
                email: value.email.trim(),
                code: value.code,
            })

            if (!result.ok) {
                if (result.statusCode === 429) {
                    // The code is thrown away once the attempts run out, so it is dead either way.
                    form.setFieldValue("code", "")
                    setFormError("Percobaan terlalu banyak. Minta kode baru, lalu masukkan kode itu.")
                    return
                }

                // A wrong code and an unknown account answer identically, on purpose.
                if (result.errors.code || result.statusCode === 422) {
                    setFieldErrors({ code: "Kode salah atau sudah kedaluwarsa." })
                    return
                }

                setFormError(result.message)
                return
            }

            setVerified({ alreadyVerified: result.data?.alreadyVerified ?? false, email: value.email.trim() })
        },
    })

    async function handleResend() {
        setFormError(null)
        setWarning(null)
        setFieldErrors({})

        const email = form.state.values.email.trim()

        if (email.length === 0) {
            setFieldErrors({ email: "Masukkan email yang kamu daftarkan dulu." })
            return
        }

        setResending(true)
        const result = await postJson<ResendData>("/api/auth/resend-verification", { email })
        setResending(false)

        if (!result.ok) {
            if (result.statusCode === 429) {
                setCooldown(RESEND_COOLDOWN_SECONDS)
                setFormError("Kode baru baru saja dikirim. Tunggu sebentar sebelum meminta lagi.")
                return
            }

            if (result.errors.email) {
                setFieldErrors({ email: "Email ini belum terdaftar." })
                return
            }

            setFormError(result.message)
            return
        }

        if (result.data?.alreadyVerified) {
            setVerified({ alreadyVerified: true, email })
            return
        }

        // A new code invalidates the old one, so the field starts empty.
        form.setFieldValue("code", "")
        setCooldown(RESEND_COOLDOWN_SECONDS)

        if (result.data?.verificationSent === false) {
            setWarning("Kode baru dibuat, tapi emailnya gagal terkirim. Coba kirim ulang sebentar lagi.")
        }
    }

    if (verified) {
        return (
            <>
                <header className="mb-8 space-y-1.5">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {verified.alreadyVerified ? "Akun sudah terverifikasi" : "Email berhasil diverifikasi"}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {verified.alreadyVerified
                            ? `${verified.email} sudah aktif sebelumnya. Kamu bisa langsung masuk.`
                            : `${verified.email} sudah aktif. Silakan masuk untuk mulai memakai Responku.`}
                    </p>
                </header>

                <Link href="/login" className={cn(buttonVariants(), "w-full")}>
                    Masuk ke akun
                </Link>
            </>
        )
    }

    return (
        <>
            <header className="mb-8 space-y-1.5">
                <h1 className="text-2xl font-semibold tracking-tight">Cek email kamu</h1>
                <p className="text-sm text-muted-foreground">
                    {initialEmail ? (
                        <>
                            Kami mengirim kode 6 digit ke <span className="font-medium text-foreground">{initialEmail}</span>.
                        </>
                    ) : (
                        "Masukkan email yang kamu daftarkan, lalu minta kode verifikasinya."
                    )}
                </p>
            </header>

            <form
                className="space-y-4"
                noValidate
                onSubmit={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    form.handleSubmit()
                }}
            >
                {warning && <p className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">{warning}</p>}

                {formError && (
                    <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {formError}
                    </p>
                )}

                {!initialEmail && (
                    <form.Field name="email">
                        {(field) => {
                            const messages = [...field.state.meta.errors, fieldErrors.email]

                            return (
                                <div className="space-y-2">
                                    <Label htmlFor={field.name}>Email</Label>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        type="email"
                                        inputMode="email"
                                        autoComplete="email"
                                        placeholder="nama@email.com"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(event) => field.handleChange(event.target.value)}
                                        aria-invalid={hasFieldError(messages)}
                                    />
                                    <FieldError errors={toFieldErrors(messages)} />
                                </div>
                            )
                        }}
                    </form.Field>
                )}

                <form.Field name="code">
                    {(field) => {
                        const messages = [...field.state.meta.errors, fieldErrors.code]

                        return (
                            <div className="space-y-2">
                                <Label htmlFor={field.name}>Kode verifikasi</Label>
                                <OtpInput
                                    id={field.name}
                                    value={field.state.value}
                                    onChange={(next) => field.handleChange(next)}
                                    invalid={hasFieldError(messages)}
                                />
                                <FieldError errors={toFieldErrors(messages)} />
                            </div>
                        )
                    }}
                </form.Field>

                <form.Subscribe selector={(state) => [state.isSubmitting, state.values.code] as const}>
                    {([isSubmitting, code]) => (
                        <Button type="submit" className="w-full" disabled={isSubmitting || code.length !== OTP_LENGTH}>
                            {isSubmitting ? "Memverifikasi…" : "Verifikasi"}
                        </Button>
                    )}
                </form.Subscribe>
            </form>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-1 text-sm text-muted-foreground">
                <span>Belum menerima kode?</span>
                <Button type="button" variant="link" size="sm" disabled={cooldown > 0 || resending} onClick={handleResend}>
                    {resending ? "Mengirim…" : cooldown > 0 ? `Kirim ulang dalam ${cooldown} detik` : "Kirim ulang kode"}
                </Button>
            </div>

            <p className="mt-6 text-center text-sm text-muted-foreground">
                Sudah terverifikasi?{" "}
                <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                    Masuk di sini
                </Link>
            </p>
        </>
    )
}
