/**
 * Shapes of the API payloads the account screens read.
 *
 * Kept in one place because the pages and the components they render both need
 * them, and because a change on the server should surface here as a type error
 * rather than as `undefined` deep inside a component.
 */

/** `GET /api/auth/me` → `data.user`. */
export type CurrentUser = {
    id: string
    name: string
    email: string
    image: string | null
    roles: string[]
    verifiedAt: string | null
    createdAt: string
}

/** `GET`/`PATCH /api/user/profile` → `data.profile`. */
export type UserProfile = {
    gender: string
    education: string
    province: string
    city: string
    latitude: number
    longitude: number
    occupation: string
    phoneNumber: string | null
    religion: string | null
    religionConsent: boolean
    religionConsentAt: string | null
    domicileVerified: boolean
    domicileVerifiedAt: string | null
    updatedAt: string
}
