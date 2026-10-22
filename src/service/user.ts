import { BadRequestException } from "@/lib/server/http-exception"
import type { UserProfileModel } from "@/prisma/generated/prisma/models/UserProfile"
import { prisma } from "@/prisma/prisma"

/* ========== Kosakata domain ========== */

/** Values the profile UI offers, kept here so request and stored data agree. */
export const GENDERS = ["male", "female"] as const
export const EDUCATIONS = ["high_school", "diploma", "bachelor", "master", "doctorate"] as const
export const RELIGIONS = ["islam", "protestant", "catholic", "hindu", "buddhist", "confucian"] as const

export type Gender = (typeof GENDERS)[number]
export type Education = (typeof EDUCATIONS)[number]
export type Religion = (typeof RELIGIONS)[number]

/**
 * Stored in the NOT NULL `religion` column when the user has not disclosed one.
 *
 * Religion is optional in the product — and under UU PDP it has to stay optional,
 * so it cannot be made mandatory just to satisfy the column — while the schema
 * declares it NOT NULL. The column therefore carries this sentinel, and
 * `toUserProfileResponse` turns it back into `null` for clients.
 */
const UNDISCLOSED_RELIGION = ""

/* ========== Tipe ========== */

/**
 * The demographic columns the database marks NOT NULL.
 *
 * A field that is absent leaves the column untouched; there is no `null` form,
 * because none of these columns can be emptied once set.
 */
export type UpdateUserProfileInput = {
    userId: string
    gender?: Gender
    education?: Education
    province?: string
    city?: string
    latitude?: number
    longitude?: number
    occupation?: string
    /** `null` clears the disclosed religion and its consent. */
    religion?: Religion | null
    religionConsent?: boolean
}

type ProfileCore = {
    gender: Gender
    education: Education
    province: string
    city: string
    latitude: number
    longitude: number
    occupation: string
}

const PROFILE_CORE_FIELDS = [
    "gender",
    "education",
    "province",
    "city",
    "latitude",
    "longitude",
    "occupation",
] as const satisfies readonly (keyof ProfileCore)[]

type ReligionStateInput = {
    /** Currently stored religion, where `""` means "not disclosed". */
    currentReligion: string
    currentConsentAt: Date | null
    religion: Religion | null | undefined
    religionConsent: boolean | undefined
}

/* ========== Helper ========== */

/**
 * Resolves the `religion` / `religionConsentAt` pair for a patch.
 *
 * Religion is sensitive data under UU PDP No. 27/2022, so a disclosed religion
 * may only be stored while explicit consent is on record. That gives three cases:
 *
 * - consent withdrawn: the stored religion is reset along with the consent,
 *   because the data can no longer be processed;
 * - consent granted: the timestamp is only stamped the first time, so repeat
 *   saves do not rewrite the consent audit trail;
 * - otherwise: a religion that would end up without consent is refused.
 */
function resolveReligionState({ currentReligion, currentConsentAt, religion, religionConsent }: ReligionStateInput) {
    if (religionConsent === false) {
        if (religion !== null && religion !== undefined) {
            throw new BadRequestException("Religion cannot be stored without consent", {
                religionConsent: "Clear the religion in the same request when withdrawing consent.",
            })
        }

        return { religion: UNDISCLOSED_RELIGION, religionConsentAt: null }
    }

    const religionConsentAt = religionConsent === true ? (currentConsentAt ?? new Date()) : currentConsentAt
    // `null` clears the value, `undefined` leaves it untouched.
    const nextReligion = religion === undefined ? currentReligion : (religion ?? UNDISCLOSED_RELIGION)

    if (nextReligion !== UNDISCLOSED_RELIGION && religionConsentAt === null) {
        throw new BadRequestException("Consent is required to store religion data", {
            religionConsent: "Explicit consent is required to process religion data.",
        })
    }

    return { religion: nextReligion, religionConsentAt }
}

/**
 * Refuses a first write that would leave a NOT NULL column without a value.
 *
 * Demographics have no sensible default to fall back on, so the profile is only
 * created from a complete payload. Later writes may stay partial.
 *
 * The assertion narrows `input`, which is what lets the `create` branch below
 * typecheck without casting.
 */
function assertProfileCore(input: UpdateUserProfileInput): asserts input is UpdateUserProfileInput & ProfileCore {
    const missing = PROFILE_CORE_FIELDS.filter((field) => input[field] === undefined)

    if (missing.length > 0) {
        throw new BadRequestException(
            "This account has no profile yet, so these fields are required",
            Object.fromEntries(missing.map((field) => [field, "Required to create a profile."])),
        )
    }
}

/**
 * Column values shared by both writes, preserving however much of each field the
 * caller supplied — the `create` branch passes an already-narrowed `input`, so
 * its NOT NULL columns come back non-optional.
 */
type ProfileColumns<T extends UpdateUserProfileInput> = {
    gender: T["gender"]
    education: T["education"]
    domicileProvince: T["province"]
    domicileCity: T["city"]
    domicileLat: T["latitude"]
    domicileLng: T["longitude"]
    occupation: T["occupation"]
}

function toProfileColumns<T extends UpdateUserProfileInput>(input: T): ProfileColumns<T> {
    return {
        gender: input.gender,
        education: input.education,
        domicileProvince: input.province,
        domicileCity: input.city,
        domicileLat: input.latitude,
        domicileLng: input.longitude,
        occupation: input.occupation,
    }
}

/**
 * Maps the stored profile onto the vocabulary the client uses, so request and
 * response speak the same field names.
 */
function toUserProfileResponse(profile: UserProfileModel) {
    return {
        gender: profile.gender,
        education: profile.education,
        province: profile.domicileProvince,
        city: profile.domicileCity,
        latitude: Number(profile.domicileLat),
        longitude: Number(profile.domicileLng),
        occupation: profile.occupation,
        religion: profile.religion === UNDISCLOSED_RELIGION ? null : profile.religion,
        religionConsent: profile.religionConsentAt !== null,
        religionConsentAt: profile.religionConsentAt,
        domicileVerified: profile.domicileVerifiedAt !== null,
        domicileVerifiedAt: profile.domicileVerifiedAt,
        updatedAt: profile.updatedAt,
    }
}

/* ========== Update profile ========== */

/**
 * Creates or updates the profile of `userId`.
 *
 * Registration does not create a profile, so the first write inserts the row and
 * therefore has to be complete; every write after that is a partial update.
 *
 * `domicileVerifiedAt` is deliberately not writable here: clients cannot declare
 * their own domicile verification.
 */
export async function updateUserProfileService(input: UpdateUserProfileInput) {
    const { userId, religion, religionConsent } = input

    const current = await prisma.userProfile.findUnique({
        where: { userId },
        select: { religion: true, religionConsentAt: true },
    })

    const religionState = resolveReligionState({
        currentReligion: current?.religion ?? UNDISCLOSED_RELIGION,
        currentConsentAt: current?.religionConsentAt ?? null,
        religion,
        religionConsent,
    })

    if (current === null) {
        assertProfileCore(input)

        const profile = await prisma.userProfile.create({
            data: { userId, ...toProfileColumns(input), ...religionState },
        })

        return toUserProfileResponse(profile)
    }

    const profile = await prisma.userProfile.update({
        where: { userId },
        data: { ...toProfileColumns(input), ...religionState },
    })

    return toUserProfileResponse(profile)
}
