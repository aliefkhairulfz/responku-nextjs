/**
 * Thin client for this app's own JSON API.
 *
 * Every endpoint answers with the same envelope, so this turns a request into one
 * plain result object instead of throwing: each screen decides for itself what a
 * validation error, a conflict, or a dead network should look like.
 */

export type ApiResult<T> = {
    /** Whether the endpoint reported success. */
    ok: boolean
    /** HTTP status, or `0` when the request never left the browser. */
    statusCode: number
    /** Message from the envelope, or a local fallback when the request failed. */
    message: string
    /** Per-field messages, keyed by field path. */
    errors: Record<string, string>
    /** The envelope's `data`, or `null` when there is none. */
    data: T | null
}

type Envelope<T> = {
    ok?: boolean
    statusCode?: number
    message?: string
    errors?: Record<string, string>
    data?: T
}

const OFFLINE_MESSAGE = "Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi."

async function request<T>(path: string, init: RequestInit): Promise<ApiResult<T>> {
    try {
        const response = await fetch(path, init)
        const payload = (await response.json()) as Envelope<T>

        return {
            ok: payload.ok === true,
            statusCode: payload.statusCode ?? response.status,
            message: payload.message ?? "Terjadi kesalahan.",
            errors: payload.errors ?? {},
            data: payload.data ?? null,
        }
    } catch {
        return { ok: false, statusCode: 0, message: OFFLINE_MESSAGE, errors: {}, data: null }
    }
}

/** A JSON body, omitted entirely when there is nothing to send. */
function json(method: string, body?: unknown): RequestInit {
    return {
        method,
        headers: { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
    }
}

export function getJson<T = unknown>(path: string) {
    return request<T>(path, { method: "GET" })
}

export function postJson<T = unknown>(path: string, body?: unknown) {
    return request<T>(path, json("POST", body))
}

export function patchJson<T = unknown>(path: string, body?: unknown) {
    return request<T>(path, json("PATCH", body))
}

export function deleteJson<T = unknown>(path: string) {
    return request<T>(path, { method: "DELETE" })
}

/**
 * A `multipart/form-data` body.
 *
 * No `content-type` header is set: the browser has to generate it so it can carry
 * the boundary that separates the parts, and setting it by hand would drop that.
 */
export function postForm<T = unknown>(path: string, body: FormData) {
    return request<T>(path, { method: "POST", body })
}
