import type { CriteriaOperator } from "@/prisma/generated/prisma/enums"

/**
 * Screens a respondent's profile against a research's criteria.
 *
 * A research's criteria are a small expression language stored as `{field, operator,
 * value}` rows; this decides whether a given profile satisfies them.
 *
 * A rule can only be decided against a field the profile actually carries, so
 * `SCREENABLE_FIELDS` is the whole vocabulary. The editor also offers `age` and
 * `region`, which nothing stores yet — a rule about either comes back *undecided*
 * rather than guessed at, and the caller decides what to do with that. Guessing would
 * be worse than not knowing: a wrong "pass" spends a researcher's budget on somebody
 * they excluded, and a wrong "fail" silently hides their work.
 */

/* ========== Tipe ========== */

/** The profile columns a rule can be decided against. */
export const SCREENABLE_FIELDS = ["gender", "province", "city", "occupation", "education", "religion"] as const

export type ScreenableField = (typeof SCREENABLE_FIELDS)[number]

export type CriterionRule = { field: string; operator: CriteriaOperator; value: string }

export type ScreeningOutcome = {
    /** Rules that were decided — a value existed on both sides and did not match. */
    failed: string[]
    /** Rules that could not be decided at all: an unknown field, or an unreadable value. */
    undecided: string[]
    /**
     * Share of the rules that were met, as a percentage, or `null` when there were
     * none. Undecided rules count as unmet, so the number never flatters.
     */
    score: number | null
}

/* ========== Nilai ========== */

/**
 * Reads a number out of a rule value or a profile value.
 *
 * Both sides have to be numeric for an ordered comparison to mean anything;
 * anything else leaves the comparison undecided instead of sorting strings.
 */
function asNumber(value: string): number | null {
    const trimmed = value.trim()

    return trimmed.length === 0 || !Number.isFinite(Number(trimmed)) ? null : Number(trimmed)
}

/** The list form of a rule value: comma separated, surrounding space ignored. */
function asList(value: string): string[] {
    return value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
}

/** `true` / `false` when the rule can be decided, `null` when it cannot. */
function matches(actual: string, operator: CriteriaOperator, expected: string): boolean | null {
    const actualNumber = asNumber(actual)
    const expectedNumber = asNumber(expected)

    switch (operator) {
        case "EQ":
            return actual === expected
        case "NEQ":
            return actual !== expected
        case "IN":
            return asList(expected).includes(actual)
        case "NOT_IN":
            return !asList(expected).includes(actual)
        case "GT":
            return actualNumber === null || expectedNumber === null ? null : actualNumber > expectedNumber
        case "GTE":
            return actualNumber === null || expectedNumber === null ? null : actualNumber >= expectedNumber
        case "LT":
            return actualNumber === null || expectedNumber === null ? null : actualNumber < expectedNumber
        case "LTE":
            return actualNumber === null || expectedNumber === null ? null : actualNumber <= expectedNumber
        case "BETWEEN": {
            const [low, high] = asList(expected)
            const lowNumber = low === undefined ? null : asNumber(low)
            const highNumber = high === undefined ? null : asNumber(high)

            if (actualNumber === null || lowNumber === null || highNumber === null) return null

            return actualNumber >= lowNumber && actualNumber <= highNumber
        }
    }
}

/* ========== Screening ========== */

/**
 * Decides a list of rules against a profile.
 *
 * `profile` may be `null` — an account that has not filled its demographics in yet —
 * in which case every rule comes back undecided.
 */
export function screenCriteria(rules: CriterionRule[], profile: Record<ScreenableField, string> | null): ScreeningOutcome {
    const failed: string[] = []
    const undecided: string[] = []

    for (const rule of rules) {
        const field = SCREENABLE_FIELDS.find((candidate) => candidate === rule.field)

        if (field === undefined || profile === null) {
            undecided.push(rule.field)
            continue
        }

        const decision = matches(profile[field], rule.operator, rule.value)

        if (decision === null) undecided.push(rule.field)
        else if (!decision) failed.push(rule.field)
    }

    // Both lists can name the same field when two rules about it disagree — one met,
    // one not — which is why they are field names rather than rule ids.
    const met = rules.length - failed.length - undecided.length

    return { failed, undecided, score: rules.length === 0 ? null : Math.round((met / rules.length) * 100) }
}
