/**
 * Account setting vocabulary, in a client-safe module.
 *
 * The API validates against these keys and the Account Settings page renders with
 * them, so a control and the field it writes can never drift apart. The key names are
 * the request/response field names, matching the `UserSetting` columns.
 */

/* ========== Umum ========== */

export const LANGUAGES = ["id", "en"] as const

export type Language = (typeof LANGUAGES)[number]

export const LANGUAGE_ITEMS: { value: Language; label: string }[] = [
    { value: "id", label: "Bahasa Indonesia" },
    { value: "en", label: "English" },
]

export const THEMES = ["light", "system"] as const

export type Theme = (typeof THEMES)[number]

/**
 * The select's options in display order.
 *
 * `dark` is listed but is not an accepted value: the palette does not exist yet, so it
 * is shown disabled rather than quietly missing from the menu.
 */
export const THEME_SELECT_ITEMS: { value: string; label: string; disabled?: boolean }[] = [
    { value: "light", label: "Terang" },
    { value: "dark", label: "Gelap (Coming Soon)", disabled: true },
    { value: "system", label: "Ikuti Sistem" },
]

/* ========== Notifikasi ========== */

/** Which channels a notification may arrive on. */
export const NOTIFICATION_CHANNEL_KEYS = ["notifyEmail", "notifyPush"] as const

/** Which kinds of notification are sent at all. */
export const NOTIFICATION_TYPE_KEYS = ["notifySurveyReminder", "notifyReward", "notifyWeeklySummary", "notifyPromotion"] as const

export const NOTIFICATION_KEYS = [...NOTIFICATION_CHANNEL_KEYS, ...NOTIFICATION_TYPE_KEYS] as const

/* ========== Privasi & Keamanan ========== */

/** Who can see what. */
export const PRIVACY_VISIBILITY_KEYS = ["privacyPublicProfile", "privacyOnlineStatus"] as const

/**
 * Account hardening.
 *
 * `securityTwoFactorAuth` only records the user's intent — nothing enforces it, because
 * two-factor authentication is not implemented.
 */
export const PRIVACY_SECURITY_KEYS = ["securityTwoFactorAuth", "privacyAnalyticsSharing"] as const

export const PRIVACY_KEYS = [...PRIVACY_VISIBILITY_KEYS, ...PRIVACY_SECURITY_KEYS] as const

/* ========== Gabungan ========== */

/** Every on/off preference, across both tabs. */
export const ACCOUNT_SETTING_TOGGLE_KEYS = [...NOTIFICATION_KEYS, ...PRIVACY_KEYS] as const

export type AccountSettingToggleKey = (typeof ACCOUNT_SETTING_TOGGLE_KEYS)[number]
