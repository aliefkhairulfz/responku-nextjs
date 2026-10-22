import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

/**
 * Single source of truth for environment variables.
 *
 * Validated once, the first time this module is imported, so a missing or
 * malformed variable fails fast with the offending key named instead of
 * surfacing as `undefined` deep inside a request.
 *
 * Import `env` rather than reading `process.env` directly. These are all server
 * variables: accessing one from client code throws, so anything the browser
 * needs is handed down from a server component instead (see `TOKEN_PRICE_IDR`).
 */
export const env = createEnv({
    server: {
        /* --- Database --- */

        /** Hostname of the MariaDB/MySQL server. */
        DATABASE_HOST: z.string().min(1),
        DATABASE_PORT: z.coerce.number().int().positive().default(3306),
        DATABASE_USER: z.string().min(1),
        DATABASE_PASSWORD: z.string().min(1),
        DATABASE_NAME: z.string().min(1),
        /** Prisma connection pool size. */
        DATABASE_CONNECTION_LIMIT: z.coerce.number().int().positive().default(5),

        /**
         * Only read by `prisma7.config.ts` (the Prisma CLI entrypoint, which
         * loads `.env` itself). Declared here so every variable in play is
         * listed in one place.
         */
        DATABASE_URL: z.url().optional(),

        /* --- Auth --- */

        /** HMAC key behind session tokens and verification hashes. Keep it long. */
        AUTH_SECRET: z.string().min(32),
        SESSION_COOKIE_NAME: z.string().min(1).default("nextjs_session"),

        /* --- Mail --- */

        RESEND_API_KEY: z.string().min(1),
        /** Explicit sender address; wins over `APP_MAIL_NAME`. */
        MAIL_FROM_ADDRESS: z.string().min(1).optional(),
        /** Sending domain suffix, e.g. `"@email.example.com"`. */
        APP_MAIL_NAME: z.string().min(1).optional(),

        /* --- Payment (Midtrans) --- */

        /**
         * Midtrans server key. Optional on purpose: without it the gateway is
         * skipped and a top-up is only recorded locally, so a dev environment
         * without credentials still runs.
         */
        MIDTRANS_SERVER_KEY: z.string().min(1).optional(),
        /**
         * Where Snap is reached. Defaults to the Midtrans host implied by
         * `MIDTRANS_IS_PRODUCTION`; set it to point at a proxy or a test stub.
         */
        MIDTRANS_SNAP_BASE_URL: z.url().optional(),
        /**
         * Sandbox or production Midtrans. Parsed from the strings a `.env` can
         * actually hold — `z.coerce.boolean()` would read `"false"` as `true`.
         */
        MIDTRANS_IS_PRODUCTION: z
            .enum(["true", "false"])
            .default("false")
            .transform((value) => value === "true"),

        /* --- Token & reward economy --- */

        /** What one token costs, in rupiah. Handed to the wallet UI by its page. */
        TOKEN_PRICE_IDR: z.coerce.number().int().positive().default(1_000),
        /** Share of every reward kept by the platform. Must pair with the row below. */
        REWARD_SPLIT_PLATFORM_PERCENT: z.coerce.number().int().min(0).max(100).default(20),
        /** Share of every reward paid to the respondent. The two must add up to 100. */
        REWARD_SPLIT_RESPONDENT_PERCENT: z.coerce.number().int().min(0).max(100).default(80),
        /** Tokens untouched for this many months may be expired. */
        TOKEN_EXPIRY_IDLE_MONTHS: z.coerce.number().int().positive().default(12),
        /** Fee taken off a token withdrawal, in percent. */
        WITHDRAWAL_FEE_PERCENT: z.coerce.number().int().min(0).max(100).default(5),

        /* --- Research & moderation rules --- */

        /** Respondents a research has to attract before it counts as filled. */
        MIN_RESPONDENT_PER_RESEARCH: z.coerce.number().int().positive().default(1),
        /** Hours an admin has to review a submission. */
        ADMIN_REVIEW_SLA_HOURS: z.coerce.number().int().positive().default(24),
        /** Hours a content report may stay open. */
        CONTENT_REPORT_SLA_HOURS: z.coerce.number().int().positive().default(24),
        /** Hours a reward is held while its answer quality is checked. */
        QUALITY_HOLD_RELEASE_HOURS: z.coerce.number().int().positive().default(72),

        /* --- App --- */

        /** Declared for completeness; nothing reads this yet. */
        APP_ENV: z.string().min(1).default("local"),
    },
    // The app has no `NEXT_PUBLIC_` variables — every value the browser needs is
    // passed down from a server component — but the Next adapter still requires
    // the map to be present.
    experimental__runtimeEnv: {},
    // Treat `KEY=` in a `.env` file as unset, so `default()` and `optional()`
    // behave as written instead of receiving an empty string.
    emptyStringAsUndefined: true,
    // Escape hatch for builds that run without runtime secrets (Docker, CI):
    // `SKIP_ENV_VALIDATION=1` defers validation to process start.
    skipValidation: !!process.env.SKIP_ENV_VALIDATION,
})

// t3-env validates each key on its own, so the one rule that spans two keys is
// asserted here. A reward split that does not add up would quietly pay out the
// wrong amounts, which is worse than refusing to start. Skipped when validation
// is deferred to process start.
if (!process.env.SKIP_ENV_VALIDATION) {
    const split = env.REWARD_SPLIT_PLATFORM_PERCENT + env.REWARD_SPLIT_RESPONDENT_PERCENT

    if (split !== 100) {
        throw new Error(`REWARD_SPLIT_PLATFORM_PERCENT + REWARD_SPLIT_RESPONDENT_PERCENT must add up to 100, got ${split}`)
    }
}
