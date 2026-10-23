"use client"

import Link from "next/link"
import { useState } from "react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import { ArrowRight, CaretUp } from "./icons"

/**
 * The featured-research band, styled after the reference's "Featured Benchmarks".
 *
 * The tabs are the one interactive part of the landing page, so this is a client component;
 * everything above and below it stays server-rendered. Each card previews a research by its
 * top respondent regions — the same domicile data the product screens for.
 */

type Region = { name: string; percent: number }

type FeaturedResearch = {
    title: string
    description: string
    org: string
    initials: string
    regions: Region[]
    moreRegions: number
    updated: string
    votes: number
}

/** Placeholder content — replace with real, published research before launch. */
const TABS: { id: string; label: string; items: FeaturedResearch[] }[] = [
    {
        id: "trending",
        label: "Trending",
        items: [
            {
                title: "Survei Preferensi Dompet Digital 2026",
                description: "Riset pola transaksi nontunai, fitur transfer instan, dan kebiasaan menabung generasi muda.",
                org: "Fakultas Ekonomi UI",
                initials: "FE",
                regions: [
                    { name: "DKI Jakarta", percent: 34 },
                    { name: "Jawa Barat", percent: 22 },
                    { name: "Jawa Timur", percent: 14 },
                ],
                moreRegions: 35,
                updated: "4 hari lalu",
                votes: 180,
            },
            {
                title: "Kepuasan Layanan Transportasi Online",
                description: "Mengukur pengalaman pengguna ojek dan taksi daring di kota-kota besar.",
                org: "Lembaga Riset Pasar",
                initials: "LR",
                regions: [
                    { name: "DKI Jakarta", percent: 41 },
                    { name: "Banten", percent: 19 },
                    { name: "Jawa Barat", percent: 17 },
                ],
                moreRegions: 35,
                updated: "6 hari lalu",
                votes: 142,
            },
            {
                title: "Literasi Keuangan Generasi Z",
                description: "Menilai pemahaman produk investasi dan asuransi pada usia 18–24 tahun.",
                org: "Universitas Nusantara",
                initials: "UN",
                regions: [
                    { name: "Jawa Barat", percent: 28 },
                    { name: "DKI Jakarta", percent: 24 },
                    { name: "DI Yogyakarta", percent: 16 },
                ],
                moreRegions: 35,
                updated: "2 hari lalu",
                votes: 233,
            },
            {
                title: "Adopsi Pembayaran QRIS di UMKM",
                description: "Seberapa jauh merchant kecil mengadopsi pembayaran nontunai sehari-hari.",
                org: "DataLab Indonesia",
                initials: "DI",
                regions: [
                    { name: "Jawa Timur", percent: 31 },
                    { name: "Jawa Tengah", percent: 21 },
                    { name: "Bali", percent: 12 },
                ],
                moreRegions: 35,
                updated: "1 hari lalu",
                votes: 96,
            },
        ],
    },
    {
        id: "terbaru",
        label: "Terbaru",
        items: [
            {
                title: "Kesehatan Mental Pekerja Remote",
                description: "Tingkat stres dan dukungan perusahaan pada pekerja jarak jauh.",
                org: "Klinik Survei",
                initials: "KS",
                regions: [
                    { name: "DKI Jakarta", percent: 38 },
                    { name: "Banten", percent: 20 },
                    { name: "Jawa Barat", percent: 18 },
                ],
                moreRegions: 35,
                updated: "1 hari lalu",
                votes: 64,
            },
            {
                title: "Preferensi Belanja Online Ramadan",
                description: "Perilaku belanja menjelang dan selama Ramadan 2026.",
                org: "Pusat Riset Pasar",
                initials: "PR",
                regions: [
                    { name: "Jawa Barat", percent: 26 },
                    { name: "DKI Jakarta", percent: 23 },
                    { name: "Jawa Tengah", percent: 15 },
                ],
                moreRegions: 35,
                updated: "2 hari lalu",
                votes: 88,
            },
            {
                title: "Penggunaan AI Generatif di Kampus",
                description: "Bagaimana mahasiswa memakai alat AI untuk tugas akademik.",
                org: "Universitas Nusantara",
                initials: "UN",
                regions: [
                    { name: "DI Yogyakarta", percent: 29 },
                    { name: "Jawa Barat", percent: 22 },
                    { name: "DKI Jakarta", percent: 19 },
                ],
                moreRegions: 35,
                updated: "3 hari lalu",
                votes: 121,
            },
            {
                title: "Kualitas Udara & Mobilitas Warga",
                description: "Persepsi warga terhadap polusi dan pilihan transportasi harian.",
                org: "Asosiasi Riset Digital",
                initials: "AR",
                regions: [
                    { name: "DKI Jakarta", percent: 44 },
                    { name: "Banten", percent: 18 },
                    { name: "Jawa Barat", percent: 16 },
                ],
                moreRegions: 35,
                updated: "5 hari lalu",
                votes: 73,
            },
        ],
    },
    {
        id: "reward",
        label: "Reward Tertinggi",
        items: [
            {
                title: "Studi Perilaku Investasi Kripto",
                description: "Profil risiko dan pola transaksi investor aset kripto di Indonesia.",
                org: "DataLab Indonesia",
                initials: "DI",
                regions: [
                    { name: "DKI Jakarta", percent: 36 },
                    { name: "Bali", percent: 21 },
                    { name: "Jawa Barat", percent: 15 },
                ],
                moreRegions: 35,
                updated: "3 hari lalu",
                votes: 210,
            },
            {
                title: "Evaluasi Program Makan Bergizi",
                description: "Tanggapan orang tua terhadap program makan sekolah.",
                org: "Klinik Survei",
                initials: "KS",
                regions: [
                    { name: "Jawa Timur", percent: 30 },
                    { name: "Jawa Tengah", percent: 24 },
                    { name: "Jawa Barat", percent: 18 },
                ],
                moreRegions: 35,
                updated: "4 hari lalu",
                votes: 187,
            },
            {
                title: "Minat Berlangganan Kendaraan Listrik",
                description: "Faktor harga, infrastruktur, dan insentif pada keputusan pembelian.",
                org: "Lembaga Riset Pasar",
                initials: "LR",
                regions: [
                    { name: "DKI Jakarta", percent: 33 },
                    { name: "Jawa Barat", percent: 25 },
                    { name: "Banten", percent: 14 },
                ],
                moreRegions: 35,
                updated: "7 hari lalu",
                votes: 165,
            },
            {
                title: "Kepuasan Pengguna Aplikasi Kesehatan",
                description: "Pengalaman memakai layanan telemedicine dan pengingat obat.",
                org: "Fakultas Ekonomi UI",
                initials: "FE",
                regions: [
                    { name: "DKI Jakarta", percent: 39 },
                    { name: "Jawa Barat", percent: 20 },
                    { name: "DI Yogyakarta", percent: 13 },
                ],
                moreRegions: 35,
                updated: "2 hari lalu",
                votes: 154,
            },
        ],
    },
]

