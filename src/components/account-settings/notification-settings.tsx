"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

const notificationGroups = [
    {
        title: "Channel Notifikasi",
        options: [
            {
                id: "email",
                label: "Notifikasi Email",
                description: "Terima update melalui email terdaftar",
            },
            {
                id: "push",
                label: "Push Notification",
                description: "Notifikasi langsung di browser",
            },
        ],
    },
    {
        title: "Jenis Notifikasi",
        options: [
            {
                id: "surveyReminder",
                label: "Pengingat Survei",
                description: "Reminder untuk survei yang belum dikerjakan",
            },
            {
                id: "reward",
                label: "Reward & Pencairan",
                description: "Notifikasi saat token reward masuk atau dicairkan",
            },
            {
                id: "weeklySummary",
                label: "Ringkasan Mingguan",
                description: "Email digest mingguan aktivitas akun",
            },
            {
                id: "promotion",
                label: "Info & Promo",
                description: "Update produk, tips, dan penawaran khusus",
            },
        ],
    },
] as const;

type NotificationId = (typeof notificationGroups)[number]["options"][number]["id"];

export default function NotificationSettings() {
    const [preferences, setPreferences] = useState<Record<NotificationId, boolean>>({
        email: true,
        push: true,
        surveyReminder: true,
        reward: true,
        weeklySummary: false,
        promotion: false,
    });

    const handleSave = () => {
        console.log("Preferensi notifikasi:", preferences);
    };

    return (
        <div>
            <h3 className="text-xl font-semibold leading-snug">Preferensi Notifikasi</h3>
            <p className="leading-relaxed text-muted-foreground">Kontrol jenis notifikasi yang ingin Anda terima.</p>

            <Separator className="my-4" />

            <div className="max-w-xl space-y-6">
                {notificationGroups.map((group, groupIndex) => (
                    <section key={group.title} className="space-y-6">
                        <h3 className="font-medium">{group.title}</h3>

                        <div className="space-y-5">
                            {group.options.map((option, index) => (
                                <div key={option.id}>
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <Label htmlFor={option.id} className="font-medium">
                                                {option.label}
                                            </Label>
                                            <p className="text-sm text-muted-foreground">{option.description}</p>
                                        </div>

                                        <Switch
                                            id={option.id}
                                            checked={preferences[option.id]}
                                            onCheckedChange={(checked) =>
                                                setPreferences((current) => ({
                                                    ...current,
                                                    [option.id]: checked,
                                                }))
                                            }
                                        />
                                    </div>

                                    {index < group.options.length - 1 && <Separator className="mt-5" />}
                                </div>
                            ))}
                        </div>

                        {groupIndex < notificationGroups.length - 1 && <Separator className="mt-6" />}
                    </section>
                ))}

                <Button onClick={handleSave}>Simpan Preferensi</Button>
            </div>
        </div>
    );
}
