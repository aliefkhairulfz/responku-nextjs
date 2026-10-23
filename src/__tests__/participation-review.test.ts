// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest"
import { hashPassword } from "@/lib/server/crypto"
import { prisma } from "@/prisma/prisma"
import { reviewQualityCheckService } from "@/service/quality-check"

/**
 * Integration tests for the submission decision.
 *
 * These run against the configured database, because the thing under test is a transaction:
 * the wallet credit, the ledger row, the reward and the participation all have to move
 * together, and a mocked client would prove nothing about that.
 *
 * Every fixture is created with a unique suffix and removed again, so the development data is
 * left as it was.
 */

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const researcherEmail = `review-researcher-${suffix}@example.com`
const respondentEmail = `review-respondent-${suffix}@example.com`
const adminEmail = `review-admin-${suffix}@example.com`

let researcherId: string
let respondentId: string
let adminId: string
let researchId: string

/** Creates a verified account with a credentials login and an empty wallet. */
async function createUser(email: string, name: string, roles: string[]) {
    const password = await hashPassword("password123")

    const user = await prisma.user.create({
        data: {
            name,
            email,
            roles,
            verifiedAt: new Date(),
            accounts: { create: { providerId: "credentials", accountId: email, password } },
            tokenWallet: { create: { balance: 0 } },
        },
        select: { id: true },
    })

    return user.id
}

/** A submitted participation with a pending reward and a pending quality check. */
async function createSubmission() {
    const participation = await prisma.respondentParticipation.create({
        data: {
            researchId,
            respondentId,
            status: "SUBMITTED",
            screeningScore: 100,
            autoScreeningResult: "CLEAN",
            startedAt: new Date(Date.now() - 60_000),
            submittedAt: new Date(),
        },
        select: { id: true },
    })

    await prisma.reward.create({
        data: {
            participationId: participation.id,
            respondentTokenAmount: 2,
            platformTokenAmount: 0,
            status: "PENDING",
        },
    })

    const check = await prisma.qualityCheck.create({
        data: {
            participationId: participation.id,
            signalFlags: ["SPEEDING"],
            autoScore: 0.5,
            decision: "PENDING",
        },
        select: { id: true },
    })

    return { participationId: participation.id, checkId: check.id }
}

/** Removes the submissions of the previous test, so each one starts from a clean slate. */
async function resetSubmissions() {
    const participations = await prisma.respondentParticipation.findMany({
        where: { researchId },
        select: { id: true },
    })
    const ids = participations.map((participation) => participation.id)

    await prisma.tokenTransaction.deleteMany({
        where: { respondentParticipationId: { in: ids } },
    })
    await prisma.reward.deleteMany({ where: { participationId: { in: ids } } })
    await prisma.qualityCheck.deleteMany({ where: { participationId: { in: ids } } })
    await prisma.respondentParticipation.deleteMany({ where: { id: { in: ids } } })

    await prisma.tokenWallet.update({ where: { userId: respondentId }, data: { balance: 0 } })
    await prisma.research.update({ where: { id: researchId }, data: { tokensConsumed: 0 } })
}

async function walletBalance() {
    const wallet = await prisma.tokenWallet.findUniqueOrThrow({
        where: { userId: respondentId },
        select: { balance: true },
    })

    return wallet.balance
}

beforeAll(async () => {
    researcherId = await createUser(researcherEmail, "Review Researcher", ["researcher"])
    respondentId = await createUser(respondentEmail, "Review Respondent", ["respondent"])
    adminId = await createUser(adminEmail, "Review Admin", ["admin"])

    const research = await prisma.research.create({
        data: {
            researcherId,
            title: `Review fixture ${suffix}`,
            description: "Fixture for the decision tests.",
            category: "fintech",
            targetRespondentCount: 10,
            tokenPerRespondent: 2,
            estimatedDurationMinutes: 5,
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            status: "PUBLISHED",
            publishedAt: new Date(),
            // The reservation a publish would have made: 10 × 2.
            tokensReserved: 20,
            tokensConsumed: 0,
        },
        select: { id: true },
    })

    researchId = research.id
})

beforeEach(resetSubmissions)

afterAll(async () => {
    await resetSubmissions()

    const userIds = [researcherId, respondentId, adminId]

    await prisma.tokenTransaction.deleteMany({ where: { wallet: { userId: { in: userIds } } } })
    await prisma.tokenWallet.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.account.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.research.deleteMany({ where: { id: researchId } })
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })

    await prisma.$disconnect()
})

