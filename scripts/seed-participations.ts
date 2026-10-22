import { ParticipationStatus } from "@/prisma/generated/prisma/enums"
import { prisma } from "@/prisma/prisma"

/**
 * LOCAL DEVELOPMENT ONLY — puts submitted participations on a researcher's research,
 * so the "responden terkumpul" progress can be looked at before the respondent flow
 * that would create them exists.
 *
 *   bun run scripts/seed-participations.ts <researcher-email> <count> [tag]
 *
 * Only researches that actually have a target are touched: a research without one has
 * no progress to show. Each seeded respondent gets an account of its own, because one
 * account may only join a research once — remove them with
 * `bun run scripts/db-peek.ts purge <tag>-responden`.
 */
const [email, rawCount, tag = "seed"] = process.argv.slice(2)
const count = Number(rawCount)

if (email === undefined || !Number.isInteger(count) || count <= 0) {
    console.error("usage: scripts/seed-participations.ts <researcher-email> <count> [tag]")
    process.exit(1)
}

const researches = await prisma.research.findMany({
    where: { researcher: { email }, targetRespondentCount: { gt: 0 }, deletedAt: null },
    select: { id: true, title: true },
})

if (researches.length === 0) {
    console.error(`no research with a target for ${email}`)
    process.exit(1)
}

for (const research of researches) {
    for (let index = 1; index <= count; index += 1) {
        const respondentEmail = `${tag}-responden-${index}@example.com`
        const respondent = await prisma.user.upsert({
            where: { email: respondentEmail },
            create: { name: `${tag} Responden ${index}`, email: respondentEmail },
            update: {},
            select: { id: true },
        })

        await prisma.respondentParticipation.upsert({
            where: { researchId_respondentId: { researchId: research.id, respondentId: respondent.id } },
            create: { researchId: research.id, respondentId: respondent.id, status: ParticipationStatus.SUBMITTED, submittedAt: new Date() },
            update: { status: ParticipationStatus.SUBMITTED, submittedAt: new Date() },
        })
    }

    console.log(`"${research.title || "Draft tanpa judul"}" (${research.id}) now has ${count} submitted participations`)
}

await prisma.$disconnect()
