import { PrismaMariaDb } from "@prisma/adapter-mariadb"
import { env } from "@/env"
import { PrismaClient } from "./generated/prisma/client"

// No `dotenv/config` here: Next.js loads `.env` for the runtime and
// `prisma7.config.ts` loads it for the Prisma CLI. Importing it here would make
// this module depend on import order relative to the `@/env` validation.
const adapter = new PrismaMariaDb({
    host: env.DATABASE_HOST,
    port: env.DATABASE_PORT,
    user: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    connectionLimit: env.DATABASE_CONNECTION_LIMIT,
})

const prisma = new PrismaClient({ adapter })

export { prisma }
