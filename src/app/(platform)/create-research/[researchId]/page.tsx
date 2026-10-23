"use client"

import { Eye, LayoutDashboard, PencilLine, RefreshCw, Send, Trash2 } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import * as AlertDialog from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/toast"
import { getJson } from "@/lib/api-client"
import type { ResearchDetail } from "@/lib/api-types"
import { deleteResearch, publishResearch, saveResearch, toEditorValues } from "@/lib/editor-engine/research-editor-api"
import ResearchEditorEngine from "@/lib/editor-engine/research-editor-engine"
import ResearchEditorPreview from "@/lib/editor-engine/research-editor-preview"
import { useResearchEditorForm, type EditorAction, type EditorValues } from "@/lib/editor-engine/research-editor-schema"
import Loading from "./loading"

const menuItems = [
    { label: "Editor Kuesioner", icon: PencilLine },
    { label: "Preview Kuesioner", icon: Eye },
]

type MenuListProps = {
    activeMenu: string
    onMenuChange: (label: string) => void
}

function MenuList({ activeMenu, onMenuChange }: MenuListProps) {
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
    )
}

/**
 * Loading, failed, or loaded — the worksheet only exists in the last case, because
 * its form is created from whatever the API has stored.
 */
type ResearchState =
    | { status: "loading" }
    | { status: "ready"; research: ResearchDetail }
    | { status: "missing" }
    | { status: "unauthorized" }
    | { status: "error"; message: string }

/**
 * Reads one research and answers with the state to show.
 *
 * Returning the state rather than setting it keeps this free of React, and lets the
 * effect apply the answer in a callback — which is where an effect is allowed to put
 * state.
 */
async function readResearch(researchId: string | undefined): Promise<ResearchState> {
    if (researchId === undefined) return { status: "missing" }

    const result = await getJson<{ research: ResearchDetail }>(`/api/research/${researchId}`)

    if (result.statusCode === 401) return { status: "unauthorized" }
    if (result.statusCode === 404) return { status: "missing" }
    if (!result.ok || result.data?.research === undefined) return { status: "error", message: result.message }

    return { status: "ready", research: result.data.research }
}

/**
 * The editor writes through three endpoints, in the order the API needs them: the
 * scalars, then the criteria, then the questionnaire. Publishing is a fourth call,
 * and it is what reserves the tokens — so it is only ever reached after the first
 * three have gone through.
 */
function Worksheet({ research, activeMenu, disabled }: { research: ResearchDetail; activeMenu: string; disabled: boolean }) {
    const router = useRouter()
    const [confirmingPublish, setConfirmingPublish] = useState<EditorValues | null>(null)
    const [publishing, setPublishing] = useState(false)

    /** Saves what is on screen and says whether it went through. */
    const persist = useCallback(
        async (values: EditorValues) => {
            const saved = await saveResearch(research.id, values)

            if (!saved.ok) {
                toast.add({ type: "error", title: "Gagal menyimpan kuesioner", description: saved.message })
                return false
            }

            return true
        },
        [research.id],
    )

    const handleSubmit = useCallback(
        async (values: EditorValues, action: EditorAction) => {
            // Publishing commits tokens and cannot be undone, so the button asks first;
            // the writing happens once the answer is yes.
            if (action === "publish") {
                setConfirmingPublish(values)
                return
            }

            if (await persist(values)) {
                toast.add({ type: "success", title: "Draft tersimpan", description: "Perubahan kuesioner sudah disimpan." })
            }
        },
        [persist],
    )

    const researchEditorForm = useResearchEditorForm(handleSubmit, toEditorValues(research))

    async function publish() {
        const values = confirmingPublish
        setConfirmingPublish(null)

        if (values === null) return

        setPublishing(true)
        const saved = await persist(values)

        if (!saved) {
            setPublishing(false)
            return
        }

        const result = await publishResearch(research.id)

        setPublishing(false)

        if (!result.ok) {
            toast.add({ type: "error", title: "Gagal mempublikasikan", description: result.message })
            return
        }

        toast.add({ type: "success", title: "Kuesioner dipublikasikan", description: "Riset sudah bisa diisi responden." })

        // The editor is done with this research: publishing locks it, so the researcher is
        // sent back to the list where it now shows as published.
        router.push("/dashboard")
    }

    return (
        <>
            {activeMenu === "Editor Kuesioner" && <ResearchEditorEngine researchEditorForm={researchEditorForm} disabled={disabled} />}
            {activeMenu === "Preview Kuesioner" && <ResearchEditorPreview researchEditorForm={researchEditorForm} />}

            <AlertDialog.AlertDialog
                open={confirmingPublish !== null}
                onOpenChange={(open) => {
                    if (!open) setConfirmingPublish(null)
                }}
            >
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

                        <AlertDialog.AlertDialogAction disabled={publishing} onClick={() => void publish()}>
                            <Send className="mr-2 size-4" />
                            {publishing ? "Mempublikasikan..." : "Ya, Publish"}
                        </AlertDialog.AlertDialogAction>
                    </AlertDialog.AlertDialogFooter>
                </AlertDialog.AlertDialogContent>
            </AlertDialog.AlertDialog>
        </>
    )
}

