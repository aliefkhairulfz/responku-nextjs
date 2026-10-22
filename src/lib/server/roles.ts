import { ForbiddenException } from "./http-exception"

/**
 * Role vocabulary and the array checks that go with it.
 *
 * `User.roles` is a JSON list (e.g. `["researcher", "respondent"]`), so
 * membership is decided by `includes` rather than by matching a delimited
 * string.
 */

/** Every role a user can hold. */
export const ROLES = ["researcher", "respondent", "admin"] as const

export type Role = (typeof ROLES)[number]

/** Roles a freshly registered user starts with. */
export const DEFAULT_ROLES: Role[] = ["researcher", "respondent"]

/**
 * Normalises the `roles` JSON column into a list of strings.
 *
 * The column is untyped JSON, so anything that is not an array of strings is
 * treated as an empty list rather than trusted.
 */
export function toRoleList(roles: unknown): string[] {
    if (!Array.isArray(roles)) return []
    return roles.filter((role): role is string => typeof role === "string")
}

/** True when the stored roles include `role`. */
export function hasRole(roles: unknown, role: Role): boolean {
    return toRoleList(roles).includes(role)
}

/** Throws a 403 unless the stored roles include `role`. */
export function requireRole(roles: unknown, role: Role): void {
    if (!hasRole(roles, role)) throw new ForbiddenException(`Requires the "${role}" role`)
}
