import { env } from "@/env"

/**
 * What one token costs, in rupiah.
 *
 * Server-only: the wallet page hands this value down to its client component
 * rather than letting the browser read the env, so `TOKEN_PRICE_IDR` can stay a
 * server variable and both sides still price tokens identically.
 */
export const IDR_PER_TOKEN = env.TOKEN_PRICE_IDR
