import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

/**
 * Single source of truth for environment variables.
 *
 * Validated once, the first time this module is imported, so a missing or
 * malformed variable fails fast with the offending key named instead of
 * surfacing as `undefined` deep inside a request.
 *
 * Import `env` rather than reading `process.env` directly. These are server
 * variables: accessing one from client code throws.
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

        /* --- App --- */

        /** Declared for completeness; nothing reads this yet. */
        APP_ENV: z.string().min(1).default("local"),
    },
    client: {},
    // This app has no client-side variables yet. Next.js (>= 13.4.4) reads
    // server variables from `process.env` directly, so only client variables
    // would ever need destructuring here.
    experimental__runtimeEnv: {},
    // Treat `KEY=` in a `.env` file as unset, so `default()` and `optional()`
    // behave as written instead of receiving an empty string.
    emptyStringAsUndefined: true,
    // Escape hatch for builds that run without runtime secrets (Docker, CI):
    // `SKIP_ENV_VALIDATION=1` defers validation to process start.
    skipValidation: !!process.env.SKIP_ENV_VALIDATION,
})
