"use client";

import { Bell, LayoutDashboard, Settings, ShieldCheck, Smartphone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import PengaturanNotifikasi from "@/components/pengaturan-akun/pengaturan-notifikasi";
import PengaturanUmum from "@/components/pengaturan-akun/pengaturan-umum";
import PrivasiKeamanan from "@/components/pengaturan-akun/privasi-keamanan";
import SesiAktif from "@/components/pengaturan-akun/sesi-aktif";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const menuItems = [
    { label: "Umum", icon: Settings },
    { label: "Notifikasi", icon: Bell },
    { label: "Privasi & Keamanan", icon: ShieldCheck },
    { label: "Sesi Aktif", icon: Smartphone },
];

function MenuList({ activeMenu, onMenuChange }: { activeMenu: string; onMenuChange: (label: string) => void }) {
    return (
        <ul className="flex flex-col gap-1">
            {menuItems.map(({ label, icon: Icon }) => (
                <li key={label}>
                    <button
                        type="button"
                        onClick={() => onMenuChange(label)}
                        className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition-colors ${
                            activeMenu === label ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
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

export default function Page() {
    const [activeMenu, setActiveMenu] = useState("Umum");

    return (
        <div className="h-dvh w-full overflow-hidden">
            <header className="fixed inset-x-0 top-0 z-10 h-15 border-b bg-background px-2 md:px-0">
                <nav className="container2nd mx-auto flex h-full items-center justify-between">
                    <div className="flex h-4 items-center space-x-2">
                        <h3 className="whitespace-nowrap text-lg font-bold">Responku</h3>
                        <Separator orientation="vertical" />
                        <span className="leading-relaxed text-muted-foreground">pengaturan akun</span>
                    </div>

                    <Link href="/dashboard">
                        <Button variant="outline">
                            <LayoutDashboard className="size-4" />
                            <span>Dashboard</span>
                        </Button>
                    </Link>
                </nav>
            </header>

            <main className="container2nd mx-auto mt-15 grid h-[calc(100dvh-60px)] grid-rows-[auto_1fr] md:grid-cols-[240px_minmax(0,1fr)] md:grid-rows-1">
                <aside className="min-h-0 border-b py-4 md:border-r md:border-b-0 md:py-4 md:pr-4">
                    <MenuList activeMenu={activeMenu} onMenuChange={setActiveMenu} />
                </aside>

                <section className="min-h-0 overflow-y-auto px-2 py-4 pb-16 md:pl-4">
                    {activeMenu === "Umum" && <PengaturanUmum />}
                    {activeMenu === "Notifikasi" && <PengaturanNotifikasi />}
                    {activeMenu === "Privasi & Keamanan" && <PrivasiKeamanan />}
                    {activeMenu === "Sesi Aktif" && <SesiAktif />}
                </section>
            </main>
        </div>
    );
}
