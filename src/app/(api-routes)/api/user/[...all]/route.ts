import type { NextRequest } from "next/server"
import { z } from "zod"
import { exceptionResponse, handleRouteError, parseBody, readJsonBody, successResponse } from "@/lib/server/api"
import { requireSession } from "@/service/auth"
import { EDUCATIONS, GENDERS, RELIGIONS, updateUserProfileService } from "@/service/user"

/* ========== Validasi ========== */

/**
 * Every field is optional, matching PATCH semantics: an omitted field is left
 * untouched.
 *
 * Only `religion` accepts `null` (to clear it) — every other demographic column
 * is NOT NULL in the database, so it can be changed but never emptied. Because
 * those columns cannot be empty, the service also requires the core fields when
 * the account does not have a profile yet.
 *
 * Verification-only columns (`domicileVerifiedAt`) and `dataShareConsentAt` are
 * not writable here — consent and verification are recorded by their own flows.
 */
const updateProfileSchema = z
    .object({
        gender: z.enum(GENDERS).optional(),
        education: z.enum(EDUCATIONS).optional(),
        province: z.string().trim().min(1, "Province cannot be empty").max(100, "Province is too long").optional(),
        city: z.string().trim().min(1, "City cannot be empty").max(100, "City is too long").optional(),
        latitude: z.number().min(-90, "Latitude must be between -90 and 90").max(90, "Latitude must be between -90 and 90").optional(),
        longitude: z.number().min(-180, "Longitude must be between -180 and 180").max(180, "Longitude must be between -180 and 180").optional(),
        occupation: z.string().trim().min(1, "Occupation cannot be empty").max(100, "Occupation is too long").optional(),
        religion: z.enum(RELIGIONS).nullable().optional(),
        religionConsent: z.boolean().optional(),
    })
    .refine((value) => Object.values(value).some((field) => field !== undefined), {
        error: "Provide at least one profile field to update",
    })

/* ========== Handler ========== */

/** patch user profile */
async function updateProfileHandler(req: NextRequest) {
    try {
        const { user } = await requireSession()
        const body = parseBody(updateProfileSchema, await readJsonBody(req))
        const profile = await updateUserProfileService({ userId: user.id, ...body })

        return successResponse({ message: "Profile updated", data: { profile } })
    } catch (error) {
        return handleRouteError(error)
    }
}

export async function PATCH(req: NextRequest) {
    const pathname = req.nextUrl.pathname.replace(/^\/api\/user\/?/, "")

    switch (pathname) {
        case "profile":
            return updateProfileHandler(req)
        default:
            return exceptionResponse({ message: "Not Found", statusCode: 404 })
    }
}
