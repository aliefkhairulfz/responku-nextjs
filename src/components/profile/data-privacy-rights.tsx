"use client"

import { Download, ShieldCheck, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
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
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/toast"
import { deleteJson, getJson } from "@/lib/api-client"
import type { AccountExport } from "@/lib/api-types"

export default function DataPrivacyRights() {
    const router = useRouter()
    const [exporting, setExporting] = useState(false)
    const [withdrawingConsent, setWithdrawingConsent] = useState(false)
    const [deletingAccount, setDeletingAccount] = useState(false)

    /**
     * Downloads the account's data as a JSON file.
     *
     * The archive is built in the browser from the API's answer rather than streamed from the
     * server, so the same endpoint can back a future "email me a copy" flow without changing
     * shape.
     */
    const handleExportData = async () => {
        setExporting(true)
        const result = await getJson<{ export: AccountExport }>("/api/user/export")
        setExporting(false)

        if (!result.ok || result.data === null) {
            toast.add({ type: "error", title: "Gagal mengekspor data", description: result.message })
            return
        }

        const blob = new Blob([JSON.stringify(result.data.export, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `responku-data-${new Date().toISOString().slice(0, 10)}.json`
        link.click()
        URL.revokeObjectURL(url)

        toast.add({ type: "success", title: "Data diekspor", description: "Arsip data akun sudah diunduh." })
    }

    const handleWithdrawConsent = async () => {
        setWithdrawingConsent(true)
        try {
            console.log("Withdraw consent requested")
        } finally {
            setWithdrawingConsent(false)
        }
    }

    /**
     * Erases the account, then sends the visitor to sign in.
     *
     * The API clears the session cookie as part of the deletion, so there is nothing left to
     * sign out of — the redirect is what stops the page from sitting on a session that no
     * longer resolves.
     */
    const handleDeleteAccount = async () => {
        setDeletingAccount(true)
        const result = await deleteJson("/api/user")
        setDeletingAccount(false)

        if (!result.ok) {
            toast.add({ type: "error", title: "Gagal menghapus akun", description: result.message })
            return
        }

        toast.add({ type: "success", title: "Akun dihapus", description: "Akun Anda sudah dihapus permanen." })
        router.replace("/login")
    }

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
                <Button type="button" variant="outline" disabled={exporting} onClick={handleExportData}>
                    <Download />
                    {exporting ? "Menyiapkan..." : "Ekspor Data"}
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
    )
}
