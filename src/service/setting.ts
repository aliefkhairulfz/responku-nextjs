import type { Language, Theme } from "@/lib/account-settings"
import type { UserSettingModel } from "@/prisma/generated/prisma/models/UserSetting"
import { prisma } from "@/prisma/prisma"

/**
 * The account preferences behind the Account Settings page.
 *
 * Every write is an upsert, and so is the read: a user has at most one row, and a user
 * who has never changed anything has none. Creating it on first read keeps the column
 * defaults in one place — the schema — instead of repeating them here as a fallback
 * that could quietly drift.
 */

/* ========== Tipe ========== */

/**
 * Fields the settings endpoints own, all optional (PATCH semantics: an omitted field is
 * left untouched). No field is nullable — every column is NOT NULL with a default, so a
 * preference is changed but never cleared.
 */
export type UpdateUserSettingInput = {
    userId: string
    language?: Language
    theme?: Theme
    compactMode?: boolean
    notifyEmail?: boolean
    notifyPush?: boolean
    notifySurveyReminder?: boolean
    notifyReward?: boolean
    notifyWeeklySummary?: boolean
    notifyPromotion?: boolean
    privacyPublicProfile?: boolean
    privacyOnlineStatus?: boolean
    privacyAnalyticsSharing?: boolean
    securityTwoFactorAuth?: boolean
}

/* ========== Helper ========== */

/** Public view of the settings, with the soft-delete bookkeeping left out. */
function toSettingResponse(setting: UserSettingModel) {
    return {
        language: setting.language,
        theme: setting.theme,
        compactMode: setting.compactMode,
        notifyEmail: setting.notifyEmail,
        notifyPush: setting.notifyPush,
        notifySurveyReminder: setting.notifySurveyReminder,
        notifyReward: setting.notifyReward,
        notifyWeeklySummary: setting.notifyWeeklySummary,
        notifyPromotion: setting.notifyPromotion,
        privacyPublicProfile: setting.privacyPublicProfile,
        privacyOnlineStatus: setting.privacyOnlineStatus,
        privacyAnalyticsSharing: setting.privacyAnalyticsSharing,
        securityTwoFactorAuth: setting.securityTwoFactorAuth,
        updatedAt: setting.updatedAt,
    }
}

/* ========== Baca ========== */

/**
 * The caller's settings, creating the row on first read.
 *
 * The write is deliberate and idempotent: without it every read would have to invent
 * the defaults in code, and a database default changed later would apply only to rows
 * that already exist.
 */
export async function getUserSettingsService({ userId }: { userId: string }) {
    const setting = await prisma.userSetting.upsert({
        where: { userId },
        create: { userId },
        update: {},
    })

    return toSettingResponse(setting)
}

/* ========== Tulis ========== */

/**
 * Applies a partial update to the caller's settings.
 *
 * The upsert covers the same case as the read — a PATCH may be the first write an
 * account ever makes — so unmapped fields keep their column defaults.
 */
export async function updateUserSettingsService({ userId, ...fields }: UpdateUserSettingInput) {
    const setting = await prisma.userSetting.upsert({
        where: { userId },
        create: { userId, ...fields },
        update: fields,
    })

    return toSettingResponse(setting)
}
