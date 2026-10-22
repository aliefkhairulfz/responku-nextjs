"use client"

import { useForm } from "@tanstack/react-form"
import { BadgeCheck, CalendarDays, ClipboardList, Loader2, Mail, Save, ShieldCheck, Star, TriangleAlert, Upload } from "lucide-react"
import { useRef, useState } from "react"
import { z } from "zod"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { OTP_LENGTH, OtpInput } from "@/components/ui/otp-input"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/toast"
import { patchJson, postForm, postJson } from "@/lib/api-client"
import type { CurrentUser, UserProfile } from "@/lib/api-types"
import { hasFieldError, toFieldErrors } from "@/lib/form-error"
import { PHONE_MAX_LENGTH, isPhoneNumber } from "@/lib/profile-schema"

/* ========== Helper ========== */

const ROLE_LABELS: Record<string, string> = { researcher: "Peneliti", respondent: "Responden", admin: "Admin" }

function roleLabel(roles: string[]) {
    return roles.map((role) => ROLE_LABELS[role] ?? role).join(", ") || "—"
}

function joinedAt(createdAt: string) {
    return new Date(createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
}

/* ========== Ganti email ========== */

const requestSchema = z.object({
    email: z.string().trim().pipe(z.email("Masukkan alamat email yang valid.")),
    password: z.string().min(1, "Kata sandi wajib diisi."),
})

type RequestValues = z.infer<typeof requestSchema>

/** An empty value clears the number, which is why it is allowed through here. */
const phoneSchema = z.object({
    phoneNumber: z
        .string()
        .trim()
        .max(PHONE_MAX_LENGTH, `Maksimal ${PHONE_MAX_LENGTH} karakter.`)
        .refine((value) => value === "" || isPhoneNumber(value), "Nomor WhatsApp tidak valid. Contoh: 081234567890."),
})

type PhoneValues = z.infer<typeof phoneSchema>

/**
 * Changes the account email, which is a two-step flow on the API: the new address
 * has to prove it is reachable before it replaces the old one, because changing an
 * email is enough to take an account over.
 */
function EmailChangeDialog({ user, onUserUpdated }: { user: CurrentUser; onUserUpdated: (user: CurrentUser) => void }) {
    const [open, setOpen] = useState(false)
    const [pendingEmail, setPendingEmail] = useState("")
    const [code, setCode] = useState("")
    const [step, setStep] = useState<"request" | "confirm">("request")
    const [formError, setFormError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

    const form = useForm({
        defaultValues: { email: "", password: "" } as RequestValues,
        validators: { onSubmit: requestSchema },
        onSubmit: async ({ value }) => {
            setFormError(null)
            setFieldErrors({})

            const email = value.email.trim()
            const result = await postJson<{ email: string }>("/api/auth/change-email", { email, password: value.password })

            if (!result.ok) {
                if (result.statusCode === 401) {
                    setFormError("Kata sandi salah.")
                    return
                }

                if (result.statusCode === 409) {
                    setFieldErrors({ email: "Email ini sudah dipakai akun lain." })
                    return
                }

                setFormError(result.message)
                setFieldErrors(result.errors)
                return
            }

            setPendingEmail(email)
            setStep("confirm")
        },
    })

    /** Closing the dialog always starts the flow over, so no stale code survives it. */
    function reset(nextOpen: boolean) {
        setOpen(nextOpen)
        if (!nextOpen) {
            setStep("request")
            setPendingEmail("")
            setCode("")
            setFormError(null)
            setFieldErrors({})
            form.reset()
        }
    }

    async function confirmCode() {
        setFormError(null)

        const result = await postJson<{ user: { email: string } }>("/api/auth/confirm-email-change", { code })

        if (!result.ok) {
            if (result.statusCode === 429) {
                // The code is discarded once its attempts run out; the flow has to restart.
                setCode("")
                setFormError("Percobaan terlalu banyak. Mulai ulang prosesnya.")
                return
            }

            setFormError("Kode salah atau sudah kedaluwarsa.")
            return
        }

        onUserUpdated({ ...user, email: result.data?.user.email ?? pendingEmail, verifiedAt: new Date().toISOString() })
        toast.add({
            type: "success",
            title: "Email diperbarui",
            description: `Alamat masuk kamu sekarang ${result.data?.user.email ?? pendingEmail}.`,
        })
        reset(false)
    }

    return (
        <Dialog open={open} onOpenChange={reset}>
            <Button type="button" variant="outline" size="sm" onClick={() => reset(true)}>
                <Mail />
                Ganti Email
            </Button>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{step === "request" ? "Ganti alamat email" : "Masukkan kode verifikasi"}</DialogTitle>
                    <DialogDescription>
                        {step === "request"
                            ? `Kode verifikasi akan dikirim ke email baru, agar alamatnya terbukti bisa diakses.`
                            : `Kami mengirim 6 digit kode ke ${pendingEmail}.`}
                    </DialogDescription>
                </DialogHeader>

                {/* Failures stay inside the dialog: the toast layer sits below the modal
                    overlay, so a toast here would be invisible until the dialog closes. */}
                {formError && (
                    <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {formError}
                    </p>
                )}

                {step === "request" ? (
                    <form
                        className="space-y-4"
                        noValidate
                        onSubmit={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            form.handleSubmit()
                        }}
                    >
                        <form.Field name="email">
                            {(field) => {
                                const messages = [...field.state.meta.errors, fieldErrors.email]

                                return (
                                    <div className="space-y-2">
                                        <Label htmlFor="new-email">Email Baru</Label>
                                        <Input
                                            id="new-email"
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

                        <form.Field name="password">
                            {(field) => {
                                const messages = [...field.state.meta.errors, fieldErrors.password]

                                return (
                                    <div className="space-y-2">
                                        <Label htmlFor="confirm-password">Kata Sandi Saat Ini</Label>
                                        <Input
                                            id="confirm-password"
                                            name={field.name}
                                            type="password"
                                            autoComplete="current-password"
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

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => reset(false)}>
                                Batal
                            </Button>

                            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
                                {([canSubmit, isSubmitting]) => (
                                    <Button type="submit" disabled={!canSubmit || isSubmitting}>
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="animate-spin" />
                                                Mengirim…
                                            </>
                                        ) : (
                                            "Kirim Kode"
                                        )}
                                    </Button>
                                )}
                            </form.Subscribe>
                        </DialogFooter>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email-change-code">Kode verifikasi</Label>
                            <OtpInput id="email-change-code" value={code} onChange={setCode} invalid={formError !== null} />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setStep("request")}>
                                Kembali
                            </Button>

                            <Button type="button" disabled={code.length !== OTP_LENGTH} onClick={confirmCode}>
                                Simpan Email
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

/* ========== Foto profil ========== */

/**
 * Uploads a new profile photo.
 *
 * The file goes to Cloudinary through the API, which answers with the updated user —
 * so the avatar is refreshed from the server's own copy of the URL rather than from a
 * temporary object URL that would die with the page.
 *
 * The API is what enforces the size and type limits; the `accept` attribute here is
 * only there to steer the picker.
 */
function ProfilePhotoUpload({ user, onUserUpdated }: { user: CurrentUser; onUserUpdated: (user: CurrentUser) => void }) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)
    const [fileError, setFileError] = useState<string | null>(null)

    const initials = user.name.trim().charAt(0).toUpperCase() || "?"

    async function upload(file: File) {
        setFileError(null)
        setUploading(true)

        const body = new FormData()
        body.append("file", file)

        const result = await postForm<{ user: CurrentUser }>("/api/user/avatar", body)

        setUploading(false)

        if (!result.ok) {
            // A rejected file is worth pointing at; anything else is worth a toast.
            if (result.errors.file) {
                setFileError(result.errors.file)
                return
            }

            toast.add({ type: "error", title: "Foto gagal diunggah", description: result.message })
            return
        }

        if (result.data?.user) onUserUpdated(result.data.user)

        toast.add({ type: "success", title: "Foto profil tersimpan", description: "Foto baru sudah dipakai di seluruh akun." })
    }

    return (
        <section className="space-y-3">
            <p className="leading-relaxed text-muted-foreground">Foto Profil</p>

            <div className="flex flex-wrap items-center gap-4">
                <Avatar className="size-24">
                    <AvatarImage src={user.image ?? undefined} alt={user.name} />
                    <AvatarFallback className="text-2xl font-semibold">{initials}</AvatarFallback>
                </Avatar>

                <div className="space-y-2">
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/png,image/jpeg"
                        className="hidden"
                        onChange={(event) => {
                            const file = event.target.files?.[0]
                            // Cleared so picking the same file twice still fires a change.
                            event.target.value = ""

                            if (file) void upload(file)
                        }}
                    />

                    <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}>
                            {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
                            {uploading ? "Mengunggah…" : user.image ? "Ganti Foto" : "Unggah Foto"}
                        </Button>
                    </div>

                    <p className="max-w-sm text-sm text-muted-foreground">PNG atau JPEG, maksimal 1 MB. Foto persegi paling rapi.</p>

                    <FieldError errors={fileError ? [{ message: fileError }] : []} />
                </div>
            </div>
        </section>
    )
}

/* ========== Halaman ========== */

export default function IdentityData({
    user,
    profile,
    onUserUpdated,
    onProfileUpdated,
}: {
    user: CurrentUser
    profile: UserProfile | null
    onUserUpdated: (user: CurrentUser) => void
    onProfileUpdated: (profile: UserProfile) => void
}) {
    const verified = user.verifiedAt !== null

    // The phone number lives on the profile, and the API only creates that from a
    // complete demographic payload — so there has to be a profile before it can be saved.
    const canSavePhone = profile !== null

    /** Field-level rejection from the API, shown under the input instead of as a toast. */
    const [phoneFieldError, setPhoneFieldError] = useState<string | null>(null)

    const form = useForm({
        defaultValues: { phoneNumber: profile?.phoneNumber ?? "" } as PhoneValues,
        validators: { onSubmit: phoneSchema },
        onSubmit: async ({ value }) => {
            setPhoneFieldError(null)

            const phoneNumber = value.phoneNumber.trim()
            const result = await patchJson<{ profile: UserProfile }>("/api/user/profile", {
                phoneNumber: phoneNumber === "" ? null : phoneNumber,
            })

            if (!result.ok) {
                // A rejected value is worth pointing at; anything else is worth a toast.
                if (result.errors.phoneNumber) {
                    setPhoneFieldError(result.errors.phoneNumber)
                    return
                }

                toast.add({ type: "error", title: "Nomor gagal disimpan", description: result.message })
                return
            }

            toast.add({
                type: "success",
                title: phoneNumber === "" ? "Nomor dihapus" : "Nomor tersimpan",
                description: phoneNumber === "" ? "Nomor WhatsApp sudah dilepas dari profil." : "Nomor WhatsApp sudah diperbarui.",
            })

            if (result.data?.profile) onProfileUpdated(result.data.profile)
        },
    })

    const summary = [
        {
            icon: ShieldCheck,
            label: "Status Akun",
            value: verified ? "Terverifikasi" : "Belum terverifikasi",
            note: verified ? `Sejak ${joinedAt(user.verifiedAt as string)}` : "Cek email untuk kode verifikasi",
            highlight: verified,
        },
        { icon: ClipboardList, label: "Peran", value: roleLabel(user.roles), note: "Peran aktif di Responku", highlight: false },
        { icon: CalendarDays, label: "Bergabung", value: joinedAt(user.createdAt), note: "Tanggal akun dibuat", highlight: false },
    ]

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-xl leading-snug font-semibold">Informasi Dasar</h3>
                <p className="leading-relaxed text-muted-foreground">Kelola foto, identitas, dan informasi akun Anda.</p>
            </div>

            <Separator />

            <ProfilePhotoUpload user={user} onUserUpdated={onUserUpdated} />

            <Separator />

            <section className="space-y-3">
                <p className="leading-relaxed text-muted-foreground">Ringkasan Akun</p>

                <div className="grid gap-3 sm:grid-cols-3">
                    {summary.map(({ icon: Icon, label, value, note, highlight }) => (
                        <div key={label} className="space-y-2 rounded-lg border p-4">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Icon className="size-4" />
                                <span className="text-sm">{label}</span>
                            </div>

                            <p className={`text-base font-semibold ${highlight ? "flex items-center gap-1.5 text-emerald-600" : ""}`}>
                                {highlight && <BadgeCheck className="size-4" />}
                                {value}
                            </p>

                            <p className="text-xs text-muted-foreground">{note}</p>
                        </div>
                    ))}
                </div>
            </section>

            <Separator />

            <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="font-medium">Alamat Email</p>
                        <p className="text-sm text-muted-foreground">Email ini dipakai untuk masuk dan menerima kode verifikasi.</p>
                    </div>

                    <EmailChangeDialog user={user} onUserUpdated={onUserUpdated} />
                </div>

                <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
                    <Mail className="size-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-medium">{user.email}</span>
                    {verified ? (
                        <span className="ml-auto inline-flex items-center gap-1.5 text-sm text-emerald-600">
                            <BadgeCheck className="size-4" />
                            Terverifikasi
                        </span>
                    ) : (
                        <span className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                            <TriangleAlert className="size-4" />
                            Belum terverifikasi
                        </span>
                    )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="identity-name">Nama Lengkap</Label>
                        <Input id="identity-name" value={user.name} readOnly disabled />
                        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <Star className="mt-0.5 size-3.5 shrink-0" />
                            Perubahan nama belum tersedia lewat API.
                        </p>
                    </div>

                    <form
                        className="space-y-2"
                        noValidate
                        onSubmit={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            form.handleSubmit()
                        }}
                    >
                        <Label htmlFor="phoneNumber">Nomor WhatsApp / Telepon</Label>

                        <form.Field name="phoneNumber">
                            {(field) => {
                                const messages = [...field.state.meta.errors, phoneFieldError]

                                return (
                                    <>
                                        <Input
                                            id="phoneNumber"
                                            name={field.name}
                                            type="tel"
                                            inputMode="tel"
                                            autoComplete="tel"
                                            placeholder="081234567890"
                                            disabled={!canSavePhone}
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(event) => field.handleChange(event.target.value)}
                                            aria-invalid={hasFieldError(messages)}
                                        />
                                        <FieldError errors={toFieldErrors(messages)} />
                                    </>
                                )
                            }}
                        </form.Field>

                        {canSavePhone ? (
                            <form.Subscribe selector={(state) => state.isSubmitting}>
                                {(isSubmitting) => (
                                    <Button type="submit" size="sm" disabled={isSubmitting}>
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="animate-spin" />
                                                Menyimpan…
                                            </>
                                        ) : (
                                            <>
                                                <Save />
                                                Simpan Nomor
                                            </>
                                        )}
                                    </Button>
                                )}
                            </form.Subscribe>
                        ) : (
                            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                <Star className="mt-0.5 size-3.5 shrink-0" />
                                Lengkapi tab Demografi &amp; UU dulu — profilnya belum ada, jadi nomornya belum bisa disimpan.
                            </p>
                        )}
                    </form>
                </div>
            </section>
        </div>
    )
}
