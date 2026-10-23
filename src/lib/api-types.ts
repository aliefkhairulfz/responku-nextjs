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
    /** Whole days until the deadline, worked out on the server so no component reads a clock. */
    daysLeft: number
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

/** The research header a participation carries, wherever it is read. */
export type ParticipationResearch = {
    id: string
    title: string
    description: string
    category: string | null
    externalSurveyUrl: string | null
    researcherName: string
    estimatedDurationMinutes: number
    tokenPerRespondent: number
    deadline: string
    status: string
}

/** What a participation paid, or `null` until it is sent in. */
export type ParticipationReward = { tokenAmount: number; status: string; paidAt: string | null }

/** `GET /api/participation` → `data.participations[]`. */
export type Participation = {
    id: string
    researchId: string
    status: string
    /** Percentage of the criteria the profile met, or `null` when there were none. */
    screeningScore: number | null
    screeningResult: string | null
    /** When the questionnaire was first opened — where the timing clock starts. */
    startedAt: string | null
    submittedAt: string | null
    createdAt: string
    research: ParticipationResearch
    reward: ParticipationReward | null
}

/** One question of a participation, carrying whatever the respondent already saved. */
export type ParticipationQuestion = {
    id: string
    pos: number
    question: string
    questionType: string
    mustFill: boolean
    choices: Array<{ id: string; pos: number; n: string; choiceText: string | null }>
    answer: { selected: string[]; text: string | null }
}

/**
 * `GET /api/participation/{id}` → `data.participation`, and the shape the join, save,
 * and submit endpoints answer with as well.
 */
export type ParticipationDetail = Participation & {
    timing: ParticipationTiming
    questions: ParticipationQuestion[]
}

/**
 * How long a participation took, against how long the research was expected to take.
 *
 * Measured between two server timestamps — joining and sending in — and recomputed on
 * every read rather than stored.
 */
export type ParticipationTiming = {
    /** Seconds between joining and sending in; `null` while the participation is open. */
    actualSeconds: number | null
    actualSecondsPerQuestion: number | null
    /** The research's own estimate, in seconds. */
    estimatedSeconds: number
    /** The estimate spread evenly over the questions; `null` when none are asked. */
    estimatedSecondsPerQuestion: number | null
    /**
     * Initial indicator only — finished far quicker than the estimate. `null` while the
     * participation is open. Worth reading the answers, not grounds to reject them.
     */
    tooFast: boolean | null
}

/** A reference to the caller's own participation on a research, when they have one. */
export type ParticipationRef = { id: string; status: string }

/**
 * `GET /api/research/available` → `data.researches[]`: a card, plus whether the caller has
 * already begun this research — which is what turns the card into a "carry on".
 */
export type AvailableResearchRow = AvailableResearch & { participation: ParticipationRef | null }

/** A research as a respondent sees it, with the criteria they are screened against. */
export type AvailableResearchDetail = AvailableResearch & { criteria: ResearchCriterion[] }

/**
 * `GET /api/research/available/{id}` → `data`.
 *
 * `participation` is the caller's own attempt, present when they have already joined, so
 * the page can offer to carry on rather than to start.
 */
export type AvailableResearchDetailPayload = {
    research: AvailableResearchDetail
    participation: ParticipationRef | null
}

/**
 * One row of the token ledger.
 *
 * `amount` is signed: credits are positive, debits negative. `researchId` and
 * `participationId` say what the row was for, and are `null` when it was neither —
 * a top-up, for instance.
 */
export type WalletTransaction = {
    id: string
    type: string
    amount: number
    researchId: string | null
    participationId: string | null
    /** The order behind a top-up credit; `null` for movements that are not a payment. */
    paymentId: string | null
    createdAt: string
}

/** `GET /api/payment/wallet` → `data.wallet`. */
export type Wallet = {
    balance: number
    /** Priced on the server, where the token price lives. */
    balanceIdr: number
    transactions: WalletTransaction[]
}

/** `POST /api/payment/topup` → `data.payment`, and `GET /api/payment` → `data.payments[]`. */
export type Payment = {
    id: string
    type: string
    provider: string
    /** The `order_id` the gateway knows this order by. */
    providerRef: string
    amountIdr: number
    /** Worked back out of `amountIdr` on the server. */
    tokenAmount: number
    status: string
    createdAt: string
    updatedAt: string
}

/**
 * `POST /api/payment/topup` → `data`.
 *
 * `token` and `redirectUrl` are the hosted payment page, and are `null` when no
 * gateway is configured — the order is recorded locally either way.
 */
export type TopupResult = {
    payment: Payment
    token: string | null
    redirectUrl: string | null
}

/**
 * `POST /api/payment/withdraw` → `data`.
 *
 * The tokens leave the wallet when the request is made, so `payment` is the order an admin
 * settles. `feeTokens` is what the platform kept and `amountIdr` is the net the caller is
 * owed — both worked out on the server, so the client does not recompute the fee.
 */
export type WithdrawResult = {
    payment: Payment
    feeTokens: number
    netTokens: number
    amountIdr: number
}

