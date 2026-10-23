import type { NextRequest } from "next/server"
import { z } from "zod"
import { LANGUAGES, THEMES } from "@/lib/account-settings"
import { isCloudinaryConfigured } from "@/lib/server/cloudinary"
import { BadRequestException, ServiceUnavailableException } from "@/lib/server/http-exception"
import { PHONE_MAX_LENGTH, isPhoneNumber } from "@/lib/profile-schema"
import { EDUCATIONS, GENDERS, RELIGIONS } from "@/lib/profile-vocabulary"
import { exceptionResponse, handleRouteError, parseBody, readFormData, readJsonBody, successResponse } from "@/lib/server/api"
import { requireSession, logoutService, updateUserAvatarService } from "@/service/auth"
import { deleteAccountService, exportUserDataService } from "@/service/account"
import { listSessionsService, revokeOtherSessionsService, revokeSessionService } from "@/service/session"
import { getUserSettingsService, updateUserSettingsService } from "@/service/setting"
import { getUserProfileService, updateUserProfileService } from "@/service/user"

/* ========== Validasi ========== */

/**
 * Every field is optional, matching PATCH semantics: an omitted field is left
 * untouched.
 *
 * Only `religion` and `phoneNumber` accept `null` (to clear them) — every other
 * demographic column is NOT NULL in the database, so it can be changed but never
 * emptied. Because those columns cannot be empty, the service also requires the
 * core fields when the account does not have a profile yet.
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
        phoneNumber: z
            .string()
            .trim()
            .max(PHONE_MAX_LENGTH, `Phone number must be at most ${PHONE_MAX_LENGTH} characters`)
            .refine(isPhoneNumber, "Enter a usable phone number, e.g. +628123456789")
            .nullable()
            .optional(),
        religion: z.enum(RELIGIONS).nullable().optional(),
        religionConsent: z.boolean().optional(),
    })
    .refine((value) => Object.values(value).some((field) => field !== undefined), {
        error: "Provide at least one profile field to update",
    })

/**
 * The account preferences of the Account Settings page.
 *
 * Every field is optional (PATCH semantics: an omitted field is left untouched), and
 * none accepts `null` — each column is NOT NULL with a default, so a preference is
 * changed but never cleared. The two enums are validated against the same vocabulary
 * the page renders, so the stored value and the control cannot drift.
 *
 * `securityTwoFactorAuth` is only a recorded intent; nothing enforces it.
 */
const updateSettingsSchema = z
    .object({
        language: z.enum(LANGUAGES).optional(),
        theme: z.enum(THEMES).optional(),
        compactMode: z.boolean().optional(),
        notifyEmail: z.boolean().optional(),
        notifyPush: z.boolean().optional(),
        notifySurveyReminder: z.boolean().optional(),
        notifyReward: z.boolean().optional(),
        notifyWeeklySummary: z.boolean().optional(),
        notifyPromotion: z.boolean().optional(),
        privacyPublicProfile: z.boolean().optional(),
        privacyOnlineStatus: z.boolean().optional(),
        privacyAnalyticsSharing: z.boolean().optional(),
        securityTwoFactorAuth: z.boolean().optional(),
    })
    .refine((value) => Object.values(value).some((field) => field !== undefined), {
        error: "Provide at least one setting to update",
    })

/* ========== Helper ========== */

/** The action path that replaces the account photo, as opposed to the profile itself. */
const AVATAR_PATH = "avatar"

/** The multipart field the photo is sent under. */
const AVATAR_FIELD = "file"

/** The demographic profile. */
const PROFILE_PATH = "profile"

/** The collection of account preferences. */
const SETTINGS_PATH = "settings"

/** The action path that hands back a copy of the account's data. */
const EXPORT_PATH = "export"

/** The collection of live sessions, and the prefix for ending one by id. */
const SESSIONS_PATH = "sessions"

/** Path segments below `/api/user`, e.g. `["sessions", "abc"]`. */
function getUserSegments(req: NextRequest) {
    return req.nextUrl.pathname
        .replace(/^\/api\/user\/?/, "")
        .split("/")
        .filter(Boolean)
}

function notFound() {
    return exceptionResponse({ message: "Not Found", statusCode: 404 })
}

/* ========== Handler ========== */

/** get user profile */
async function getProfileHandler(_req: NextRequest) {
    try {
        const { user } = await requireSession()
        const profile = await getUserProfileService({ userId: user.id })

        return successResponse({ message: "Profile", data: { profile } })
    } catch (error) {
        return handleRouteError(error)
    }
}

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