function ResearchCard({ item }: { item: FeaturedResearch }) {
    return (
        <article className="flex flex-col rounded-xl bg-card shadow-xs ring-1 ring-foreground/10">
            <div className="flex flex-1 flex-col gap-4 p-5">
                <div className="space-y-2">
                    <h3 className="leading-snug font-semibold">{item.title}</h3>
                    <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="flex shrink-0 items-center justify-center rounded-full text-xs font-semibold">{item.initials}</span>
                    <div className="w-1 h-1 rounded-full bg-primary"></div>
                    <span className="truncate text-sm text-muted-foreground">{item.org}</span>
                </div>

                <div className="mt-auto space-y-3 border-t pt-4">
                    {item.regions.map((region, index) => (
                        <div key={region.name} className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2 text-sm">
                                <span className="truncate">
                                    <span className="text-muted-foreground">#{index + 1}</span> {region.name}
                                </span>
                                <span className="font-semibold tabular-nums">{region.percent}%</span>
                            </div>
                            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${region.percent}%` }} />
                            </div>
                        </div>
                    ))}

                    <p className="text-sm text-muted-foreground">+ {item.moreRegions} provinsi lainnya</p>
                </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t px-5 py-3 text-sm text-muted-foreground">
                <span>Diperbarui {item.updated}</span>
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                    <CaretUp />
                    <span className="font-semibold text-foreground tabular-nums">{item.votes}</span>
                </span>
            </div>
        </article>
    )
}

export default function FeaturedResearch() {
    const [active, setActive] = useState(TABS[0].id)
    const items = TABS.find((tab) => tab.id === active)?.items ?? TABS[0].items

    return (
        <section id="riset" className="scroll-mt-24 border-t">
            <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                    <div className="max-w-2xl">
                        <p className="font-mono text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">Riset Unggulan</p>
                        <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance sm:text-4xl">Jelajahi riset yang sedang berjalan</h2>
                        <p className="mt-4 leading-relaxed text-muted-foreground">Riset populer dari kampus, lembaga riset, dan perusahaan.</p>
                    </div>

                    <Link href="/feed" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "shrink-0 rounded-full px-5")}>
                        Lihat semua
                        <ArrowRight />
                    </Link>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-2">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActive(tab.id)}
                            aria-pressed={active === tab.id}
                            className={cn(
                                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                                active === tab.id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {items.map((item) => (
                        <ResearchCard key={item.title} item={item} />
                    ))}
                </div>
            </div>
        </section>
    )
}
