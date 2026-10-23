/**
 * Role vocabulary, in a client-safe module.
 *
 * The admin screens read these lists to label and edit a user's roles, while the server
 * guards (`src/lib/server/roles.ts`) decide membership from the same list — so the value
 * stored in `User.roles` and the control that writes it can never drift apart.
 */

export const ROLES = ['researcher', 'respondent', 'admin'] as const

export type Role = (typeof ROLES)[number]

/** Roles a freshly registered user starts with. */
export const DEFAULT_ROLES: Role[] = ['researcher', 'respondent']

const ROLE_LABELS: Record<Role, string> = {
    researcher: 'Peneliti',
    respondent: 'Responden',
    admin: 'Admin',
}

/** Label for a stored role, falling back to the raw value for anything unexpected. */
export function roleLabel(role: string): string {
    return ROLE_LABELS[role as Role] ?? role
}

/** Whether a value is one of the roles. */
export function isRole(value: string): value is Role {
    return (ROLES as readonly string[]).includes(value)
}
