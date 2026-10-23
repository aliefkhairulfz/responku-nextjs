'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * What an admin read got to.
 *
 * `forbidden` is its own state rather than folded into `error`: a signed-in non-admin is a
 * different problem from a dead request, and the screen says so.
 */
export type AdminListState<T> =
    | { status: 'loading' }
    | { status: 'ready'; items: T[] }
    | { status: 'forbidden' }
    | { status: 'unauthorized' }
    | { status: 'error'; message: string }

export type AdminResourceState<T> =
    | { status: 'loading' }
    | { status: 'ready'; data: T }
    | { status: 'forbidden' }
    | { status: 'unauthorized' }
    | { status: 'error'; message: string }

/**
 * Runs one list read and hands back its state, with a `reload` for after an action.
 *
 * `load` has to be stable — a module-level function — because it is an effect dependency; a
 * fresh closure each render would re-run the read forever.
 */
export function useAdminList<T>(load: () => Promise<AdminListState<T>>) {
    const [state, setState] = useState<AdminListState<T>>({ status: 'loading' })

    useEffect(() => {
        let cancelled = false

        void load().then((next) => {
            if (!cancelled) setState(next)
        })

        return () => {
            cancelled = true
        }
    }, [load])

    const reload = useCallback(() => {
        setState({ status: 'loading' })
        void load().then(setState)
    }, [load])

    return { state, reload }
}

/** The same shape, for a read that answers with one object rather than a list. */
export function useAdminResource<T>(load: () => Promise<AdminResourceState<T>>) {
    const [state, setState] = useState<AdminResourceState<T>>({ status: 'loading' })

    useEffect(() => {
        let cancelled = false

        void load().then((next) => {
            if (!cancelled) setState(next)
        })

        return () => {
            cancelled = true
        }
    }, [load])

    const reload = useCallback(() => {
        setState({ status: 'loading' })
        void load().then(setState)
    }, [load])

    return { state, reload }
}
