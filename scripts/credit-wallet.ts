import { randomUUID } from "node:crypto"
import { TokenTransactionType } from "@/prisma/generated/prisma/enums"
import { prisma } from "@/prisma/prisma"

/**
 * LOCAL DEVELOPMENT ONLY — seeds tokens into a wallet so flows that spend them
 * (publishing reserves them, paying respondents spends them) can be exercised
 * without a payment gateway.
 *
 *   bun run scripts/credit-wallet.ts <email> <amount>
 *
 * The balance never moves on its own: the ledger row goes in with it, so a wallet's
 * history still adds up to its balance. `db-peek.ts` deliberately has no command like
 * this — crediting is a gateway's job in production — but the rule it protects is
 * that a balance stays explainable, and this keeps it.
 */
const [email, rawAmount] = process.argv.slice(2)
const amount = Number(rawAmount)

if (email === undefined || !Number.isInteger(amount) || amount <= 0) {
    console.error("usage: scripts/credit-wallet.ts <email> <amount>")
    process.exit(1)
}

const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })

if (user === null) {
    console.error(`no account for ${email}`)
    process.exit(1)
}

const wallet = await prisma.tokenWallet.upsert({
    where: { userId: user.id },
    create: { userId: user.id, balance: amount },
    update: { balance: { increment: amount } },
    select: { id: true, balance: true },
})

await prisma.tokenTransaction.create({
    data: { walletId: wallet.id, type: TokenTransactionType.TOPUP, amount, idempotencyKey: `dev-seed:${randomUUID()}` },
})

console.log(`${email} balance=${wallet.balance}`)

await prisma.$disconnect()
