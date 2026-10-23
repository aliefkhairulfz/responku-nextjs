import type { Role } from '@/lib/roles'
import { ConflictException, NotFoundException } from '@/lib/server/http-exception'
import { toRoleList } from '@/lib/server/roles'
import type { Prisma } from '@/prisma/generated/prisma/client'
import {
    ParticipationStatus,
    PaymentStatus,
    PaymentType,
    QualityDecision,
    ReportStatus,
    ResearchStatus,
    TicketStatus,
    TokenTransactionType,
} from '@/prisma/generated/prisma/enums'
import { prisma } from '@/prisma/prisma'

/**
 * The admin back office: the queues an admin works through, and the two levers that only an
 * admin has — settling a withdrawal and changing a user's roles.
 *
 * The moderation queues that already have their own endpoints (quality checks, content
 * reports, support tickets, participation review) are not duplicated here; this module adds
 * the reads and writes that had no home, and an overview that counts what is waiting.
 *
 * Every function here is reached only through the admin-guarded route, so none of them
 * re-checks the role.
 */

/* ========== Konstanta ========== */

/** How many rows a queue returns when the caller does not say. */
const DEFAULT_ADMIN_LIMIT = 50

/** The statuses a submission is still awaiting a decision in. */
const PENDING_PARTICIPATION_STATUSES: ParticipationStatus[] = [
    ParticipationStatus.SUBMITTED,
    ParticipationStatus.UNDER_REVIEW,
]

/** The statuses a report is still awaiting a decision in. */
const OPEN_REPORT_STATUSES: ReportStatus[] = [ReportStatus.OPEN, ReportStatus.UNDER_REVIEW]

/* ========== Overview ========== */

/**
 * What is waiting, in one read.
 *
 * Each figure is a count of rows an admin has to act on, so the overview is a to-do list
 * rather than a vanity dashboard. The counts are independent queries run together; none of
 * them depends on another.
 */
export async function getAdminOverviewService() {
    const [
        pendingParticipations,
        pendingQualityChecks,
        openReports,
        openTickets,
        pendingWithdrawals,
        totalUsers,
        publishedResearches,
    ] = await Promise.all([
        prisma.respondentParticipation.count({
            where: { deletedAt: null, status: { in: PENDING_PARTICIPATION_STATUSES } },
        }),
        prisma.qualityCheck.count({
            where: { deletedAt: null, decision: QualityDecision.PENDING },
        }),
        prisma.contentReport.count({
            where: { deletedAt: null, status: { in: OPEN_REPORT_STATUSES } },
        }),
        prisma.supportTicket.count({ where: { deletedAt: null, status: TicketStatus.REVIEW } }),
        prisma.payment.count({
            where: { type: PaymentType.WITHDRAWAL, status: PaymentStatus.PENDING },
        }),
        prisma.user.count({ where: { deletedAt: null } }),
        prisma.research.count({ where: { deletedAt: null, status: ResearchStatus.PUBLISHED } }),
    ])

    return {
        pendingParticipations,
        pendingQualityChecks,
        openReports,
        openTickets,
        pendingWithdrawals,
        totalUsers,
        publishedResearches,
    }
}

/* ========== Partisipasi ========== */

/** What the review queue needs: the submission, who sent it, and what it is worth. */
const ADMIN_PARTICIPATION_INCLUDE = {
    respondent: { select: { id: true, name: true, email: true } },
    research: { select: { id: true, title: true, tokenPerRespondent: true } },
    reward: { select: { status: true, respondentTokenAmount: true } },
    // The screening is the step before the decision, so the queue carries its state: the
    // payment is refused while it is still open.
    qualityChecks: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: { id: true, decision: true },
    },
} satisfies Prisma.RespondentParticipationInclude

type AdminParticipationRow = Prisma.RespondentParticipationGetPayload<{
    include: typeof ADMIN_PARTICIPATION_INCLUDE
}>

function toAdminParticipationResponse(participation: AdminParticipationRow) {
    return {
        id: participation.id,
        status: participation.status,
        screeningScore: participation.screeningScore,
        screeningResult: participation.autoScreeningResult,
        startedAt: participation.startedAt,
        submittedAt: participation.submittedAt,
        createdAt: participation.createdAt,
        respondent: participation.respondent,
        research: participation.research,
        reward:
            participation.reward === null
                ? null
                : {
                      status: participation.reward.status,
                      tokenAmount: Number(participation.reward.respondentTokenAmount),
                  },
        // One check per submission, so the newest is the one that counts. `null` for a row
        // submitted before the screening existed.
        qualityCheck: participation.qualityChecks[0] ?? null,
    }
}

/**
 * Every participation, newest first — a monitoring list, not a work queue.
 *
 * The decision lives on the quality check (`POST /api/quality-check/{id}/review`), so this
 * read is deliberately unfiltered: it is where an admin watches the whole picture, including
 * what each submission's reward ended up as. A `status` narrows it when one state is all
 * that is wanted.
 */
export async function listAdminParticipationsService({
    status,
    take,
}: {
    status?: ParticipationStatus
    take?: number
}) {
    const participations = await prisma.respondentParticipation.findMany({
        where: { deletedAt: null, ...(status === undefined ? {} : { status }) },
        orderBy: { createdAt: 'desc' },
        take: take ?? DEFAULT_ADMIN_LIMIT,
        include: ADMIN_PARTICIPATION_INCLUDE,
    })

    return participations.map(toAdminParticipationResponse)
}

/* ========== Penarikan ========== */

