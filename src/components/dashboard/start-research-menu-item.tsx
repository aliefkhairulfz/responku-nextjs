"use client"

import { ArrowUpRightIcon, FileText, Loader2, Plus, type LucideIcon } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/toast"
import { getJson, postJson } from "@/lib/api-client"
import type { ResearchSummary } from "@/lib/api-types"

/** Longest draft list the picker will offer. */
const PICKER_LIMIT = 20

function touchedAt(value: string) {
    return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
}

/**
 * The "Buat Riset" sidebar entry.
 *
 * Creating is an action rather than a destination — there is no editor URL until a
 * draft exists — and clicking "Buat Riset" is often really "continue what I was
 * working on". So the click looks for drafts first: with none it creates one
 * straight away, and with some it asks which the researcher meant, instead of
 * quietly leaving another empty draft behind every time.
 */
export function StartResearchMenuItem({
    label,
    icon: Icon,
    highlight,
    open,
    onItemClick,
}: {
    label: string
    icon: LucideIcon
    highlight?: boolean
    open: boolean
    onItemClick?: () => void
}) {
    const router = useRouter()
    const pathname = usePathname()
    const [loading, setLoading] = useState(false)
    const [creating, setCreating] = useState(false)
    // Non-null exactly while the picker is open.
    const [drafts, setDrafts] = useState<ResearchSummary[] | null>(null)
    /** Bumped whenever the route moves on, so a late answer can be recognised and dropped. */
    const attempt = useRef(0)
    /** The route this entry was last seen on, so only a real move clears the state. */
    const shownOn = useRef(pathname)

    const busy = loading || creating
    const hideOnCollapse = open ? "opacity-100" : "md:opacity-0"

    /**
     * This entry lives in a layout that outlives the route it sits on, so anything left
     * running when the route changes would come back with it: a spinner that never stops,
     * or a picker opening over whatever page a late answer lands on.
     */
    useEffect(() => {
        if (shownOn.current === pathname) return

        shownOn.current = pathname
        attempt.current += 1

        setLoading(false)
        setCreating(false)
        setDrafts(null)
    }, [pathname])

    function reportFailure(title: string, result: { statusCode: number; message: string }) {
        if (result.statusCode === 401) {
            router.replace("/login")
            return
        }

        toast.add({ type: "error", title, description: result.statusCode === 403 ? "Akunmu belum punya akses peneliti." : result.message })
    }

    async function start(): Promise<void> {
        if (busy) return

        const mine = attempt.current
        setLoading(true)
        const result = await getJson<{ researches: ResearchSummary[] }>(`/api/research?status=DRAFT&take=${PICKER_LIMIT}`)

        // The route moved on while this was in flight, so the answer is not ours to apply.
        if (attempt.current !== mine) return

        setLoading(false)

        if (!result.ok) {
            reportFailure("Gagal memuat draft riset", result)
            return
        }

        const found = result.data?.researches ?? []

        // Nothing to continue, so there is nothing to ask about.
        if (found.length === 0) {
            await create()
            return
        }

        setDrafts(found)
    }

    /**
     * Leaves for the editor with nothing left running behind: the spinner has to be
     * cleared *before* the push, because the route being left keeps its tree — and would
     * hand the spinner back on the way in again.
     */
    function openEditor(researchId: string) {
        setLoading(false)
        setCreating(false)
        setDrafts(null)
        router.push(`/create-research/${researchId}`)
    }

    async function create(): Promise<void> {
        if (creating) return

        const mine = attempt.current
        setCreating(true)
        // No body: the backend owns the draft's initial shape.
        const result = await postJson<{ research: { id: string } }>("/api/research/create")

        if (attempt.current !== mine) return

        if (!result.ok) {
            setCreating(false)
            reportFailure("Gagal membuat riset", result)
            return
        }

        const researchId = result.data?.research.id

        if (researchId === undefined) {
            setCreating(false)
            toast.add({ type: "error", title: "Gagal membuat riset", description: "Server tidak mengembalikan id riset." })
            return
        }

        toast.add({ type: "success", title: "Draft riset dibuat", description: "Melanjutkan ke editor kuesioner." })
        openEditor(researchId)
    }

    return (
        <>
            <button
                type="button"
                title={label}
                disabled={busy}
                onClick={() => {
                    onItemClick?.()
                    void start()
                }}
                className={`w-full h-10 flex items-center gap-3 px-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
            >
                {busy ? <Loader2 className="size-5 shrink-0 animate-spin" /> : <Icon className="size-5 shrink-0" />}
                <span className={`whitespace-nowrap transition-opacity duration-200 font-medium ${hideOnCollapse}`}>{label}</span>
                {highlight && <ArrowUpRightIcon className={`size-4 shrink-0 ml-auto transition-opacity duration-200 ${hideOnCollapse}`} />}
            </button>

            <Dialog
                open={drafts !== null}
                onOpenChange={(next) => {
                    if (!next) setDrafts(null)
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Lanjutkan draft atau mulai baru?</DialogTitle>
                        <DialogDescription>Kamu masih punya {drafts?.length ?? 0} draft riset yang belum dipublikasikan.</DialogDescription>
                    </DialogHeader>

                    <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
                        {(drafts ?? []).map((draft) => (
                            <li key={draft.id}>
                                <button
                                    type="button"
                                    onClick={() => openEditor(draft.id)}
                                    className="flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                                >
                                    <FileText className="size-4 shrink-0 text-muted-foreground" />

                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-medium">
                                            {draft.title.trim() === "" ? "Draft tanpa judul" : draft.title}
                                        </span>
                                        <span className="block text-xs text-muted-foreground">
                                            {draft.questionCount} pertanyaan · diperbarui {touchedAt(draft.updatedAt)}
                                        </span>
                                    </span>

                                    <ArrowUpRightIcon className="size-4 shrink-0 text-muted-foreground" />
                                </button>
                            </li>
                        ))}
                    </ul>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDrafts(null)}>
                            Batal
                        </Button>

                        <Button type="button" disabled={creating} onClick={() => void create()}>
                            {creating ? <Loader2 className="animate-spin" /> : <Plus />}
                            Buat riset baru
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
