"use client";

import { Download, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function DataPrivacyRights() {
    const [withdrawingConsent, setWithdrawingConsent] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);

    const handleExportData = async () => {
        console.log("Export data requested");
    };

    const handleWithdrawConsent = async () => {
        setWithdrawingConsent(true);
        try {
            console.log("Withdraw consent requested");
        } finally {
            setWithdrawingConsent(false);
        }
    };

    const handleDeleteAccount = async () => {
        setDeletingAccount(true);
        try {
            console.log("Delete account requested");
        } finally {
            setDeletingAccount(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold">Hak Pemilik Data Pribadi</h2>
                <p className="text-muted-foreground">Sesuai UU PDP No. 27/2022, Anda memiliki kendali penuh atas data.</p>
            </div>

            <Separator className="my-4" />

            <section className="space-y-2">
                <h3 className="font-medium">Ekspor Salinan Data</h3>
                <p className="text-muted-foreground">Unduh arsip lengkap profil, riwayat riset, dan mutasi token.</p>
                <Button type="button" variant="outline" onClick={handleExportData}>
                    <Download />
                    Ekspor Data
                </Button>
            </section>

            <Separator className="my-4" />

            <section className="space-y-2">
                <h3 className="font-medium">Tarik Persetujuan Pemrosesan</h3>
                <p className="text-muted-foreground">Membatasi sistem agar tidak menggunakan data untuk pencocokan riset baru.</p>

                <AlertDialog>
                    <AlertDialogTrigger>
                        <Button nativeButton={false} render={<div />} type="button" variant="outline">
                            <ShieldCheck />
                            Tarik Persetujuan
                        </Button>
                    </AlertDialogTrigger>

                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Tarik persetujuan pemrosesan data?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Data Anda tidak akan digunakan untuk pencocokan riset baru setelah permintaan berhasil diproses. Fitur yang bergantung
                                pada pencocokan riset mungkin tidak tersedia.
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction disabled={withdrawingConsent} onClick={handleWithdrawConsent}>
                                {withdrawingConsent ? "Memproses..." : "Ya, Tarik Persetujuan"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </section>

            <Separator className="my-4" />

            <section className="space-y-2">
                <h3 className="font-medium">Hapus Akun Permanen</h3>
                <p className="text-muted-foreground">Data dihapus permanen. Transaksi finansial dianonimkan untuk audit.</p>

                <AlertDialog>
                    <AlertDialogTrigger>
                        <Button nativeButton={false} render={<div />} type="button" variant="destructive">
                            <Trash2 />
                            Hapus Akun
                        </Button>
                    </AlertDialogTrigger>

                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Hapus akun secara permanen?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Tindakan ini tidak dapat dibatalkan. Pastikan Anda sudah mengekspor data yang diperlukan. Catatan transaksi yang wajib
                                disimpan akan ditangani sesuai ketentuan yang berlaku.
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction disabled={deletingAccount} onClick={handleDeleteAccount}>
                                {deletingAccount ? "Menghapus..." : "Ya, Hapus Akun"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </section>
        </div>
    );
}
