/**
 * The one rule about phone numbers, applied by both the API and the profile form.
 *
 * Kept out of the endpoint so the browser can reject an obvious typo before a
 * request goes out, while the server still decides — the two cannot disagree about
 * what a usable number looks like.
 */

/** Longest value the `phone_number` column holds. */
export const PHONE_MAX_LENGTH = 20

/** Characters a number may be written with; the value is stored as typed. */
const PHONE_ALLOWED = /^\+?[\d\s()-]+$/

/** A number needs this many digits to be dialable, whatever the formatting. */
const PHONE_MIN_DIGITS = 7

/** Whether a typed value is a usable phone number. */
export function isPhoneNumber(value: string): boolean {
    const trimmed = value.trim()

    if (trimmed.length === 0 || trimmed.length > PHONE_MAX_LENGTH) return false
    if (!PHONE_ALLOWED.test(trimmed)) return false

    return trimmed.replace(/\D/g, "").length >= PHONE_MIN_DIGITS
}
