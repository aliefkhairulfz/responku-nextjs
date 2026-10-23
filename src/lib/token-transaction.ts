/**
 * Token ledger types, mirroring the Prisma enum, in a client-safe module.
 *
 * The ledger is read through the API, so the browser needs to label a row without
 * importing the generated Prisma enums — the same split `participation-status.ts`
 * makes for participation statuses.
 *
 * The sign of `amount` is what decides whether a row adds to the balance or takes
 * from it; the type only says why. That is deliberate: `RESERVE` is a debit and
 * `RELEASE` is its credit, and a label that guessed the direction would be wrong the
 * moment a new type is added.
 */

export const TOKEN_TRANSACTION_TYPES = [
    "TOPUP",
    "RESERVE",
    "RELEASE",
    "CONSUME",
    "REWARD",
    "WITHDRAW",
    "FEE",
    "REFUND",
] as const

export type TokenTransactionType = (typeof TOKEN_TRANSACTION_TYPES)[number]

/** Short name of a ledger row, for the badge on it. */
const LABELS: Record<TokenTransactionType, string> = {
    TOPUP: "Top up",
    RESERVE: "Cadangan riset",
    RELEASE: "Cadangan dilepas",
    CONSUME: "Cadangan terpakai",
    REWARD: "Reward",
    WITHDRAW: "Penarikan",
    FEE: "Biaya",
    REFUND: "Pengembalian",
}

/** What the row means, in one line, for the text beside the badge. */
const DESCRIPTIONS: Record<TokenTransactionType, string> = {
    TOPUP: "Pembelian kuota token",
    RESERVE: "Token dialokasikan untuk riset",
    RELEASE: "Cadangan riset dikembalikan ke saldo",
    CONSUME: "Cadangan dipakai membayar reward responden",
    REWARD: "Reward jawaban survei",
    WITHDRAW: "Saldo ditarik menjadi uang tunai",
    FEE: "Biaya penarikan saldo",
    REFUND: "Pembayaran dikembalikan",
}

/** Label for a stored type, falling back to the raw value for anything unexpected. */
export function tokenTransactionLabel(type: string): string {
    return LABELS[type as TokenTransactionType] ?? type
}

/** Description for a stored type, falling back to the label when it is unknown. */
export function tokenTransactionDescription(type: string): string {
    return DESCRIPTIONS[type as TokenTransactionType] ?? tokenTransactionLabel(type)
}

/** Whether a ledger row adds to the balance. Debits are stored negative. */
export function isCredit(amount: number): boolean {
    return amount > 0
}
