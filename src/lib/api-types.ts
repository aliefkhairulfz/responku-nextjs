/**
 * Shapes of the API payloads the account screens read.
 *
 * Kept in one place because the pages and the components they render both need
 * them, and because a change on the server should surface here as a type error
 * rather than as `undefined` deep inside a component.
 */

/** `GET /api/auth/me` → `data.user`. */
export type CurrentUser = {
    id: string
    name: string
    email: string
    image: string | null
    roles: string[]
    verifiedAt: string | null
    createdAt: string
}

/** `GET`/`PATCH /api/user/profile` → `data.profile`. */
export type UserProfile = {
    gender: string
    education: string
    province: string
    city: string
    latitude: number
    longitude: number
    occupation: string
    phoneNumber: string | null
    religion: string | null
    religionConsent: boolean
    religionConsentAt: string | null
    domicileVerified: boolean
    domicileVerifiedAt: string | null
    updatedAt: string
}

/** `GET /api/research` → `data.researches[]`. */
export type ResearchSummary = {
    id: string
    title: string
    status: string
    questionCount: number
    targetRespondentCount: number
    tokensReserved: number
    tokensConsumed: number
    /** Participations that were submitted, which is what the progress bar shows. */
    respondentCount: number
    updatedAt: string
}

/** `GET /api/research/available` → `data.researches[]`. */
export type AvailableResearch = {
    id: string
    title: string
    description: string
    category: string | null
    researcherName: string
    tokenPerRespondent: number
    /** Priced on the server, where the token price lives. */
    rewardIdr: number
    estimatedDurationMinutes: number
    deadline: string
    respondentCount: number
    targetRespondentCount: number
}

/** A screening rule stored on a research. */
export type ResearchCriterion = { id: string; field: string; operator: string; value: string }

export type ResearchQuestion = {
    id: string
    pos: number
    question: string
    questionType: string
    mustFill: boolean
    choices: Array<{ id: string; pos: number; n: string; choiceText: string | null }>
}

/** `GET /api/research/{id}` → `data.research`. */
export type ResearchDetail = {
    id: string
    title: string
    description: string
    category: string | null
    externalSurveyUrl: string | null
    targetRespondentCount: number
    tokenPerRespondent: number
    estimatedDurationMinutes: number
    deadline: string
    status: string
    tokensReserved: number
    tokensConsumed: number
    publishedAt: string | null
    createdAt: string
    updatedAt: string
    criteria: ResearchCriterion[]
    questions: ResearchQuestion[]
}

/** `GET`/`PATCH /api/user/settings` → `data.settings`. */
export type AccountSettings = {
    language: string
    theme: string
    compactMode: boolean
    notifyEmail: boolean
    notifyPush: boolean
    notifySurveyReminder: boolean
    notifyReward: boolean
    notifyWeeklySummary: boolean
    notifyPromotion: boolean
    privacyPublicProfile: boolean
    privacyOnlineStatus: boolean
    privacyAnalyticsSharing: boolean
    securityTwoFactorAuth: boolean
    updatedAt: string
}

/** `GET /api/user/sessions` → `data.sessions[]`. */
export type ActiveSession = {
    id: string
    /** Raw user agent; the friendly device label is derived from it in the view. */
    userAgent: string | null
    ipAddress: string | null
    createdAt: string
    expiresAt: string
    /** True for the session making the request, which the list will not offer to end. */
    current: boolean
}

/** `POST /api/ticket` → `data.ticket`, and `GET /api/ticket` → `data.tickets[]`. */
export type SupportTicket = {
    id: string
    category: string
    subject: string
    description: string
    status: string
    createdAt: string
    updatedAt: string
}
