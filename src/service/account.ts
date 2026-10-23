import { NotFoundException } from '@/lib/server/http-exception'
import { toRoleList } from '@/lib/server/roles'
import { prisma } from '@/prisma/prisma'

/**
 * The two data-subject rights the profile page offers: a copy of everything an account
 * holds, and erasure.
 *
 * Both are scoped to the caller's own account — the route reads the id from the session, so
 * there is no way to export or erase somebody else's data.
 */

/* ========== Helper ========== */

/**
 * The address a deleted account is anonymised to.
 *
 * `User.email` is unique, so the placeholder has to be unique too; keying it on the id keeps
 * it so without a second lookup. The `.invalid` TLD is reserved by RFC 2606, so it can never
 * collide with a real address.
 */
function anonymisedEmail(userId: string) {
    return `deleted+${userId}@deleted.invalid`
}

/* ========== Ekspor ========== */

/**
 * Everything the account holds, as one plain object.
 *
 * The shape mirrors the stored rows rather than the API's response shapes: an export is a
 * copy of the data, so it is better that it reads like the database than like a screen.
 * Decimals are turned into numbers because the response is JSON, and a `Decimal` would
 * otherwise serialise as a string.
 *
 * Credentials are deliberately absent: `Account.password` and `Session.token` are secrets,
 * not the user's data, and handing them back would be a liability rather than a right.
 */
export async function exportUserDataService({ userId }: { userId: string }) {
    const user = await prisma.user.findFirst({
        where: { id: userId, deletedAt: null },
        select: {
            id: true,
            name: true,
            email: true,
            image: true,
            roles: true,
            verifiedAt: true,
            createdAt: true,
            updatedAt: true,
            profile: true,
            setting: true,
            researches: {
                where: { deletedAt: null },
                orderBy: { createdAt: 'asc' },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    category: true,
                    externalSurveyUrl: true,
                    targetRespondentCount: true,
                    tokenPerRespondent: true,
                    estimatedDurationMinutes: true,
                    deadline: true,
                    status: true,
                    publishedAt: true,
                    createdAt: true,
                },
            },
            participations: {
                where: { deletedAt: null },
                orderBy: { createdAt: 'asc' },
                select: {
                    id: true,
                    researchId: true,
                    status: true,
                    submittedAt: true,
                    createdAt: true,
                    reward: {
                        select: {
                            respondentTokenAmount: true,
                            platformTokenAmount: true,
                            status: true,
                            paidAt: true,
                        },
                    },
                },
            },
            payments: {
                orderBy: { createdAt: 'asc' },
                select: {
                    id: true,
                    type: true,
                    provider: true,
                    providerRef: true,
                    amountIdr: true,
                    tokenAmount: true,
                    status: true,
                    createdAt: true,
                },
            },
            tokenWallet: {
                select: {
                    balance: true,
                    transactions: {
                        orderBy: { createdAt: 'asc' },
                        select: {
                            id: true,
                            type: true,
                            amount: true,
                            researchId: true,
                            respondentParticipationId: true,
                            paymentId: true,
                            createdAt: true,
                        },
                    },
                },
            },
            supportTickets: {
                where: { deletedAt: null },
                orderBy: { createdAt: 'asc' },
                select: {
                    id: true,
                    category: true,
                    subject: true,
                    description: true,
                    status: true,
                    createdAt: true,
                },
            },
            reportedContents: {
                where: { deletedAt: null },
                orderBy: { createdAt: 'asc' },
                select: {
                    id: true,
                    researchId: true,
                    reason: true,
                    status: true,
                    actionTaken: true,
                    createdAt: true,
                },
            },
        },
    })

    if (user === null) throw new NotFoundException('Account not found')

    return {
        exportedAt: new Date(),
        account: {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            roles: toRoleList(user.roles),
            verifiedAt: user.verifiedAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        },
        profile: user.profile,
        settings: user.setting,
        researches: user.researches,
        participations: user.participations.map((participation) => ({
            id: participation.id,
            researchId: participation.researchId,
            status: participation.status,
            submittedAt: participation.submittedAt,
            createdAt: participation.createdAt,
            reward:
                participation.reward === null
                    ? null
                    : {
                          respondentTokenAmount: Number(participation.reward.respondentTokenAmount),
                          platformTokenAmount: Number(participation.reward.platformTokenAmount),
                          status: participation.reward.status,
                          paidAt: participation.reward.paidAt,
                      },
        })),
        payments: user.payments.map((payment) => ({
            id: payment.id,
            type: payment.type,
            provider: payment.provider,
            providerRef: payment.providerRef,
            amountIdr: Number(payment.amountIdr),
            tokenAmount: payment.tokenAmount,
            status: payment.status,
            createdAt: payment.createdAt,
        })),
        wallet:
            user.tokenWallet === null
                ? null
                : {
                      balance: user.tokenWallet.balance,
                      transactions: user.tokenWallet.transactions.map((transaction) => ({
                          id: transaction.id,
                          type: transaction.type,
                          amount: transaction.amount,
                          researchId: transaction.researchId,
                          participationId: transaction.respondentParticipationId,
                          paymentId: transaction.paymentId,
                          createdAt: transaction.createdAt,
                      })),
                  },
        supportTickets: user.supportTickets,
        contentReports: user.reportedContents,
    }
}

/* ========== Hapus ========== */

/**
 * Erases an account.
 *
 * Two kinds of data are treated differently, and the split is the whole point:
 *
 * - Personal data with no audit value — the profile, the preferences, the credentials, the
 *   sessions, the verification codes — is deleted outright. Soft-deleting it would leave the
 *   data sitting in the table, which is not what "hapus permanen" promises.
 * - The account row itself, and the financial rows that point at it (payments, the token
 *   ledger, rewards), are kept. They are the audit trail, and erasing the row would take the
 *   trail with it, so the row is anonymised instead: the name, email, photo, and verification
 *   are cleared, and `deletedAt` is stamped.
 *
 * Stamping `deletedAt` is also what locks the account out — `loginService` and `getSession`
 * both refuse a soft-deleted user — so no separate "disabled" flag is needed.
 *
 * Research and participation rows are left in place: they are the platform's research record
 * and other people's data as much as the caller's, so they are out of scope for a
 * self-service erasure.
 */
export async function deleteAccountService({ userId }: { userId: string }) {
    const user = await prisma.user.findFirst({
        where: { id: userId, deletedAt: null },
        select: { id: true },
    })

    if (user === null) throw new NotFoundException('Account not found')

    const now = new Date()

    await prisma.$transaction(async (tx) => {
        // Credentials and one-time codes: secrets, so they are removed rather than archived.
        await tx.session.deleteMany({ where: { userId } })
        await tx.verification.deleteMany({ where: { userId } })
        await tx.account.deleteMany({ where: { userId } })

        // Personal data with no audit value.
        await tx.userProfile.deleteMany({ where: { userId } })
        await tx.userSetting.deleteMany({ where: { userId } })

        // The shell that the financial rows still point at, anonymised in place.
        await tx.user.update({
            where: { id: userId },
            data: {
                name: 'Akun Dihapus',
                email: anonymisedEmail(userId),
                image: null,
                verifiedAt: null,
                deletedAt: now,
            },
        })
    })

    return { deleted: true }
}