/** What the withdrawal queue needs: the order and who asked for it. */
const ADMIN_WITHDRAWAL_INCLUDE = {
    user: { select: { id: true, name: true, email: true } },
} satisfies Prisma.PaymentInclude

type AdminWithdrawalRow = Prisma.PaymentGetPayload<{ include: typeof ADMIN_WITHDRAWAL_INCLUDE }>

function toAdminWithdrawalResponse(payment: AdminWithdrawalRow) {
    return {
        id: payment.id,
        userId: payment.userId,
        providerRef: payment.providerRef,
        tokenAmount: payment.tokenAmount,
        amountIdr: Number(payment.amountIdr),
        status: payment.status,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        user: payment.user,
    }
}

/** Withdrawals, newest first. Without a `status` it covers every one. */
export async function listAdminWithdrawalsService({
    status,
    take,
}: {
    status?: PaymentStatus
    take?: number
}) {
    const payments = await prisma.payment.findMany({
        where: { type: PaymentType.WITHDRAWAL, ...(status === undefined ? {} : { status }) },
        orderBy: { createdAt: 'desc' },
        take: take ?? DEFAULT_ADMIN_LIMIT,
        include: ADMIN_WITHDRAWAL_INCLUDE,
    })

    return payments.map(toAdminWithdrawalResponse)
}

/** The two outcomes an admin can settle a withdrawal with. */
export type WithdrawalDecision = 'PAID' | 'FAILED'

/**
 * Settles a withdrawal.
 *
 * `PAID` only closes the order out — the money left the platform outside this app, so there
 * is nothing to move. `FAILED` reverses the request: the tokens that left the wallet when it
 * was made go back, with a `REFUND` ledger row keyed by the payment, so a retry cannot credit
 * twice.
 *
 * Both are refused unless the order is still `PENDING`, which is what stops a settled
 * withdrawal from being settled again — and a failed one from being paid after its tokens
 * were already returned.
 */
export async function settleWithdrawalService({
    id,
    decision,
}: {
    id: string
    decision: WithdrawalDecision
}) {
    await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findFirst({
            where: { id, type: PaymentType.WITHDRAWAL },
            select: { id: true, userId: true, tokenAmount: true, status: true },
        })

        if (payment === null) throw new NotFoundException('Withdrawal not found')

        if (payment.status !== PaymentStatus.PENDING) {
            throw new ConflictException(
                `This withdrawal is ${payment.status} and has already been settled`,
            )
        }

        if (decision === 'PAID') {
            await tx.payment.update({ where: { id }, data: { status: PaymentStatus.PAID } })

            return
        }

        await tx.payment.update({ where: { id }, data: { status: PaymentStatus.FAILED } })

        const wallet = await tx.tokenWallet.upsert({
            where: { userId: payment.userId },
            // Accounts created before wallets were made at registration have none.
            create: { userId: payment.userId, balance: payment.tokenAmount },
            update: { balance: { increment: payment.tokenAmount } },
            select: { id: true },
        })

        await tx.tokenTransaction.create({
            data: {
                walletId: wallet.id,
                paymentId: payment.id,
                type: TokenTransactionType.REFUND,
                // Credits are positive, the mirror of the withdrawal's debit.
                amount: payment.tokenAmount,
                idempotencyKey: `withdraw-refund:${payment.id}`,
            },
        })
    })

    const settled = await prisma.payment.findUniqueOrThrow({
        where: { id },
        include: ADMIN_WITHDRAWAL_INCLUDE,
    })

    return toAdminWithdrawalResponse(settled)
}

/* ========== Pengguna ========== */

/** The identity columns the user list shows. */
const ADMIN_USER_SELECT = {
    id: true,
    name: true,
    email: true,
    image: true,
    roles: true,
    verifiedAt: true,
    createdAt: true,
} satisfies Prisma.UserSelect

type AdminUserRow = Prisma.UserGetPayload<{ select: typeof ADMIN_USER_SELECT }>

function toAdminUserResponse(user: AdminUserRow) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        roles: toRoleList(user.roles),
        verifiedAt: user.verifiedAt,
        createdAt: user.createdAt,
    }
}

/**
 * Users, newest first, optionally narrowed by a name/email search.
 *
 * Soft-deleted accounts are left out: they are anonymised shells kept for the audit trail,
 * not accounts to manage.
 */
export async function listAdminUsersService({ search, take }: { search?: string; take?: number }) {
    const term = search?.trim()

    const users = await prisma.user.findMany({
        where: {
            deletedAt: null,
            ...(term === undefined || term === ''
                ? {}
                : { OR: [{ name: { contains: term } }, { email: { contains: term } }] }),
        },
        orderBy: { createdAt: 'desc' },
        take: take ?? DEFAULT_ADMIN_LIMIT,
        select: ADMIN_USER_SELECT,
    })

    return users.map(toAdminUserResponse)
}

/**
 * Replaces a user's roles.
 *
 * The whole list is written at once, because that is what the admin screen edits — a
 * checkbox set, not a single grant. An empty list is allowed: it locks the account out of
 * every role-gated screen without deleting anything, which is a reversible way to disable
 * an account.
 */
export async function updateUserRolesService({ userId, roles }: { userId: string; roles: Role[] }) {
    const user = await prisma.user.findFirst({
        where: { id: userId, deletedAt: null },
        select: { id: true },
    })

    if (user === null) throw new NotFoundException('User not found')

    const updated = await prisma.user.update({
        where: { id: userId },
        data: { roles },
        select: ADMIN_USER_SELECT,
    })

    return toAdminUserResponse(updated)
}
