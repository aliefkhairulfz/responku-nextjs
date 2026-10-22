"use client"

import {
    ArrowUpRightIcon,
    CircleHelpIcon,
    LayoutDashboardIcon,
    type LucideIcon,
    Loader2,
    MenuIcon,
    Microscope,
    SettingsIcon,
    UserCheckIcon,
    Wallet,
    XIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { type ReactNode, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
import { postJson } from "@/lib/api-client"
import { DashboardStoreProvider, useDashboardStore } from "@/lib/stores/dashboard-store-provider"
import { cn } from "@/lib/cn"

/** The one menu entry that creates something instead of opening a fixed page. */
const CREATE_RESEARCH_PATH = "create-research"

type MenuItem = {
    label: string
    icon: LucideIcon
    highlight?: boolean
    url: string
}

const menus: MenuItem[] = [
    { label: "Dashboard", icon: LayoutDashboardIcon, url: "dashboard" },
    {
        label: "Profil & Verifikasi",
        icon: UserCheckIcon,
        highlight: true,
        url: "profile",
    },
    {
        label: "Saldo Dompet",
        icon: Wallet,
        url: "dashboard/wallet-balance",
    },
    {
        label: "Buat Riset",
        icon: Microscope,
        highlight: true,
        url: CREATE_RESEARCH_PATH,
    },
]

const menus2nd: MenuItem[] = [
    {
        label: "Pengaturan Akun",
        icon: SettingsIcon,
        highlight: true,
        url: "account-settings",
    },
    {
        label: "Pusat Bantuan",
        icon: CircleHelpIcon,
        highlight: true,
        url: "help-center",
    },
]

const user = {
    name: "John Doe",
    image: "",
}

function MenuList({ items, open, onItemClick, pathnames }: { items: MenuItem[]; open: boolean; onItemClick?: () => void; pathnames: string[] }) {
    const router = useRouter()
    const [creating, setCreating] = useState(false)
    const hideOnCollapse = open ? "opacity-100" : "md:opacity-0"

    /**
     * "Buat Riset" creates a draft and opens it: the editor lives at
     * `/create-research/{id}`, so there is no URL to link to until the draft exists.
     *
     * The request carries no body — the backend owns the draft's initial shape.
     */
    async function createResearch(): Promise<void> {
        // Each call makes a row, so a second click while one is in flight is refused.
        if (creating) return

        setCreating(true)
        const result = await postJson<{ research: { id: string } }>("/api/research/create")

        if (!result.ok) {
            setCreating(false)

            if (result.statusCode === 401) {
                router.replace("/login")
                return
            }

            toast.add({
                type: "error",
                title: "Gagal membuat riset",
                description: result.statusCode === 403 ? "Akunmu belum punya akses peneliti." : result.message,
            })
            return
        }

        const researchId = result.data?.research.id

        if (researchId === undefined) {
            setCreating(false)
            toast.add({ type: "error", title: "Gagal membuat riset", description: "Server tidak mengembalikan id riset." })
            return
        }

        toast.add({ type: "success", title: "Draft riset dibuat", description: "Melanjutkan ke editor kuesioner." })
        router.push(`/create-research/${researchId}`)
    }

    return (
        <ul className="flex flex-col gap-1">
            {items.map(({ label, icon: Icon, highlight, url }) => {
                const urls = url.split("/").filter((c) => c !== "")
                const isActive = urls.every((c) => pathnames.includes(c))

                // "Buat Riset" is an action, not a destination, so it is a plain button
                // instead of a link to a page that has no draft to open yet.
                if (url === CREATE_RESEARCH_PATH) {
                    return (
                        <button
                            type="button"
                            key={label}
                            title={label}
                            disabled={creating}
                            onClick={() => {
                                onItemClick?.()
                                void createResearch()
                            }}
                            className={`w-full h-10 flex items-center gap-3 px-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                            {creating ? <Loader2 className="size-5 shrink-0 animate-spin" /> : <Icon className="size-5 shrink-0" />}
                            <span className={`whitespace-nowrap transition-opacity duration-200 font-medium ${hideOnCollapse}`}>{label}</span>
                            {highlight && (
                                <ArrowUpRightIcon className={`size-4 shrink-0 ml-auto transition-opacity duration-200 ${hideOnCollapse}`} />
                            )}
                        </button>
                    )
                }

                return (
                    <Link
                        href={`/${url}`}
                        key={label}
                        className={`${isActive && urls.length === pathnames.length ? "bg-primary text-white rounded-md" : ""}`}
                    >
                        <button
                            type="button"
                            title={label}
                            onClick={onItemClick}
                            className={`w-full h-10 flex items-center gap-3 px-3 text-sm transition-colors`}
                        >
                            <Icon className="size-5 shrink-0" />
                            <span className={`whitespace-nowrap transition-opacity duration-200 font-medium ${hideOnCollapse}`}>{label}</span>
                            {highlight && (
                                <ArrowUpRightIcon className={`size-4 shrink-0 ml-auto transition-opacity duration-200 ${hideOnCollapse}`} />
                            )}
                        </button>
                    </Link>
                )
            })}
        </ul>
    )
}

export default function Layout({ children }: { children: ReactNode }) {
    const pathname = usePathname()

    return (
        <DashboardStoreProvider>
            <LayoutChildren pathname={pathname}>
                <div className="w-full p-6 overflow-auto">{children}</div>
            </LayoutChildren>
        </DashboardStoreProvider>
    )
}

function LayoutChildren({ pathname, children }: { pathname: string; children: ReactNode }) {
    const [open, setOpen] = useState(true)
    const [mobileOpen, setMobileOpen] = useState(false)

    // stores
    const userMode = useDashboardStore((s) => s.userMode)
    const setMode = useDashboardStore((s) => s.setMode)

    return (
        <div className="w-full h-dvh flex md:divide-x overflow-hidden">
            {/* aside */}
            <aside
                className={cn(
                    "fixed inset-x-0 top-0 z-50 h-dvh bg-background flex flex-col transition-transform duration-200 ease-in-out",
                    mobileOpen ? "translate-y-0" : "-translate-y-full",
                    "md:static md:z-auto md:h-full md:shrink-0 md:translate-y-0 md:overflow-hidden md:transition-all",
                    open ? "md:w-64" : "md:w-15",
                )}
            >
                {/* title */}
                <div className="h-15 shrink-0 flex items-center justify-between px-6">
                    <span className={`text-lg font-bold whitespace-nowrap transition-opacity duration-200 ${open ? "opacity-100" : "md:opacity-0"}`}>
                        {mobileOpen ? "R" : "Responku"}
                    </span>

                    <div className="flex items-center space-x-2">
                        <div className={`items-center space-x-2 ${mobileOpen ? "flex" : "hidden"}`}>
                            <Switch
                                id="user-mode"
                                checked={userMode === "peneliti"}
                                onCheckedChange={(checked) => setMode(checked ? "peneliti" : "responden")}
                            />
                            <Label htmlFor="user-mode">Mode Peneliti</Label>
                        </div>

                        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(false)} aria-label="Tutup menu">
                            <XIcon />
                        </Button>
                    </div>
                </div>

                {/* menu */}
                <nav className={cn("flex-1 overflow-y-auto px-4 py-4 transition-all duration-200", !open && "md:px-2")}>
                    <MenuList
                        items={menus}
                        open={open}
                        onItemClick={() => setMobileOpen(false)}
                        pathnames={pathname.split("/").filter((c) => c !== "")}
                    />

                    {/* separator */}
                    <div className="my-3 border-t" />

                    <MenuList
                        items={menus2nd}
                        open={open}
                        onItemClick={() => setMobileOpen(false)}
                        pathnames={pathname.split("/").filter((c) => c !== "")}
                    />
                </nav>

                {/* user */}
                <div className="shrink-0 border-t p-2">
                    <div title={user.name} className="h-12 flex items-center gap-3 px-2 rounded-md">
                        <Avatar className="size-8 shrink-0">
                            <AvatarImage src={user.image} alt={user.name} />
                            <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span
                            className={`text-sm font-medium whitespace-nowrap transition-opacity duration-200 ${open ? "opacity-100" : "md:opacity-0"}`}
                        >
                            {user.name}
                        </span>
                    </div>
                </div>
            </aside>

            {/* right */}
            <div className="h-full w-full min-w-0 flex flex-col divide-y">
                {/* head */}
                <div className="h-15 shrink-0 w-full flex items-center gap-3 px-4">
                    {/* toggle mobile */}
                    <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Buka menu">
                        <MenuIcon />
                    </Button>

                    {/* toggle desktop */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="hidden md:inline-flex"
                        onClick={() => setOpen((old) => !old)}
                        aria-label="Toggle sidebar"
                    >
                        <MenuIcon />
                    </Button>

                    {/* search */}
                    {/*<div className="relative w-full min-w-0 max-w-sm">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Cari..."
                            className="pl-9"
                        />
                    </div>*/}

                    {/* right actions */}
                    <div className="ml-auto flex shrink-0 items-center gap-6">
                        <div className={`hidden lg:flex items-center space-x-2`}>
                            <Switch
                                id="user-mode"
                                checked={userMode === "peneliti"}
                                onCheckedChange={(checked) => setMode(checked ? "peneliti" : "responden")}
                            />
                            <Label htmlFor="user-mode">Mode Peneliti</Label>
                        </div>

                        {/* calendar */}
                        {/*<Popover>
                            <PopoverTrigger
                                className={cn(
                                    buttonVariants({ variant: "outline" }),
                                    "font-normal",
                                )}
                            >
                                <CalendarIcon className="size-4" />
                                <span className="hidden sm:inline">
                                    {date
                                        ? date.toLocaleDateString("id-ID", {
                                              day: "numeric",
                                              month: "short",
                                              year: "numeric",
                                          })
                                        : "Kalender"}
                                </span>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                />
                            </PopoverContent>
                        </Popover>*/}

                        {/* user */}
                        <Link href="/profile" title="Pengaturan profil" aria-label="Pengaturan profil" className="rounded-full">
                            <Avatar className="size-9">
                                <AvatarImage src={user.image} alt={user.name} />
                                <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                        </Link>
                    </div>
                </div>

                {/* main */}
                {children}
            </div>
        </div>
    )
}
