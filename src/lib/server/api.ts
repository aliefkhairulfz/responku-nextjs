import { type NextRequest, NextResponse } from "next/server"
import type { z } from "zod"
import { BadRequestException, HttpException } from "./http-exception"

/**
 * Plumbing shared by the route handlers: request parsing, the two response
 * shapes every endpoint returns, and mapping thrown exceptions onto them.
 */

/* ========== Request ========== */

/**
 * Reads and parses the JSON request body.
 *
 * `req.json()` throws a `SyntaxError` on malformed input, which would otherwise
 * surface as a 500 instead of a validation error.
 */
export async function readJsonBody(req: NextRequest): Promise<unknown> {
    try {
        return await req.json()
    } catch {
        throw new BadRequestException("Request body must be valid JSON")
    }
}

/**
 * Reads and parses a `multipart/form-data` body.
 *
 * `req.formData()` throws on anything else — a JSON body or an empty request, most
 * likely — which would otherwise surface as a 500 instead of a bad-request error.
 */
export async function readFormData(req: NextRequest): Promise<FormData> {
    try {
        return await req.formData()
    } catch {
        throw new BadRequestException("Request body must be multipart/form-data")
    }
}

/**
 * Reads a JSON body that is allowed to be absent, as `{}` when there is none.
 *
 * For endpoints whose payload is entirely optional, where `req.json()` throwing on an
 * empty body would turn "I have nothing to send" into a validation error.
 */
export async function readOptionalJsonBody(req: NextRequest): Promise<unknown> {
    const body = await req.text()

    if (body.trim().length === 0) return {}

    try {
        return JSON.parse(body)
    } catch {
        throw new BadRequestException("Request body must be valid JSON")
    }
}

/** Validates `body` against `schema`, throwing a 422 with per-field errors. */
export function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
    const result = schema.safeParse(body)
    if (!result.success) {
        const errors = Object.fromEntries(result.error.issues.map((issue) => [issue.path.join(".") || "_root", issue.message]))
        throw new BadRequestException("Validation failed", errors)
    }
    return result.data
}

/* ========== Response ========== */

type SuccessResponseOptions<T extends object = Record<string, unknown>> = {
    data?: T
    message?: string
    statusCode?: number
    meta?: Record<string, unknown>
}

type ExceptionResponseOptions = {
    message?: string
    statusCode?: number
    errors?: Record<string, unknown>
}

/**
 * Standardizes a successful API response into a JSON NextResponse.
 *
 * @param options - Options for the response including data, message, statusCode, and meta.
 * @returns A NextResponse formatted as a JSON success response.
 */
export function successResponse<T extends object = Record<string, unknown>>({
    data = {} as T,
    message = "Success",
    statusCode = 200,
    meta = {},
}: SuccessResponseOptions<T> = {}) {
    return NextResponse.json(
        {
            ok: true,
            statusCode,
            message,
            data,
            meta,
        },
        { status: statusCode },
    )
}

/**
 * Standardizes an error API response into a JSON NextResponse.
 *
 * @param options - Options for the response including message, statusCode, and field errors.
 * @returns A NextResponse formatted as a JSON error response.
 */
export function exceptionResponse({ message = "Bad Request", statusCode = 400, errors = {} }: ExceptionResponseOptions = {}) {
    return NextResponse.json(
        {
            ok: false,
            statusCode,
            message,
            errors,
        },
        { status: statusCode },
    )
}

/* ========== Error mapping ========== */

/** Maps a thrown exception to the standard error envelope. */
export function handleRouteError(error: unknown) {
    if (error instanceof HttpException) {
        return exceptionResponse({ message: error.message, statusCode: error.statusCode, errors: error.errors })
    }

    console.error("[api] unhandled error", error)
    return exceptionResponse({ message: "Internal Server Error", statusCode: 500 })
}
