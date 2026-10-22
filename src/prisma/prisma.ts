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
    // MySQL 8+ defaults accounts to `caching_sha2_password`. Over a plain (non-TLS)
    // connection the first login has to encrypt the password with the server's RSA key,
    // which the client does not have yet — so it asks the server for it. Without this the
    // handshake fails with "RSA public key is not available client side" and the pool
    // times out with a bare P2039. Only needed because the connection is not encrypted;
    // with TLS configured this can be dropped.
    allowPublicKeyRetrieval: true,
})

const prisma = new PrismaClient({ adapter })

export { prisma }
