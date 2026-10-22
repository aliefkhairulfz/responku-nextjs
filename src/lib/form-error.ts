/**
 * Field-error plumbing shared by the auth forms.
 *
 * TanStack Form hands a field's errors back as `unknown[]` — the messages this
 * app validates with are either plain strings or objects carrying `message` —
 * while `@/components/ui/field`'s `FieldError` renders one shape. These helpers
 * translate between the two.
 */

/** A single field error as text, or `null` when it is not one that can be shown. */
export function toMessage(error: unknown): string | null {
    if (typeof error === "string") return error
    if (error && typeof error === "object" && "message" in error) return String(error.message)

    return null
}

/** The errors of a field, in the shape `FieldError` renders. */
export function toFieldErrors(errors: unknown[]): Array<{ message: string }> {
    return errors
        .map(toMessage)
        .filter((message): message is string => message !== null)
        .map((message) => ({ message }))
}

/** Whether a field currently has anything to show. */
export function hasFieldError(errors: unknown[]): boolean {
    return errors.some((error) => toMessage(error) !== null)
}
