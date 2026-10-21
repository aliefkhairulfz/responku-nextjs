"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import * as Card from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Clock, Coins, ExternalLink, ShieldCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export type ResearchDetail = {
    id: string;
    title: string;
    researcher: string;
    institution: string;
    description: string;
    estimatedMinutes: number;
    rewardToken: number;
    tokenValueRupiah: number;
    criteria: string;
    questionnaireUrl: string;
    verified: boolean;
};

const ATTENTION_OPTIONS = [
    { value: "random", label: "Saya hanya mengisi survei secara acak dan cepat", valid: false },
    { value: "careful", label: "Saya membaca kuesioner ini dengan teliti dan jujur (Pilihan Valid)", valid: true },
    { value: "bot", label: "Saya menggunakan script bot otomatis untuk menjawab", valid: false },
];

const formatRupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

const formatCountdown = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export default function ResearchDetailView({ research }: { research: ResearchDetail }) {
    const minSeconds = research.estimatedMinutes * 60;

    const [started, setStarted] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(minSeconds);
    const [attention, setAttention] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    const durationMet = started && secondsLeft <= 0;
    const canSubmit = durationMet && attention !== "" && !submitting;

    useEffect(() => {
        if (!started || secondsLeft <= 0) return;
        const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
        return () => clearInterval(t);
    }, [started, secondsLeft]);

    async function handleSubmit() {
        setError(null);

        const picked = ATTENTION_OPTIONS.find((o) => o.value === attention);
        if (!picked?.valid) {
            setError("Jawaban uji perhatian tidak valid. Quality Score Anda dapat menurun.");
            return;
        }

        setSubmitting(true);
        try {
            // TODO: kirim ke API: { researchId: research.id, attentionPassed: true, durationSeconds: minSeconds - secondsLeft }
            await new Promise((r) => setTimeout(r, 800));
            setDone(true);
        } catch {
            setError("Gagal mengirim jawaban. Coba lagi.");
        } finally {
            setSubmitting(false);
        }
    }

    if (done) {
        return (
            <main className="mx-auto flex min-h-dvh w-full max-w-2xl items-center px-4 py-10 mt-10">
                <Card.Card className="w-full text-center">
                    <Card.CardHeader className="items-center space-y-3">
                        <CheckCircle2 className="size-12 text-green-600" />
                        <h1 className="text-2xl font-semibold">Jawaban terkirim</h1>
                        <p className="text-muted-foreground text-sm">
                            Terima kasih! {research.rewardToken} token akan ditambahkan ke akun Anda setelah diverifikasi.
                        </p>
                    </Card.CardHeader>
                </Card.Card>
            </main>
        );
    }

    return (
        <main className="mx-auto flex w-full max-w-2xl flex-col space-y-4 px-4 py-10 mt-10">
            {/* HEADER RISET */}
            <Card.Card>
                <Card.CardHeader className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        {research.verified && (
                            <Badge variant="secondary" className="gap-1 rounded-full">
                                <ShieldCheck className="size-3.5" />
                                Riset Terverifikasi
                            </Badge>
                        )}
                        <Badge className="gap-1 rounded-full">
                            <Coins className="size-3.5" />+{research.rewardToken} Token (~
                            {formatRupiah(research.rewardToken * research.tokenValueRupiah)})
                        </Badge>
                    </div>

                    <h1 className="text-2xl leading-snug font-semibold">{research.title}</h1>

                    <div className="text-sm">
                        <p className="font-medium">{research.researcher}</p>
                        <p className="text-muted-foreground">{research.institution}</p>
                    </div>

                    <p className="text-muted-foreground text-sm leading-relaxed">{research.description}</p>
                </Card.CardHeader>

                <Separator />

                <Card.CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
                    <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground flex items-center gap-1 text-xs uppercase">
                            <Clock className="size-3.5" /> Estimasi Waktu
                        </span>
                        <span className="text-sm font-medium">
                            {research.estimatedMinutes} Menit <span className="text-muted-foreground font-normal">(Batas acuan anti-speeding)</span>
                        </span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground text-xs uppercase">Kriteria Responden</span>
                        <span className="text-sm font-medium">{research.criteria}</span>
                    </div>
                </Card.CardContent>
            </Card.Card>

            {/* INSTRUKSI */}
            <Card.Card>
                <Card.CardHeader className="space-y-2">
                    <h2 className="text-lg font-semibold">Instruksi & Pengisian Kuesioner</h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        Silakan buka tautan kuesioner resmi di bawah ini pada tab baru, jawab semua pertanyaan dengan teliti, kemudian selesaikan uji
                        perhatian (<em>attention check</em>) di bagian bawah halaman ini.
                    </p>
                </Card.CardHeader>
                <Card.CardContent className="flex flex-col gap-3">
                    <Link
                        href={`/research/survei-preferensi-penggunaan-aplikasi-finansial-dompet-digital-2026/work-on/respondent-id`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setStarted(true)}
                        className="w-full"
                    >
                        <Button type="button" className="w-full">
                            <ExternalLink className="size-4" />
                            {started ? "Buka Kembali Kuesioner" : "Buka Kuesioner"}
                        </Button>
                    </Link>

                    {started && !durationMet && (
                        <p className="text-muted-foreground flex items-center gap-2 text-sm">
                            <Clock className="size-4" />
                            Durasi minimum tersisa: <span className="text-foreground font-semibold tabular-nums">{formatCountdown(secondsLeft)}</span>
                        </p>
                    )}
                </Card.CardContent>
            </Card.Card>

            {/* ATTENTION CHECK */}
            <Card.Card>
                <Card.CardHeader className="space-y-2">
                    <h2 className="text-lg font-semibold">Uji Kualitas & Perhatian (Attention Check)</h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        Untuk mencegah bot otomatis dan memastikan Quality Score Anda tetap Sangat Baik, silakan pilih opsi valid di bawah:
                    </p>
                </Card.CardHeader>

                <Card.CardContent className="flex flex-col gap-4">
                    <RadioGroup
                        value={attention}
                        onValueChange={(v) => {
                            setAttention(v as string);
                            setError(null);
                        }}
                        className="gap-3"
                    >
                        {ATTENTION_OPTIONS.map((o) => (
                            <div key={o.value} className="flex items-start gap-3 rounded-lg border p-3">
                                <RadioGroupItem id={`attn-${o.value}`} value={o.value} className="mt-0.5" />
                                <Label htmlFor={`attn-${o.value}`} className="cursor-pointer leading-snug font-normal">
                                    {o.label}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>

                    {error && (
                        <p className="text-destructive flex items-center gap-2 text-sm">
                            <TriangleAlert className="size-4 shrink-0" />
                            {error}
                        </p>
                    )}

                    {durationMet && (
                        <p className="flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle2 className="size-4 shrink-0" />
                            Syarat durasi pengisian terpenuhi. Anda dapat mengirim jawaban.
                        </p>
                    )}
                </Card.CardContent>

                <Card.CardFooter>
                    <Button type="button" className="w-full" disabled={!canSubmit} onClick={handleSubmit}>
                        {submitting ? "Mengirim..." : "Kirim Jawaban"}
                    </Button>
                </Card.CardFooter>
            </Card.Card>
        </main>
    );
}
