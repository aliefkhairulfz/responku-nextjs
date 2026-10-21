"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "@tanstack/react-form";
import { History, PlusCircle } from "lucide-react";
import { useId, useState } from "react";
import { z } from "zod";

const ticketSchema = z.object({
    category: z.enum(["dispute", "research", "transaction", "account", "other"]),
    subject: z.string().trim().min(3, "Subjek minimal 3 karakter.").max(150, "Subjek maksimal 150 karakter."),
    description: z.string().trim().min(20, "Penjelasan minimal 20 karakter.").max(5000, "Penjelasan maksimal 5000 karakter."),
});

type TicketFormValues = z.infer<typeof ticketSchema>;
type TicketCategory = TicketFormValues["category"];
type TicketStatus = "review" | "resolved" | "rejected";
type ActiveMenu = "new" | "history";
type Ticket = {
    id: string;
    category: string;
    subject: string;
    description: string;
    date: string;
    status: TicketStatus;
};

const categories: Record<TicketCategory, string> = {
    dispute: "Banding Penolakan Jawaban Survei",
    research: "Klarifikasi Riset",
    transaction: "Kendala Transaksi",
    account: "Kendala Akun",
    other: "Permasalahan Lainnya",
};

const statusLabels: Record<TicketStatus, string> = {
    review: "Direview, estimasi maks 48 jam",
    resolved: "Selesai",
    rejected: "Ditolak",
};

const statusStyles: Record<TicketStatus, string> = {
    review: "border-amber-200 text-amber-700",
    resolved: "border-green-200 text-green-700",
    rejected: "border-red-200 text-red-700",
};

const initialTickets: Ticket[] = [
    {
        id: "1",
        category: categories.dispute,
        subject: "Permohonan Banding Penolakan Respon Survei Retail",
        description: "Pengisian kuesioner telah selesai dengan cermat sesuai instruksi, mohon review manual.",
        date: "20 Okt 2026, 06:32",
        status: "review",
    },
];

const menuItems = [
    { label: "Buat Tiket Baru", value: "new", icon: PlusCircle },
    { label: "Riwayat Tiket Saya", value: "history", icon: History },
] as const;

type MenuValue = (typeof menuItems)[number]["value"];

function MenuList({ activeMenu, onMenuChange }: { activeMenu: MenuValue; onMenuChange: (value: MenuValue) => void }) {
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
    );
}

function FieldErrors({ errors }: { errors: unknown[] }) {
    if (!errors.length) return null;
    return (
        <p className="text-sm text-destructive">
            {errors
                .map((error) => (typeof error === "string" ? error : error instanceof Error ? error.message : ""))
                .filter(Boolean)
                .join(", ")}
        </p>
    );
}

