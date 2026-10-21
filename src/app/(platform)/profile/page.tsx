"use client";

import IdentityData from "@/components/profile/identity-data";
import DataPrivacyRights from "@/components/profile/data-privacy-rights";
import SecurityAndPassword from "@/components/profile/security-and-password";
import DemographicProfile from "@/components/profile/demographic-profile";
import { LockKeyhole, ShieldCheck, UserRound, Users } from "lucide-react";
import { useState } from "react";

const menuItems = [
    { label: "Data Identitas", icon: UserRound },
    { label: "Demografi & UU", icon: Users },
    { label: "Keamanan & Sandi", icon: ShieldCheck },
    { label: "Hak Privasi Data", icon: LockKeyhole },
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
    const [activeMenu, setActiveMenu] = useState("Data Identitas");

    return (
        <main className="container2nd mx-auto mt-15 grid h-[calc(100dvh-60px)] grid-rows-[auto_1fr] md:grid-cols-[240px_minmax(0,1fr)] md:grid-rows-1">
            <aside className="min-h-0 border-b md:border-b-0 py-4 md:pr-4 md:py-4 md:border-r">
                <MenuList activeMenu={activeMenu} onMenuChange={setActiveMenu} />
            </aside>

            <section className="min-h-0 overflow-y-auto px-2 py-4 pb-16 md:pl-4">
                {activeMenu === "Data Identitas" && <IdentityData />}
                {activeMenu === "Demografi & UU" && <DemographicProfile />}
                {activeMenu === "Keamanan & Sandi" && <SecurityAndPassword />}
                {activeMenu === "Hak Privasi Data" && <DataPrivacyRights />}
            </section>
        </main>
    );
}