/**
 * `GET /api/user/export` → `data.export`.
 *
 * A copy of the account's own data, shaped like the stored rows rather than like a screen.
 * Only the account header is typed; the collections are passed through as-is, because the
 * point is to hand back whatever the account holds.
 */
export type AccountExport = {
    exportedAt: string
    account: {
        id: string
        name: string
        email: string
        image: string | null
        roles: string[]
        verifiedAt: string | null
        createdAt: string
        updatedAt: string
    }
    profile: unknown
    settings: unknown
    researches: unknown[]
    participations: unknown[]
    payments: unknown[]
    wallet: unknown
    supportTickets: unknown[]
    contentReports: unknown[]
}

/**
 * `GET /api/report` → `data.reports[]` and `GET /api/report/{id}` → `data.report`.
 *
 * A content report is a respondent flagging a research, plus an admin's decision on it.
 * `actionTaken` records what was done; it is not enforced by the API.
 */
export type ContentReport = {
    id: string
    researchId: string
    reportedBy: string
    reason: string
    status: string
    actionTaken: string | null
    reviewedBy: string | null
    createdAt: string
    /** The last write, which for a decided report is when the decision was made. */
    updatedAt: string
    research: { id: string; title: string; researcherName: string }
    reporter: { id: string; name: string }
}

/** `GET /api/ticket/admin` → `data.tickets[]`, with the requester and the review trail. */
export type AdminTicket = SupportTicket & {
    userId: string
    requester: { id: string; name: string; email: string }
    reviewedBy: string | null
    reviewedAt: string | null
    resolutionNote: string | null
}

/** `GET /api/admin/overview` → `data.overview`. */
export type AdminOverview = {
    pendingParticipations: number
    pendingQualityChecks: number
    openReports: number
    openTickets: number
    pendingWithdrawals: number
    totalUsers: number
    publishedResearches: number
}

/** `GET /api/admin/participations` → `data.participations[]`. */
export type AdminParticipation = {
    id: string
    status: string
    screeningScore: number | null
    screeningResult: string | null
    startedAt: string | null
    submittedAt: string | null
    createdAt: string
    respondent: { id: string; name: string; email: string }
    research: { id: string; title: string; tokenPerRespondent: number }
    reward: { status: string; tokenAmount: number } | null
    /**
     * The screening that has to be decided before the reward can be. `null` for a row
     * submitted before the screening existed.
     */
    qualityCheck: { id: string; decision: string } | null
}

/** `GET /api/admin/withdrawals` → `data.withdrawals[]`. */
export type AdminWithdrawal = {
    id: string
    userId: string
    providerRef: string
    /** The gross that left the wallet. */
    tokenAmount: number
    /** The net owed after the platform fee. */
    amountIdr: number
    status: string
    createdAt: string
    updatedAt: string
    user: { id: string; name: string; email: string }
}

/** `GET /api/admin/users` → `data.users[]`. */
export type AdminUser = {
    id: string
    name: string
    email: string
    image: string | null
    roles: string[]
    verifiedAt: string | null
    createdAt: string
}

/**
 * `GET /api/quality-check` → `data.qualityChecks[]`,
 * `GET /api/quality-check/{id}` → `data.qualityCheck`, and
 * `POST /api/quality-check/{id}/review` decides the check.
 *
 * A quality check is the automatic screening of one submission, plus an admin's decision
 * on it. The signals are heuristics, so `signalFlags` and `autoScore` are hints to read
 * the answers rather than a verdict. Detail responses include the submission questions and
 * answers; queue responses omit them.
 */
export type QualityCheck = {
    id: string
    participationId: string
    decision: string
    /** Automatic signals, e.g. `["SPEEDING", "STRAIGHT_LINING"]`. */
    signalFlags: string[]
    /** From one (clean) down to zero (every signal fired), or `null` when not scored. */
    autoScore: number | null
    /** The admin who decided it, or `null` while it is still `PENDING`. */
    reviewedBy: string | null
    createdAt: string
    /** The last write, which for a decided check is when the decision was made. */
    updatedAt: string
    participation: {
        id: string
        status: string
        respondentId: string
        respondentName: string
        researchId: string
        researchTitle: string
        submittedAt: string | null
        /**
         * Everything below is present on `GET /api/quality-check/{id}` and omitted from the
         * queue, which only needs the summary.
         */
        respondentEmail?: string
        screeningScore?: number | null
        screeningResult?: string | null
        /** When the questionnaire was first opened — where the timing clock starts. */
        startedAt?: string | null
        /** When the respondent joined. */
        createdAt?: string
        timing?: ParticipationTiming
        reward?: { tokenAmount: number; status: string; paidAt: string | null } | null
        research?: {
            id: string
            title: string
            description: string
            category: string | null
            researcherName: string
            tokenPerRespondent: number
            estimatedDurationMinutes: number
            deadline: string
            status: string
        }
        questions?: Array<{
            id: string
            pos: number
            question: string
            questionType: string
            mustFill: boolean
            choices: Array<{ id: string; pos: number; n: string; choiceText: string | null }>
            answer: { selected: string[]; text: string | null }
        }>
    }
}
