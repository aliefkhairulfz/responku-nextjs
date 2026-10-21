"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, LayoutDashboard, PencilLine, Send } from "lucide-react";

import ResearchEditorEngine from "@/lib/editor-engine/research-editor-engine";
import ResearchEditorPreview from "@/lib/editor-engine/research-editor-preview";
import { useResearchEditorForm } from "@/lib/editor-engine/research-editor-schema";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import * as AlertDialog from "@/components/ui/alert-dialog";

const menuItems = [
    { label: "Editor Kuesioner", icon: PencilLine },
    { label: "Preview Kuesioner", icon: Eye },
    { label: "Publish Kuesioner", icon: Send },
];

type MenuListProps = {
    activeMenu: string;
    onMenuChange: (label: string) => void;
    onPublish: () => void;
};

function MenuList({ activeMenu, onMenuChange, onPublish }: MenuListProps) {
    return (
        <ul className="flex flex-col gap-1">
            {menuItems.map(({ label, icon: Icon }) => {
                const isPublish = label === "Publish Kuesioner";

                return (
                    <li key={label}>
                        <button
                            type="button"
                            onClick={() => (isPublish ? onPublish() : onMenuChange(label))}
                            className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition-colors ${
                                activeMenu === label ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                        >
                            <Icon className="size-5 shrink-0" />
                            <span>{label}</span>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}

export default function Page() {
    const form = useResearchEditorForm();
    const [activeMenu, setActiveMenu] = useState("Editor Kuesioner");
    const [publishDialogOpen, setPublishDialogOpen] = useState(false);

    const handlePublish = () => {
        setPublishDialogOpen(false);

        // TODO: Panggil fungsi publish API di sini.
    };

    return (
        <div className="h-dvh w-full overflow-hidden">
            <header className="fixed inset-x-0 top-0 z-10 h-15 border-b bg-background px-2 md:px-0">
                <nav className="container2nd mx-auto flex h-full items-center justify-between">
                    <div className="flex h-4 items-center space-x-2">
                        <h3 className="whitespace-nowrap text-lg font-bold">Responku</h3>

                        <Separator orientation="vertical" />

                        <span className="leading-relaxed text-muted-foreground">buat kuesioner</span>
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
                <aside className="min-h-0 border-b py-4 md:border-b-0 md:border-r md:py-4 md:pr-4">
                    <MenuList activeMenu={activeMenu} onMenuChange={setActiveMenu} onPublish={() => setPublishDialogOpen(true)} />
                </aside>

                <section className="overflow-y-auto p-4">
                    {activeMenu === "Editor Kuesioner" && <ResearchEditorEngine researchEditorForm={form} />}
                    {activeMenu === "Preview Kuesioner" && <ResearchEditorPreview researchEditorForm={form} />}
                </section>
            </main>

            <AlertDialog.AlertDialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
                <AlertDialog.AlertDialogContent>
                    <AlertDialog.AlertDialogHeader>
                        <AlertDialog.AlertDialogTitle>Publish Kuesioner?</AlertDialog.AlertDialogTitle>

                        <AlertDialog.AlertDialogDescription>
                            Pastikan informasi, kriteria responden, dan pertanyaan kuesioner sudah benar sebelum dipublikasikan. Setelah
                            dipublikasikan, kuesioner dapat dibagikan kepada responden.
                        </AlertDialog.AlertDialogDescription>
                    </AlertDialog.AlertDialogHeader>

                    <AlertDialog.AlertDialogFooter>
                        <AlertDialog.AlertDialogCancel>Batal</AlertDialog.AlertDialogCancel>

                        <AlertDialog.AlertDialogAction onClick={handlePublish}>
                            <Send className="mr-2 size-4" />
                            Ya, Publish
                        </AlertDialog.AlertDialogAction>
                    </AlertDialog.AlertDialogFooter>
                </AlertDialog.AlertDialogContent>
            </AlertDialog.AlertDialog>
        </div>
    );
}
