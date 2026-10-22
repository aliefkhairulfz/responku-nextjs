import { createHmac, randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto"
import { env } from "@/env"

/**
 * Crypto primitives behind auth: opaque tokens, OTP codes, and password hashing.
 *
 * Server-only, and deliberately free of `next/headers` so it stays usable
 * outside a request (migrations, scripts, tests).
 */

const SCRYPT_KEY_LENGTH = 64

/**
 * Generates a random raw token and its corresponding HMAC-SHA256 hash.
 *
 * Useful for creating session tokens and verification hashes.
 */
export function generateTokenWithHash() {
    const rawToken = randomBytes(32).toString("base64url")
    const hashedToken = createHmac("sha256", env.AUTH_SECRET).update(rawToken).digest("hex")
    return { rawToken, hashedToken }
}

/**
 * Hashes a given raw token using HMAC-SHA256
 * and the application's auth secret.
 */
export function hashToken(rawToken: string) {
    return createHmac("sha256", env.AUTH_SECRET).update(rawToken).digest("hex")
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 */
export function generateOTP(): string {
    return randomInt(100000, 1000000).toString()
}

/**
 * Derives a scrypt key from `password` and `salt`.
 *
 * `promisify` cannot infer scrypt's callback overload, so the promise is built
 * by hand to keep the return type as `Buffer`.
 */
function derivePasswordKey(password: string, salt: string, keyLength: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        scrypt(password, salt, keyLength, (error, derivedKey) => {
            if (error) reject(error)
            else resolve(derivedKey)
        })
    })
}

/**
 * Hashes a plaintext password with a random salt using scrypt.
 *
 * Returns a self-describing `scrypt:<salt>:<hash>` string, so the parameters
 * required to verify the password travel with the stored value.
 */
export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex")
    const derivedKey = await derivePasswordKey(password, salt, SCRYPT_KEY_LENGTH)
    return `scrypt:${salt}:${derivedKey.toString("hex")}`
}

/**
 * Verifies a plaintext password against a value produced by `hashPassword`.
 *
 * The comparison is constant-time, so a mismatching hash cannot be recovered
 * by measuring how long the check takes.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const [scheme, salt, hash] = storedHash.split(":")
    if (scheme !== "scrypt" || salt === undefined || hash === undefined) return false

    const expectedKey = Buffer.from(hash, "hex")
    const derivedKey = await derivePasswordKey(password, salt, SCRYPT_KEY_LENGTH)
    if (expectedKey.length !== derivedKey.length) return false

    return timingSafeEqual(expectedKey, derivedKey)
}
