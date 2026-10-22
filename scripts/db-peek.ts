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
 *   bun run scripts/db-peek.ts wallet <email>
 *   bun run scripts/db-peek.ts purge <email-substring>
 *
 * Note: there is deliberately no "credit tokens" command — balances are only ever
 * moved through the API so the ledger stays truthful. Use `POST /api/payment/topup`
 * plus the webhook instead.
 */
const [command, email, extra] = process.argv.slice(2)

if (email === undefined) {
    console.error("usage: scripts/db-peek.ts code <email> [type] | roles <email> <json> | wallet <email> | purge <email-substring>")
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

if (command === "wallet") {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    const wallet = user
        ? await prisma.tokenWallet.findUnique({
              where: { userId: user.id },
              select: {
                  balance: true,
                  transactions: {
                      orderBy: { createdAt: "asc" },
                      select: { type: true, amount: true, researchId: true, idempotencyKey: true },
                  },
              },
          })
        : null

    console.log(`balance=${wallet?.balance ?? "no wallet"}`)

    for (const transaction of wallet?.transactions ?? []) {
        console.log(`  ${transaction.type} ${transaction.amount} research=${transaction.researchId ?? "-"} key=${transaction.idempotencyKey}`)
    }
}

/**
 * Removes every account whose email contains the pattern, along with the rows that
 * hang off it.
 *
 * Children go first because most of these relations are `RESTRICT`, not `CASCADE`:
 * a research, a payment, or a support ticket would refuse to let its owner go. Criteria,
 * questions, and choices do cascade from the research, and the profile, accounts, sessions,
 * and verifications cascade from the user. Participations restrict from both ends — the
 * research and the respondent — so they are cleared before either.
 *
 * Everything runs in one transaction, so a run that hits an unexpected relation
 * removes nothing at all rather than leaving half an account behind.
 */
if (command === "purge") {
    const users = await prisma.user.findMany({
        where: { email: { contains: email } },
        select: { id: true, email: true },
    })

    if (users.length === 0) {
        console.log(`no users match "${email}"`)
        process.exit(0)
    }

    const userIds = users.map((user) => user.id)
    const wallets = await prisma.tokenWallet.findMany({ where: { userId: { in: userIds } }, select: { id: true } })
    const walletIds = wallets.map((wallet) => wallet.id)
    const researches = await prisma.research.findMany({ where: { researcherId: { in: userIds } }, select: { id: true } })
    const researchIds = researches.map((research) => research.id)

    const [transactions, participations, payments, removedTickets, removedWallets, removedResearches, removedUsers] = await prisma.$transaction([
        prisma.tokenTransaction.deleteMany({ where: { walletId: { in: walletIds } } }),
        prisma.respondentParticipation.deleteMany({
            where: { OR: [{ researchId: { in: researchIds } }, { respondentId: { in: userIds } }] },
        }),
        prisma.payment.deleteMany({ where: { userId: { in: userIds } } }),
        prisma.supportTicket.deleteMany({ where: { userId: { in: userIds } } }),
        prisma.tokenWallet.deleteMany({ where: { userId: { in: userIds } } }),
        prisma.research.deleteMany({ where: { researcherId: { in: userIds } } }),
        prisma.user.deleteMany({ where: { id: { in: userIds } } }),
    ])

    for (const user of users) console.log(`  - ${user.email}`)

    console.log(
        `removed ${removedUsers.count} users, ${removedResearches.count} researches, ${removedWallets.count} wallets, ` +
            `${transactions.count} token transactions, ${participations.count} participations, ${payments.count} payments, ` +
            `${removedTickets.count} support tickets`,
    )
}

await prisma.$disconnect()
