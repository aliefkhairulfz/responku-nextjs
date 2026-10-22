import { env } from "@/env"
import { BadGatewayException, BadRequestException, ServiceUnavailableException } from "./http-exception"

/**
 * Cloudinary over its REST API.
 *
 * The `cloudinary` SDK is installed but deliberately not used here: both calls
 * this app needs are plain HTTP, and doing them directly keeps the request shape,
 * the error mapping, and the credential handling visible instead of hidden behind
 * a wrapper. The two endpoints are the documented ones —
 *
 *   upload   POST /v1_1/{cloud_name}/{resource_type}/upload
 *   lookup   GET  /v1_1/{cloud_name}/resources/{resource_type}/{type}/{public_id}
 *
 * both authenticated with HTTP Basic `api_key:api_secret`, which is what the SDK
 * resolves to internally (`api_client/execute_request.js` sets `auth = key:secret`).
 */

/* ========== Konstanta ========== */

const CLOUDINARY_API_BASE = "https://api.cloudinary.com/v1_1"

/** Upload policy, read once from the environment so callers cannot drift from it. */
export const ALLOWED_UPLOAD_MIME_TYPES = env.ALLOWED_MIME_TYPE
export const MAX_UPLOAD_BYTES = env.MAX_FILE_SIZE_UPLOAD
export const MAX_UPLOAD_FILE_COUNT = env.MAX_FILE_COUNT

/* ========== Tipe ========== */

/** The subset of a Cloudinary asset payload this app reads. */
type CloudinaryAssetPayload = {
    public_id?: string
    secure_url?: string
    url?: string
    format?: string
    resource_type?: string
    bytes?: number
    width?: number
    height?: number
    version?: number
    created_at?: string
    error?: { message?: string }
}

/** Public view of an asset, in the field names this app uses. */
export type CloudinaryAsset = {
    publicId: string
    /** HTTPS delivery URL. This is what gets stored on the row. */
    secureUrl: string
    url: string
    format: string
    resourceType: string
    bytes: number
    width: number | null
    height: number | null
    /** Cache-busting version segment, also carried inside the URLs. */
    version: number | null
    createdAt: string | null
}

type CloudinaryResourceType = "image" | "video" | "raw"

type CloudinaryCredentials = { cloudName: string; apiKey: string; apiSecret: string }

/* ========== Kredensial ========== */

/** Whether the three credentials an authenticated call needs are all present. */
export function isCloudinaryConfigured(): boolean {
    return env.CLOUDINARY_CLOUD_NAME !== undefined && env.CLOUDINARY_API_KEY !== undefined && env.CLOUDINARY_API_SECRET !== undefined
}

/**
 * Reads the credentials, refusing when the account is not configured.
 *
 * Callers can pre-check with `isCloudinaryConfigured` when they would rather answer
 * differently *before* reading a request body; this is the backstop.
 */
function readCredentials(): CloudinaryCredentials {
    const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = env

    if (cloudName === undefined || apiKey === undefined || apiSecret === undefined) {
        throw new ServiceUnavailableException("Cloudinary is not configured")
    }

    return { cloudName, apiKey, apiSecret }
}

/** `Authorization` header value for a server-side Cloudinary call. */
function authorization({ apiKey, apiSecret }: CloudinaryCredentials): string {
    return `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`
}

/* ========== Helper ========== */

/** Reads a JSON body, treating an unparseable one as empty rather than throwing. */
async function readPayload(response: Response): Promise<CloudinaryAssetPayload> {
    try {
        return (await response.json()) as CloudinaryAssetPayload
    } catch {
        return {}
    }
}

/** Cloudinary's own explanation when it has one, otherwise the caller's fallback. */
function failureMessage(payload: CloudinaryAssetPayload, fallback: string): string {
    const message = payload.error?.message

    return typeof message === "string" && message.length > 0 ? message : fallback
}

/** Maps an asset payload onto this app's field names. */
function toAsset(payload: CloudinaryAssetPayload): CloudinaryAsset {
    if (payload.public_id === undefined || payload.secure_url === undefined) {
        throw new BadGatewayException("Cloudinary returned an asset without an id or a URL")
    }

    return {
        publicId: payload.public_id,
        secureUrl: payload.secure_url,
        url: payload.url ?? payload.secure_url,
        format: payload.format ?? "",
        resourceType: payload.resource_type ?? "image",
        bytes: payload.bytes ?? 0,
        width: payload.width ?? null,
        height: payload.height ?? null,
        version: payload.version ?? null,
        createdAt: payload.created_at ?? null,
    }
}

