"use client"

import { useForm } from "@tanstack/react-form"
import { History, Loader2, PlusCircle, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { getJson, postJson } from "@/lib/api-client"
import type { SupportTicket } from "@/lib/api-types"
import { toFieldErrors } from "@/lib/form-error"
import {
    isTicketCategory,
    TICKET_CATEGORIES,
    TICKET_CATEGORY_ITEMS,
    ticketCategoryLabel,
    ticketStatusLabel,
    ticketStatusStyle,
    type TicketCategory,
} from "@/lib/ticket"

/* ========== Validasi ========== */

/**
 * Mirrors the API's own rules, so the form catches a short subject or a thin explanation
 * before anything is sent. The API is still the authority — these are just friendlier.
 */
const ticketSchema = z.object({
    category: z.enum(TICKET_CATEGORIES),
    subject: z.string().trim().min(3, "Subjek minimal 3 karakter.").max(150, "Subjek maksimal 150 karakter."),
    description: z.string().trim().min(20, "Penjelasan minimal 20 karakter.").max(5000, "Penjelasan maksimal 5000 karakter."),
})

type ActiveMenu = "new" | "history"

/** The form the user starts from, and returns to after a ticket is sent. */
const EMPTY_TICKET: { category: TicketCategory; subject: string; description: string } = {
    category: "DISPUTE",
    subject: "",
    description: "",
}

/* ========== Data ========== */

type TicketsState =
    { status: "loading" } | { status: "ready"; tickets: SupportTicket[] } | { status: "unauthenticated" } | { status: "error"; message: string }

/**
 * Reads the caller's own history, returning the next state rather than setting it.
 *
 * React Compiler rejects a helper that calls `setState` when it is reached from a mount
 * effect, so the effect only applies what this returns.
 */
async function readTickets(): Promise<TicketsState> {
    const result = await getJson<{ tickets: SupportTicket[] }>("/api/ticket")

    if (result.statusCode === 401) return { status: "unauthenticated" }
    if (!result.ok || !result.data) return { status: "error", message: result.message }

    return { status: "ready", tickets: result.data.tickets }
}

/** When the ticket was sent, in the reader's own locale. */
function submittedAt(value: string) {
    return new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
}

/**
 * A short reference for the history list.
 *
 * The real id is a cuid, which is unreadable in a list, so the tail of it stands in as
 * the reference and the whole id stays available in the row's tooltip.
 */
function ticketReference(id: string) {
    return id.slice(-8).toUpperCase()
}

/* ========== Halaman ========== */

const menuItems = [
    { label: "Buat Tiket Baru", value: "new", icon: PlusCircle },
    { label: "Riwayat Tiket Saya", value: "history", icon: History },
] as const

function MenuList({ activeMenu, onMenuChange }: { activeMenu: ActiveMenu; onMenuChange: (value: ActiveMenu) => void }) {
    return (
        <ul className="flex flex-col gap-1">
            {menuItems.map(({ label, value, icon: Icon }) => (
                <li key={value}>
                    <button
                        type="button"
                        onClick={() => onMenuChange(value)}
                        className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition-colors ${
                            activeMenu === value ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                    >
                        <Icon className="size-5 shrink-0" />
                        <span>{label}</span>
                    </button>
                </li>
            ))}
        </ul>
    )
}

export default function Page() {
    const router = useRouter()
    const [activeMenu, setActiveMenu] = useState<ActiveMenu>("new")
    const [state, setState] = useState<TicketsState>({ status: "loading" })
    /** Field-level rejection from the API, shown under the input instead of as a toast. */
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

    useEffect(() => {
        let cancelled = false

        void readTickets().then((next) => {
            if (!cancelled) setState(next)
        })

        return () => {
            cancelled = true
        }
    }, [])

    useEffect(() => {
        if (state.status === "unauthenticated") router.replace("/login")
    }, [state.status, router])

    // Only ever reached from an action, where updating state is allowed directly.
    function reload() {
        void readTickets().then(setState)
    }

    const form = useForm({
        defaultValues: EMPTY_TICKET,
        validators: { onSubmit: ticketSchema },
        onSubmit: async ({ value }) => {
            setFieldErrors({})

            const result = await postJson<{ ticket: SupportTicket }>("/api/ticket", {
                category: value.category,
                subject: value.subject.trim(),
                description: value.description.trim(),
            })

            if (!result.ok) {
                // A rejected field is worth pointing at; anything else is worth a toast.
                if (Object.keys(result.errors).length > 0) {
                    setFieldErrors(result.errors)
                    return
                }

                toast.add({ type: "error", title: "Tiket gagal dikirim", description: result.message })
                return
            }

            toast.add({
                type: "success",
                title: "Tiket terkirim",
                description: "Permohonanmu masuk antrean peninjauan, estimasi maksimal 48 jam kerja.",
            })

            form.reset()
            setActiveMenu("history")
            // The history is already fetched, so refresh it rather than waiting for a reload.
            reload()
        },
    })

    const tickets = state.status === "ready" ? state.tickets : []

    return (
        <main className="container2nd mx-auto mt-15 grid h-[calc(100dvh-60px)] grid-rows-[auto_1fr] md:grid-cols-[240px_minmax(0,1fr)] md:grid-rows-1">
            <aside className="min-h-0 border-b py-4 md:border-b-0 md:py-4 md:pr-4 md:border-r">
                <MenuList activeMenu={activeMenu} onMenuChange={setActiveMenu} />
            </aside>

            <section className="min-h-0 overflow-y-auto px-2 py-5 pb-16 md:pl-4">
                {activeMenu === "new" && (
                    <div className="max-w-2xl">
                        <h3 className="text-xl leading-snug font-semibold">Formulir Pengajuan Tiket</h3>

                        <p className="leading-relaxed text-muted-foreground">Isi informasi berikut untuk mengajukan permohonan kepada tim kami.</p>

                        <form
                            className="mt-6 space-y-6"
                            noValidate
                            onSubmit={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                void form.handleSubmit()
                            }}
                        >
                            <form.Field name="category">
                                {(field) => {
                                    const errors = toFieldErrors([...field.state.meta.errors, fieldErrors.category])

                                    return (
                                        <div className="space-y-2">
                                            <Label htmlFor={field.name}>Kategori Permasalahan</Label>

                                            <Select
                                                value={field.state.value}
                                                onValueChange={(value) => {
                                                    if (isTicketCategory(value)) field.handleChange(value)
                                                }}
                                            >
                                                <SelectTrigger id={field.name} className="w-full">
                                                    <SelectValue placeholder="Pilih kategori" />
                                                </SelectTrigger>

                                                <SelectContent>
                                                    {TICKET_CATEGORY_ITEMS.map((item) => (
                                                        <SelectItem key={item.value} value={item.value}>
                                                            {item.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <p className="text-sm text-muted-foreground">
                                                Pilih kategori yang paling sesuai agar permohonan dapat diteruskan ke tim terkait.
                                            </p>

                                            <FieldError errors={errors} />
                                        </div>
                                    )
                                }}
                            </form.Field>

                            <form.Field name="subject">
                                {(field) => {
                                    const errors = toFieldErrors([...field.state.meta.errors, fieldErrors.subject])

                                    return (
                                        <div className="space-y-2">
                                            <Label htmlFor={field.name}>Subjek Permohonan</Label>

                                            <Input
                                                id={field.name}
                                                name={field.name}
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={(event) => field.handleChange(event.target.value)}
                                                placeholder="Contoh: Permohonan review manual respon survei"
                                                maxLength={150}
                                                aria-invalid={errors.length > 0}
                                            />

                                            <div className="flex items-start justify-between gap-3">
                                                <FieldError errors={errors} />

                                                <span className="shrink-0 text-xs text-muted-foreground">
                                                    {field.state.value.length}
                                                    /150
                                                </span>
                                            </div>
                                        </div>
                                    )
                                }}
                            </form.Field>

                            <form.Field name="description">
                                {(field) => {
                                    const errors = toFieldErrors([...field.state.meta.errors, fieldErrors.description])

                                    return (
                                        <div className="space-y-2">
                                            <Label htmlFor={field.name}>Penjelasan Detail Permasalahan</Label>

                                            <Textarea
                                                id={field.name}
                                                name={field.name}
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={(event) => field.handleChange(event.target.value)}
                                                placeholder="Jelaskan alasan permohonan banding atau kendala yang dialami secara rinci..."
                                                className="min-h-40 resize-y"
                                                maxLength={5000}
                                                aria-invalid={errors.length > 0}
                                            />

                                            <div className="flex items-start justify-between gap-3">
                                                <FieldError errors={errors} />

                                                <span className="shrink-0 text-xs text-muted-foreground">
                                                    {field.state.value.length}
                                                    /5000
                                                </span>
                                            </div>
                                        </div>
                                    )
                                }}
                            </form.Field>

                            <div className="text-sm text-muted-foreground">
                                <p className="font-medium text-foreground">Ketentuan Layanan Tiket</p>

                                <ul className="mt-2 list-disc space-y-1 pl-5">
                                    <li>Permohonan diproses dengan estimasi maksimal 48 jam kerja.</li>
                                    <li>Keputusan peninjauan mengikuti pedoman kualitas data dan log pengisian kuesioner.</li>
                                </ul>
                            </div>

                            <Separator />

                            <div className="flex justify-end">
                                <form.Subscribe selector={(formState) => [formState.canSubmit, formState.isSubmitting] as const}>
                                    {([canSubmit, isSubmitting]) => (
                                        <Button type="submit" disabled={!canSubmit || isSubmitting}>
                                            <PlusCircle className="size-4" />
                                            {isSubmitting ? "Mengirim..." : "Kirim Permohonan Tiket"}
                                        </Button>
                                    )}
                                </form.Subscribe>
                            </div>
                        </form>
                    </div>
                )}

                {activeMenu === "history" && (
                    <div>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h3 className="text-xl leading-snug font-semibold">Riwayat Tiket Saya</h3>

                                <p className="leading-relaxed text-muted-foreground">Pantau status permohonan yang telah Anda kirim.</p>
                            </div>

                            <Button onClick={() => setActiveMenu("new")}>
                                <PlusCircle className="size-4" />
                                Buat Tiket Baru
                            </Button>
                        </div>

                        <Separator className="my-5" />

                        {state.status === "loading" && (
                            <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="size-4 animate-spin" />
                                Memuat riwayat tiket…
                            </p>
                        )}

                        {state.status === "error" && (
                            <div className="space-y-3">
                                <p role="alert" className="text-sm text-destructive">
                                    {state.message}
                                </p>

                                <Button variant="outline" size="sm" onClick={reload}>
                                    <RefreshCw />
                                    Coba lagi
                                </Button>
                            </div>
                        )}

                        {state.status === "ready" && tickets.length === 0 && (
                            <div className="py-12 text-center">
                                <History className="mx-auto size-8 text-muted-foreground" />

                                <p className="mt-3 font-medium">Belum ada tiket</p>

                                <p className="mt-1 text-sm text-muted-foreground">Tiket yang Anda kirim akan muncul di sini.</p>

                                <Button className="mt-4" variant="outline" onClick={() => setActiveMenu("new")}>
                                    Buat Tiket Baru
                                </Button>
                            </div>
                        )}

                        {state.status === "ready" && tickets.length > 0 && (
                            <div className="divide-y">
                                {tickets.map((ticket) => {
                                    const statusStyle = ticketStatusStyle(ticket.status)

                                    return (
                                        <article key={ticket.id} className="py-5 first:pt-0">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                <div className="min-w-0">
                                                    <p className="text-xs text-muted-foreground" title={ticket.id}>
                                                        Tiket #{ticketReference(ticket.id)}
                                                        {" · "}
                                                        {submittedAt(ticket.createdAt)}
                                                    </p>

                                                    <h3 className="mt-2 font-semibold">{ticket.subject}</h3>

                                                    <p className="mt-1 text-sm text-muted-foreground">{ticketCategoryLabel(ticket.category)}</p>
                                                </div>

                                                <span className={`w-fit shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${statusStyle}`}>
                                                    {ticketStatusLabel(ticket.status)}
                                                </span>
                                            </div>

                                            <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                                                {ticket.description}
                                            </p>
                                        </article>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}
            </section>
        </main>
    )
}