export default function Page() {
    const router = useRouter()
    const { researchId } = useParams<{ researchId: string }>()
    const [activeMenu, setActiveMenu] = useState("Editor Kuesioner")
    const [confirmingDelete, setConfirmingDelete] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [state, setState] = useState<ResearchState>({ status: "loading" })

    useEffect(() => {
        let cancelled = false

        void readResearch(researchId).then((next) => {
            if (!cancelled) setState(next)
        })

        return () => {
            cancelled = true
        }
    }, [researchId])

    // Putting the spinner up is only needed when retrying: the first render is already the
    // loading state.
    const reload = useCallback(() => {
        setState({ status: "loading" })
        void readResearch(researchId).then(setState)
    }, [researchId])

    // An expired session belongs on the sign-in screen, not in an editor that cannot save.
    useEffect(() => {
        if (state.status === "unauthorized") router.replace("/login")
    }, [state.status, router])

    if (state.status === "loading" || state.status === "unauthorized") return <Loading />

    const frozen = state.status === "ready" && state.research.publishedAt !== null

    /** Removes this research: a draft that was never published goes for good, anything else is archived. */
    async function remove() {
        setConfirmingDelete(false)
        setDeleting(true)

        const result = await deleteResearch(researchId)

        setDeleting(false)

        if (!result.ok) {
            toast.add({ type: "error", title: "Gagal menghapus kuesioner", description: result.message })
            return
        }

        const released = result.tokensReleased > 0 ? ` ${result.tokensReleased.toLocaleString("id-ID")} token dilepas kembali ke wallet.` : ""

        toast.add({
            type: "success",
            title: result.softDeleted ? "Kuesioner diarsipkan" : "Kuesioner dihapus",
            description: result.softDeleted
                ? `Riset ini sudah pernah dipublikasikan, jadi hanya diarsipkan.${released}`
                : "Draft beserta pertanyaan dan kriterianya dihapus permanen.",
        })

        router.push("/dashboard")
    }

    return (
        <div className="h-dvh w-full overflow-hidden">
            <header className="fixed inset-x-0 top-0 z-10 h-15 border-b bg-background px-2 md:px-0">
                <nav className="container2nd mx-auto flex h-full items-center justify-between">
                    <div className="flex h-4 items-center space-x-2">
                        <Link href="/" className="whitespace-nowrap text-lg font-bold">
                            Responku
                        </Link>

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
                    <MenuList activeMenu={activeMenu} onMenuChange={setActiveMenu} />

                    <div className="my-3 border-t" />

                    {/* Not a tab, and deliberately outside the fieldset: a published research
                        cannot be edited but can still be archived. */}
                    <button
                        type="button"
                        onClick={() => setConfirmingDelete(true)}
                        className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                    >
                        <Trash2 className="size-5 shrink-0" />
                        <span>Hapus Kuesioner</span>
                    </button>
                </aside>

                <section className="overflow-y-auto p-4">
                    {state.status === "missing" && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Riset tidak ditemukan</CardTitle>
                                <CardDescription>Risetnya sudah dihapus, atau memang bukan milik akun ini.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Link href="/dashboard">
                                    <Button variant="outline">
                                        <LayoutDashboard className="size-4" />
                                        <span>Kembali ke dashboard</span>
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    )}

                    {state.status === "error" && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Gagal memuat riset</CardTitle>
                                <CardDescription>{state.message}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button variant="outline" onClick={reload}>
                                    <RefreshCw className="size-4" />
                                    <span>Coba lagi</span>
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {state.status === "ready" && (
                        <>
                            {frozen && (
                                <Card className="mb-4">
                                    <CardHeader>
                                        <CardTitle>Kuesioner sudah dikunci</CardTitle>
                                        <CardDescription>
                                            Riset ini sudah dipublikasikan, jadi isinya tidak bisa diubah lagi — supaya tidak berbeda dari yang sudah
                                            dilihat responden.
                                        </CardDescription>
                                    </CardHeader>
                                </Card>
                            )}

                            {/* Disabling the fieldset leaves every control inside it inert, so a
                                locked questionnaire cannot even be edited locally. */}
                            <fieldset disabled={frozen} className="contents">
                                <Worksheet research={state.research} activeMenu={activeMenu} disabled={frozen} />
                            </fieldset>
                        </>
                    )}
                </section>
            </main>

            <AlertDialog.AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
                <AlertDialog.AlertDialogContent>
                    <AlertDialog.AlertDialogHeader>
                        <AlertDialog.AlertDialogTitle>Hapus kuesioner ini?</AlertDialog.AlertDialogTitle>

                        <AlertDialog.AlertDialogDescription>
                            {frozen
                                ? "Riset ini sudah pernah dipublikasikan, jadi datanya tidak dihapus permanen: risetnya diarsipkan dan sisa anggaran reward yang belum terpakai dilepas kembali ke walletmu."
                                : "Draft ini belum pernah dipublikasikan, jadi pertanyaan, kriteria, dan seluruh isinya dihapus permanen. Tindakan ini tidak bisa dibatalkan."}
                        </AlertDialog.AlertDialogDescription>
                    </AlertDialog.AlertDialogHeader>

                    <AlertDialog.AlertDialogFooter>
                        <AlertDialog.AlertDialogCancel>Batal</AlertDialog.AlertDialogCancel>

                        <AlertDialog.AlertDialogAction disabled={deleting} onClick={() => void remove()}>
                            <Trash2 className="mr-2 size-4" />
                            {deleting ? "Menghapus..." : "Ya, Hapus"}
                        </AlertDialog.AlertDialogAction>
                    </AlertDialog.AlertDialogFooter>
                </AlertDialog.AlertDialogContent>
            </AlertDialog.AlertDialog>
        </div>
    )
}