/** upload and store a new profile photo */
async function uploadAvatarHandler(req: NextRequest) {
    try {
        const { user } = await requireSession()

        // Checked before the body is read, so an unconfigured deployment does not ask
        // the client to upload a file first only to be turned away.
        if (!isCloudinaryConfigured()) {
            throw new ServiceUnavailableException("Photo upload is not configured")
        }

        const form = await readFormData(req)
        const file = form.get(AVATAR_FIELD)

        if (!(file instanceof File)) {
            throw new BadRequestException("A photo is required", { [AVATAR_FIELD]: `Attach the image as the "${AVATAR_FIELD}" field.` })
        }

        const updated = await updateUserAvatarService({ userId: user.id, file })

        return successResponse({ message: "Profile photo updated", data: { user: updated } })
    } catch (error) {
        return handleRouteError(error)
    }
}

/** get the caller's account settings */
async function getSettingsHandler(_req: NextRequest) {
    try {
        const { user } = await requireSession()
        const settings = await getUserSettingsService({ userId: user.id })

        return successResponse({ message: "Account settings", data: { settings } })
    } catch (error) {
        return handleRouteError(error)
    }
}

/** patch the caller's account settings */
async function updateSettingsHandler(req: NextRequest) {
    try {
        const { user } = await requireSession()
        const body = parseBody(updateSettingsSchema, await readJsonBody(req))
        const settings = await updateUserSettingsService({ userId: user.id, ...body })

        return successResponse({ message: "Account settings updated", data: { settings } })
    } catch (error) {
        return handleRouteError(error)
    }
}

/** list the sessions the caller is currently signed in on */
async function listSessionsHandler(_req: NextRequest) {
    try {
        const session = await requireSession()
        const sessions = await listSessionsService({ userId: session.user.id, currentSessionId: session.id })

        return successResponse({ message: "Active sessions", data: { sessions } })
    } catch (error) {
        return handleRouteError(error)
    }
}

/** end one of the caller's own sessions */
async function revokeSessionHandler(_req: NextRequest, id: string) {
    try {
        const { user } = await requireSession()
        const result = await revokeSessionService({ userId: user.id, id })

        return successResponse({ message: "Session ended", data: result })
    } catch (error) {
        return handleRouteError(error)
    }
}

/** end every session of the caller except the one making the request */
async function revokeOtherSessionsHandler(_req: NextRequest) {
    try {
        const session = await requireSession()
        const result = await revokeOtherSessionsService({ userId: session.user.id, currentSessionId: session.id })

        return successResponse({ message: "Other sessions ended", data: result })
    } catch (error) {
        return handleRouteError(error)
    }
}

/** hand back a copy of everything the caller's account holds */
async function exportDataHandler(_req: NextRequest) {
    try {
        const { user } = await requireSession()
        const data = await exportUserDataService({ userId: user.id })

        return successResponse({ message: "Account data export", data: { export: data } })
    } catch (error) {
        return handleRouteError(error)
    }
}

/**
 * Erase the caller's account.
 *
 * The account is anonymised and locked out by the service; the cookie that pointed at it is
 * cleared here, so the browser is signed out in the same breath rather than left holding a
 * session that no longer resolves.
 */
async function deleteAccountHandler(_req: NextRequest) {
    try {
        const { user } = await requireSession()
        const result = await deleteAccountService({ userId: user.id })

        await logoutService()

        return successResponse({ message: "Account deleted", data: result })
    } catch (error) {
        return handleRouteError(error)
    }
}

export async function GET(req: NextRequest) {
    const pathname = req.nextUrl.pathname.replace(/^\/api\/user\/?/, "")

    switch (pathname) {
        case PROFILE_PATH:
            return getProfileHandler(req)
        case SETTINGS_PATH:
            return getSettingsHandler(req)
        case SESSIONS_PATH:
            return listSessionsHandler(req)
        case EXPORT_PATH:
            return exportDataHandler(req)
        default:
            return notFound()
    }
}

export async function PATCH(req: NextRequest) {
    const pathname = req.nextUrl.pathname.replace(/^\/api\/user\/?/, "")

    switch (pathname) {
        case PROFILE_PATH:
            return updateProfileHandler(req)
        case SETTINGS_PATH:
            return updateSettingsHandler(req)
        default:
            return notFound()
    }
}

export async function POST(req: NextRequest) {
    const pathname = req.nextUrl.pathname.replace(/^\/api\/user\/?/, "")

    switch (pathname) {
        case AVATAR_PATH:
            return uploadAvatarHandler(req)
        default:
            return notFound()
    }
}

/**
 * Ends sessions, or erases the account.
 *
 * The bare collection is the account itself; `sessions` is the device list, where the
 * collection means "everywhere else" and an id means one device. Distinct from `logout`,
 * which ends only the current session and clears the cookie.
 */
export async function DELETE(req: NextRequest) {
    const segments = getUserSegments(req)

    if (segments.length === 0) return deleteAccountHandler(req)
    if (segments[0] !== SESSIONS_PATH) return notFound()
    if (segments.length === 1) return revokeOtherSessionsHandler(req)

    return segments.length === 2 ? revokeSessionHandler(req, segments[1]) : notFound()
}