/**
 * Rounds a byte count to a short human form, for error messages.
 *
 * Decimal (1 MB = 1.000.000 B), matching how the limit is written in the
 * environment — `MAX_FILE_SIZE_UPLOAD=1000000` should read back as "1 MB".
 */
function formatBytes(bytes: number): string {
    if (bytes >= 1_000_000) return `${Math.round((bytes / 1_000_000) * 10) / 10} MB`
    if (bytes >= 1_000) return `${Math.round(bytes / 1_000)} KB`

    return `${bytes} B`
}

/* ========== Kebijakan unggah ========== */

/**
 * Refuses a file the upload policy does not allow.
 *
 * Enforced here rather than in the browser: the `accept` attribute on an input is
 * only a hint, and this is the check that decides what actually reaches Cloudinary.
 */
export function assertUploadableFile(file: File): void {
    if (file.size === 0) {
        throw new BadRequestException("The uploaded file is empty", { file: "The file has no content." })
    }

    if (file.size > MAX_UPLOAD_BYTES) {
        throw new BadRequestException("The uploaded file is too large", {
            file: `Upload at most ${formatBytes(MAX_UPLOAD_BYTES)}.`,
        })
    }

    if (!ALLOWED_UPLOAD_MIME_TYPES.includes(file.type)) {
        throw new BadRequestException("That file type is not allowed", {
            file: `Allowed types: ${ALLOWED_UPLOAD_MIME_TYPES.join(", ")}.`,
        })
    }
}

/* ========== Unggah ========== */

export type UploadSingleAssetInput = {
    file: Blob
    /** Final segment of the asset id; combined with `folder` when both are given. */
    publicId?: string
    folder?: string
    tags?: string[]
    resourceType?: CloudinaryResourceType
}

/**
 * Uploads one asset and returns it.
 *
 * Passing a `publicId` makes the call a replacement: the same id is overwritten
 * with `invalidate`, so a re-upload does not pile up an orphan per attempt — and
 * because the version segment changes with it, the new URL is not served from a
 * stale cache.
 */
export async function uploadSingleAsset({ file, publicId, folder, tags, resourceType = "image" }: UploadSingleAssetInput): Promise<CloudinaryAsset> {
    const credentials = readCredentials()
    const form = new FormData()

    // Left as a `File`/`Blob` so the browser-style part keeps its filename and type.
    form.append("file", file)

    if (publicId !== undefined) form.append("public_id", publicId)
    if (folder !== undefined) form.append("folder", folder)
    if (tags !== undefined && tags.length > 0) form.append("tags", tags.join(","))

    if (publicId !== undefined) {
        form.append("overwrite", "true")
        form.append("invalidate", "true")
    }

    const response = await fetch(`${CLOUDINARY_API_BASE}/${credentials.cloudName}/${resourceType}/upload`, {
        method: "POST",
        // No `content-type`: `fetch` sets the multipart boundary itself.
        headers: { authorization: authorization(credentials) },
        body: form,
    })

    const payload = await readPayload(response)

    if (!response.ok) {
        throw new BadGatewayException(failureMessage(payload, "Cloudinary rejected the upload"))
    }

    return toAsset(payload)
}

/* ========== Baca satu aset ========== */

export type GetSingleAssetInput = {
    publicId: string
    resourceType?: CloudinaryResourceType
    /** Delivery type. `upload` for anything this app stored itself. */
    type?: string
}

/**
 * Reads one asset back from Cloudinary.
 *
 * Returns `null` for an id that no longer exists — a deleted asset is an answer the
 * caller can act on, not an error. The `public_id` is percent-encoded as one
 * segment, which is how the SDK escapes a folder-qualified id.
 */
export async function getSingleAsset({ publicId, resourceType = "image", type = "upload" }: GetSingleAssetInput): Promise<CloudinaryAsset | null> {
    const credentials = readCredentials()
    const path = [resourceType, type, encodeURIComponent(publicId)].join("/")

    const response = await fetch(`${CLOUDINARY_API_BASE}/${credentials.cloudName}/resources/${path}`, {
        method: "GET",
        headers: { authorization: authorization(credentials) },
    })

    if (response.status === 404) return null

    const payload = await readPayload(response)

    if (!response.ok) {
        throw new BadGatewayException(failureMessage(payload, "Cloudinary rejected the lookup"))
    }

    return toAsset(payload)
}