describe("submission decision", () => {
    test("approving pays the respondent exactly once, in one transaction", async () => {
        const { participationId, checkId } = await createSubmission()

        await reviewQualityCheckService({ id: checkId, reviewerId: adminId, decision: "APPROVED" })

        const participation = await prisma.respondentParticipation.findUniqueOrThrow({
            where: { id: participationId },
        })
        expect(participation.status).toBe("APPROVED")
        expect(participation.adminReviewedBy).toBe(adminId)
        expect(participation.adminReviewedAt).not.toBeNull()
        expect(participation.rewardedAt).not.toBeNull()

        const check = await prisma.qualityCheck.findUniqueOrThrow({ where: { id: checkId } })
        expect(check.decision).toBe("APPROVED")
        expect(check.reviewedBy).toBe(adminId)

        const reward = await prisma.reward.findFirstOrThrow({ where: { participationId } })
        expect(reward.status).toBe("PAID")
        expect(reward.paidAt).not.toBeNull()

        const ledger = await prisma.tokenTransaction.findMany({
            where: { respondentParticipationId: participationId },
        })
        expect(ledger).toHaveLength(1)
        expect(ledger[0].type).toBe("REWARD")
        expect(ledger[0].amount).toBe(2)

        expect(await walletBalance()).toBe(2)

        const research = await prisma.research.findUniqueOrThrow({ where: { id: researchId } })
        expect(research.tokensConsumed).toBe(2)
    })

    test("rejecting cancels the reward and pays nothing", async () => {
        const { participationId, checkId } = await createSubmission()

        await reviewQualityCheckService({ id: checkId, reviewerId: adminId, decision: "REJECTED" })

        const participation = await prisma.respondentParticipation.findUniqueOrThrow({
            where: { id: participationId },
        })
        expect(participation.status).toBe("REJECTED")
        expect(participation.adminReviewedBy).toBe(adminId)
        expect(participation.adminReviewedAt).not.toBeNull()
        expect(participation.rewardedAt).toBeNull()

        const check = await prisma.qualityCheck.findUniqueOrThrow({ where: { id: checkId } })
        expect(check.decision).toBe("REJECTED")
        expect(check.reviewedBy).toBe(adminId)

        const reward = await prisma.reward.findFirstOrThrow({ where: { participationId } })
        expect(reward.status).toBe("CANCELLED")

        const ledger = await prisma.tokenTransaction.count({
            where: { respondentParticipationId: participationId },
        })
        expect(ledger).toBe(0)

        expect(await walletBalance()).toBe(0)

        const research = await prisma.research.findUniqueOrThrow({ where: { id: researchId } })
        expect(research.tokensConsumed).toBe(0)
    })

    test("a second decision is refused and does not pay again", async () => {
        const { participationId, checkId } = await createSubmission()

        await reviewQualityCheckService({ id: checkId, reviewerId: adminId, decision: "APPROVED" })

        await expect(reviewQualityCheckService({ id: checkId, reviewerId: adminId, decision: "APPROVED" })).rejects.toThrow()

        const ledger = await prisma.tokenTransaction.count({
            where: { respondentParticipationId: participationId },
        })
        expect(ledger).toBe(1)
        expect(await walletBalance()).toBe(2)
    })

    test("two concurrent decisions pay once", async () => {
        const { participationId, checkId } = await createSubmission()

        const results = await Promise.allSettled([
            reviewQualityCheckService({ id: checkId, reviewerId: adminId, decision: "APPROVED" }),
            reviewQualityCheckService({ id: checkId, reviewerId: adminId, decision: "APPROVED" }),
        ])

        expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)

        const ledger = await prisma.tokenTransaction.count({
            where: { respondentParticipationId: participationId },
        })
        expect(ledger).toBe(1)
        expect(await walletBalance()).toBe(2)
    })

    test("a submitted participation is not paid until an admin decides", async () => {
        const { participationId } = await createSubmission()

        expect(await walletBalance()).toBe(0)

        const ledger = await prisma.tokenTransaction.count({
            where: { respondentParticipationId: participationId },
        })
        expect(ledger).toBe(0)

        const reward = await prisma.reward.findFirstOrThrow({ where: { participationId } })
        expect(reward.status).toBe("PENDING")

        const check = await prisma.qualityCheck.findFirstOrThrow({ where: { participationId } })
        expect(check.decision).toBe("PENDING")
    })

    test("approving past the reservation is refused instead of minting tokens", async () => {
        await prisma.research.update({ where: { id: researchId }, data: { tokensConsumed: 19 } })

        const { checkId } = await createSubmission()

        await expect(reviewQualityCheckService({ id: checkId, reviewerId: adminId, decision: "APPROVED" })).rejects.toThrow()

        expect(await walletBalance()).toBe(0)
    })
})