export default function Page() {
    const [activeMenu, setActiveMenu] = useState<ActiveMenu>("new");
    const [tickets, setTickets] = useState(initialTickets);
    const ticketIdPrefix = useId();

    const form = useForm({
        defaultValues: {
            category: "dispute",
            subject: "",
            description: "",
        },
        validators: {
            onSubmit: ticketSchema,
        },
        onSubmit: async ({ value }) => {
            const validated = ticketSchema.parse(value);

            const newTicket: Ticket = {
                id: `${ticketIdPrefix}-${tickets.length + 1}`,
                category: categories[validated.category],
                subject: validated.subject,
                description: validated.description,
                date: new Intl.DateTimeFormat("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short",
                }).format(new Date()),
                status: "review",
            };

            setTickets((current) => [newTicket, ...current]);
            form.reset();
            setActiveMenu("history");
        },
    });

    return (
        <main className="container2nd mx-auto mt-15 grid h-[calc(100dvh-60px)] grid-rows-[auto_1fr] md:grid-cols-[240px_minmax(0,1fr)] md:grid-rows-1">
            <aside className="min-h-0 border-b py-4 md:border-r md:border-b-0 md:py-4 md:pr-4">
                <MenuList activeMenu={activeMenu} onMenuChange={setActiveMenu} />
            </aside>

            <section className="min-h-0 overflow-y-auto px-2 py-5 pb-16 md:pl-4">
                {activeMenu === "new" && (
                    <div className="max-w-2xl">
                        <h3 className="text-xl font-semibold leading-snug">Formulir Pengajuan Tiket</h3>

                        <p className="leading-relaxed text-muted-foreground">Isi informasi berikut untuk mengajukan permohonan kepada tim kami.</p>

                        <form
                            className="mt-6 space-y-6"
                            noValidate
                            onSubmit={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                void form.handleSubmit();
                            }}
                        >
                            <form.Field name="category">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor={field.name}>Kategori Permasalahan</Label>

                                        <Select
                                            value={field.state.value}
                                            onValueChange={(value) => {
                                                if (value !== null) {
                                                    field.handleChange(value as TicketCategory);
                                                }
                                            }}
                                        >
                                            <SelectTrigger id={field.name} className="w-full">
                                                <SelectValue placeholder="Pilih kategori" />
                                            </SelectTrigger>

                                            <SelectContent>
                                                <SelectItem value="dispute">Banding Penolakan Jawaban Survei (Dispute)</SelectItem>
                                                <SelectItem value="research">Klarifikasi Riset</SelectItem>
                                                <SelectItem value="transaction">Kendala Transaksi</SelectItem>
                                                <SelectItem value="account">Kendala Akun</SelectItem>
                                                <SelectItem value="other">Permasalahan Lainnya</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <p className="text-sm text-muted-foreground">
                                            Pilih kategori yang paling sesuai agar permohonan dapat diteruskan ke tim terkait.
                                        </p>

                                        <FieldErrors errors={field.state.meta.errors} />
                                    </div>
                                )}
                            </form.Field>

                            <form.Field name="subject">
                                {(field) => (
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
                                            aria-invalid={field.state.meta.errors.length > 0}
                                        />

                                        <div className="flex items-start justify-between gap-3">
                                            <FieldErrors errors={field.state.meta.errors} />

                                            <span className="shrink-0 text-xs text-muted-foreground">
                                                {field.state.value.length}
                                                /150
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </form.Field>

                            <form.Field name="description">
                                {(field) => (
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
                                            aria-invalid={field.state.meta.errors.length > 0}
                                        />

                                        <div className="flex items-start justify-between gap-3">
                                            <FieldErrors errors={field.state.meta.errors} />

                                            <span className="shrink-0 text-xs text-muted-foreground">
                                                {field.state.value.length}
                                                /5000
                                            </span>
                                        </div>
                                    </div>
                                )}
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
                                <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
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
                                <h3 className="text-xl font-semibold leading-snug">Riwayat Tiket Saya</h3>

                                <p className="leading-relaxed text-muted-foreground">Pantau status permohonan yang telah Anda kirim.</p>
                            </div>

                            <Button onClick={() => setActiveMenu("new")}>
                                <PlusCircle className="size-4" />
                                Buat Tiket Baru
                            </Button>
                        </div>

                        <Separator className="my-5" />

                        {tickets.length > 0 ? (
                            <div className="divide-y">
                                {tickets.map((ticket) => (
                                    <article key={ticket.id} className="py-5 first:pt-0">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="min-w-0">
                                                <p className="text-xs text-muted-foreground">
                                                    Tiket #{ticket.id}
                                                    {" · "}
                                                    {ticket.date}
                                                </p>

                                                <h3 className="mt-2 font-semibold">{ticket.subject}</h3>

                                                <p className="mt-1 text-sm text-muted-foreground">{ticket.category}</p>
                                            </div>

                                            <span
                                                className={`w-fit shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${statusStyles[ticket.status]}`}
                                            >
                                                {statusLabels[ticket.status]}
                                            </span>
                                        </div>

                                        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{ticket.description}</p>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 text-center">
                                <History className="mx-auto size-8 text-muted-foreground" />

                                <p className="mt-3 font-medium">Belum ada tiket</p>

                                <p className="mt-1 text-sm text-muted-foreground">Tiket yang Anda kirim akan muncul di sini.</p>

                                <Button className="mt-4" variant="outline" onClick={() => setActiveMenu("new")}>
                                    Buat Tiket Baru
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </section>
        </main>
    );
}
