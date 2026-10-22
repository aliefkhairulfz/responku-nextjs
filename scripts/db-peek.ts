import { VerificationType } from "@/prisma/generated/prisma/enums"
import { prisma } from "@/prisma/prisma"

/**
 * Local development helper for the API smoke run.
 *
 * OTP codes are stored in plain text, so this reads them back instead of needing a
 * real inbox — which is exactly why it must never be pointed at production.
 *
 *   bun run scripts/db-peek.ts code <email> [EMAIL_VERIFICATION|EMAIL_CHANGE]
 *   bun run scripts/db-peek.ts roles <email> '["respondent"]'
 */
const [command, email, extra] = process.argv.slice(2)

if (email === undefined) {
    console.error("usage: scripts/db-peek.ts code <email> [type] | roles <email> <json>")
    process.exit(1)
}

if (command === "code") {
    const type = extra === "EMAIL_CHANGE" ? VerificationType.EMAIL_CHANGE : VerificationType.EMAIL_VERIFICATION

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    const verification = user
        ? await prisma.verification.findFirst({
              where: { userId: user.id, type, deletedAt: null },
              orderBy: { createdAt: "desc" },
              select: { code: true },
          })
        : null

    console.log(verification?.code ?? "NONE")
}

if (command === "roles") {
    await prisma.user.update({ where: { email }, data: { roles: JSON.parse(extra ?? "[]") } })
    console.log("roles updated")
}

await prisma.$disconnect()
