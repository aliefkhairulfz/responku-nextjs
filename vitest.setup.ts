/**
 * Loads `.env` before any test module is imported.
 *
 * `@/env` validates `process.env` on first import, and the integration tests import the
 * Prisma client (which imports it) — so the file has to be read before that happens.
 */
import 'dotenv/config'
