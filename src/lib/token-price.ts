import { env } from "@/env"

/**
 * What one token costs, in rupiah.
 *
 * Client-safe on purpose — the API prices top-ups with it and the wallet UI displays
 * it — so the two can never disagree about the exchange rate. Configured through
 * `NEXT_PUBLIC_IDR_PER_TOKEN`, which means it is baked in at build time.
 */
export const IDR_PER_TOKEN = env.NEXT_PUBLIC_IDR_PER_TOKEN
