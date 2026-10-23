'use client'

import { Loader2, Search } from 'lucide-react'
import { useCallback, useState } from 'react'
import { AdminPanel } from '@/components/admin/admin-panel'
import {
    QueueEmpty,
    QueueError,
    QueueForbidden,
    QueueLoading,
} from '@/components/admin/queue-states'
import { type AdminListState, useAdminList } from '@/components/admin/use-admin-data'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'
import { getJson, patchJson } from '@/lib/api-client'
import type { AdminUser } from '@/lib/api-types'
import { isRole, ROLES, type Role, roleLabel } from '@/lib/roles'

async function readUsers(search: string): Promise<AdminListState<AdminUser>> {
    const query = search.trim() === '' ? '' : `&search=${encodeURIComponent(search.trim())}`
    const result = await getJson<{ users: AdminUser[] }>(`/api/admin/users?take=100${query}`)

    if (result.statusCode === 401) return { status: 'unauthorized' }
    if (result.statusCode === 403) return { status: 'forbidden' }
    if (!result.ok || result.data === null) return { status: 'error', message: result.message }

    return { status: 'ready', items: result.data.users }
}

/**
 * The user list, with role editing.
 *
 * Roles are written as a whole list, because that is what this screen edits — a checkbox
 * set, not a single grant. An empty set is allowed: it locks the account out of every
 * role-gated screen without deleting anything, which is a reversible way to disable one.
 */
export default function AdminUsersPanel() {
    const [term, setTerm] = useState('')
    const [search, setSearch] = useState('')
    const [edits, setEdits] = useState<Record<string, Role[]>>({})
    const [busyId, setBusyId] = useState<string | null>(null)

    // The applied search is the dependency, not the input, so the list is only re-read when
    // the form is submitted rather than on every keystroke.
    const load = useCallback(() => readUsers(search), [search])
    const { state, reload } = useAdminList(load)

    const rolesOf = (user: AdminUser): Role[] => edits[user.id] ?? user.roles.filter(isRole)

    function toggle(user: AdminUser, role: Role) {
        const current = rolesOf(user)
        const next = current.includes(role)
            ? current.filter((item) => item !== role)
            : [...current, role]

        setEdits((old) => ({ ...old, [user.id]: next }))
    }

    async function save(user: AdminUser) {
        setBusyId(user.id)
        const result = await patchJson(`/api/admin/users/${user.id}/roles`, {
            roles: rolesOf(user),
        })
        setBusyId(null)

        if (!result.ok) {
            toast.add({
                type: 'error',
                title: 'Gagal menyimpan peran',
                description: result.message,
            })
            return
        }

        toast.add({
            type: 'success',
            title: 'Peran diperbarui',
            description: `Peran ${user.name} sudah disimpan.`,
        })
        setEdits((old) => {
            const next = { ...old }
            delete next[user.id]
            return next
        })
        reload()
    }

    return (
        <AdminPanel
            title="Pengguna"
            description="Cari akun dan atur perannya. Peran kosong mengunci akses tanpa menghapus akun."
            onRefresh={reload}
        >
            <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={(event) => {
                    event.preventDefault()
                    setSearch(term)
                }}
            >
                <Input
                    type="search"
                    placeholder="Cari nama atau email…"
                    value={term}
                    onChange={(event) => setTerm(event.target.value)}
                    className="max-w-sm"
                />
                <Button type="submit" variant="outline">
                    <Search />
                    Cari
                </Button>
            </form>

            {state.status === 'loading' && <QueueLoading label="Memuat pengguna…" />}
            {state.status === 'forbidden' && <QueueForbidden />}
            {state.status === 'error' && <QueueError message={state.message} onRetry={reload} />}
            {state.status === 'ready' && state.items.length === 0 && (
                <QueueEmpty message="Tidak ada pengguna yang cocok." />
            )}

            {state.status === 'ready' && state.items.length > 0 && (
                <div className="space-y-3">
                    {state.items.map((user) => {
                        const roles = rolesOf(user)
                        const dirty = edits[user.id] !== undefined

                        return (
                            <Card key={user.id}>
                                <CardHeader className="grid-cols-[auto_1fr] items-center gap-3">
                                    <Avatar className="size-10">
                                        <AvatarImage
                                            src={user.image ?? undefined}
                                            alt={user.name}
                                        />
                                        <AvatarFallback>
                                            {user.name.trim().charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="min-w-0">
                                        <CardTitle className="truncate">{user.name}</CardTitle>
                                        <p className="truncate text-sm text-muted-foreground">
                                            {user.email}
                                        </p>
                                    </div>
                                </CardHeader>

                                <CardContent>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {user.verifiedAt === null ? (
                                            <Badge variant="outline">Belum verifikasi</Badge>
                                        ) : (
                                            <Badge variant="secondary">Terverifikasi</Badge>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-4">
                                        {ROLES.map((role) => (
                                            <div key={role} className="flex items-center gap-2">
                                                <Checkbox
                                                    id={`${user.id}-${role}`}
                                                    checked={roles.includes(role)}
                                                    onCheckedChange={() => toggle(user, role)}
                                                />
                                                <Label
                                                    htmlFor={`${user.id}-${role}`}
                                                    className="font-normal"
                                                >
                                                    {roleLabel(role)}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>

                                    <div>
                                        <Button
                                            size="sm"
                                            disabled={!dirty || busyId === user.id}
                                            onClick={() => save(user)}
                                        >
                                            {busyId === user.id && (
                                                <Loader2 className="animate-spin" />
                                            )}
                                            Simpan peran
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </AdminPanel>
    )
}
