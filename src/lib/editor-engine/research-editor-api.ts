import { deleteJson, patchJson, postJson } from "@/lib/api-client"
import type { ResearchCriterion, ResearchDetail, ResearchQuestion } from "@/lib/api-types"
import { RESEARCH_CATEGORIES } from "@/lib/research-category"
import {
    criteriaSchemaDefaultValue,
    estimateMinutes,
    identitySchemaDefaultValue,
    timeLimitOptions,
    type EditorValues,
} from "./research-editor-schema"

/**
 * Translation between the editor's form and the research API.
 *
 * The form is deliberately narrower than the API: it offers four demographic
 * controls where the API stores a list of screening rules, and a duration bucket
 * where the API stores a deadline. Everything that has to be inferred is inferred
 * here, in one place, instead of leaking into the page.
 */

const DAY_MS = 86_400_000

/** Fields the editor's criteria controls are stored under. */
const AGE_FIELD = "age"
const GENDER_FIELD = "gender"
const REGION_FIELD = "region"

const REGION_VALUES = ["jabodetabek", "jawa-lainnya", "luar-jawa"]

const DURATION_DAYS = timeLimitOptions.map((option) => Number(option.value))

type DurationDays = EditorValues["allocationToken"]["batasWaktu"]
type SaveOutcome = { ok: true } | { ok: false; message: string }

/* ========== Reading what is stored ========== */

/** The offered duration closest to a stored deadline, so the select always has a value. */
function durationFor(deadline: string): DurationDays {
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / DAY_MS)
    const closest = DURATION_DAYS.reduce((best, candidate) => (Math.abs(candidate - days) < Math.abs(best - days) ? candidate : best))

    return String(closest) as DurationDays
}

/** The four controls, read back out of the stored rules; anything unreadable keeps its default. */
function criteriaValues(rules: ResearchCriterion[]): EditorValues["criteria"] {
    const storedValue = (field: string, operator: string) => rules.find((rule) => rule.field === field && rule.operator === operator)?.value

    const ageMin = Number(storedValue(AGE_FIELD, "GTE"))
    const ageMax = Number(storedValue(AGE_FIELD, "LTE"))
    const gender = storedValue(GENDER_FIELD, "EQ")
    const region = storedValue(REGION_FIELD, "EQ")

    return {
        ageMin: Number.isFinite(ageMin) ? ageMin : criteriaSchemaDefaultValue.ageMin,
        ageMax: Number.isFinite(ageMax) ? ageMax : criteriaSchemaDefaultValue.ageMax,
        gender: gender === "male" || gender === "female" ? gender : "all",
        region: REGION_VALUES.includes(region ?? "") ? (region as EditorValues["criteria"]["region"]) : "all",
    }
}

function choicesFrom(choices: ResearchQuestion["choices"]) {
    return choices.map((choice) => ({
        id: choice.id,
        pos: choice.pos,
        n: choice.n,
        // An essay's options carry no label; the form wants a string either way.
        choiceText: choice.choiceText ?? "",
    }))
}

/** The questionnaire, back in the editor's four types. */
function questionsFrom(questions: ResearchQuestion[]): EditorValues["questions"] {
    return questions.map((question) => {
        const base = { id: question.id, pos: question.pos, question: question.question, mustFill: question.mustFill }
        const choices = choicesFrom(question.choices)

        switch (question.questionType) {
            case "SINGLE_CHOICE":
                return { ...base, questionType: "SINGLE_CHOICE", choices }
            case "MULTIPLE_CHOICE":
                return { ...base, questionType: "MULTIPLE_CHOICE", choices }
            case "SCALE":
                return { ...base, questionType: "SCALE", choices }
            // Anything the editor cannot render is edited as an essay.
            default:
                return { ...base, questionType: "TEXT", choices: [] }
        }
    })
}

function categoryOf(value: string | null): EditorValues["identity"]["category"] {
    return RESEARCH_CATEGORIES.find((category) => category === value) ?? identitySchemaDefaultValue.category
}

/** What the editor should start from, given what the API has stored. */
export function toEditorValues(research: ResearchDetail): EditorValues {
    return {
        identity: {
            title: research.title,
            description: research.description,
            category: categoryOf(research.category),
            // Derived rather than read back: the estimate belongs to the questionnaire's length, so
            // a draft saved under the old fixed default opens with the figure its questions imply.
            estimatedMinutes: estimateMinutes(research.questions.length),
        },
        allocationToken: {
            targetResponden: research.targetRespondentCount,
            tokenPerResponden: research.tokenPerRespondent,
            batasWaktu: durationFor(research.deadline),
        },
        criteria: criteriaValues(research.criteria),
        questions: questionsFrom(research.questions),
    }
}

/* ========== Writing it back ========== */

/** The four controls, as the rule list the API stores. */
function criteriaRules(criteria: EditorValues["criteria"]) {
    const rules = [
        { field: AGE_FIELD, operator: "GTE", value: String(criteria.ageMin) },
        { field: AGE_FIELD, operator: "LTE", value: String(criteria.ageMax) },
    ]

    if (criteria.gender !== "all") rules.push({ field: GENDER_FIELD, operator: "EQ", value: criteria.gender })
    if (criteria.region !== "all") rules.push({ field: REGION_FIELD, operator: "EQ", value: criteria.region })

    return rules
}

/** The questionnaire as the API writes it: positions come from the order, so gaps never travel. */
function questionsPayload(questions: EditorValues["questions"]) {
    return questions.map((question, index) => ({
        pos: index + 1,
        question: question.question.trim(),
        questionType: question.questionType,
        mustFill: question.mustFill,
        choices: question.choices.map((choice, choiceIndex) => ({
            pos: choiceIndex + 1,
            n: choice.n,
            choiceText: choice.choiceText.trim(),
        })),
    }))
}

/** The editor asks for a duration, so the stored deadline is that many days from now. */
function nextDeadline(days: DurationDays) {
    return new Date(Date.now() + Number(days) * DAY_MS).toISOString()
}

/** First thing worth telling the user about a call that did not go through. */
function describeFailure(result: { message: string; errors: Record<string, string> }) {
    const details = Object.values(result.errors)

    return details.length === 0 ? result.message : details.join(" ")
}

/**
 * Writes the whole editor out.
 *
 * Three calls, because that is how the API is shaped: the scalars go through
 * `PATCH`, and the criteria and questionnaire are each replaced wholesale. They are
 * not one endpoint, so the first failure stops the rest and is reported.
 */
export async function saveResearch(researchId: string, values: EditorValues): Promise<SaveOutcome> {
    const patched = await patchJson(`/api/research/${researchId}`, {
        title: values.identity.title.trim(),
        description: values.identity.description.trim(),
        category: values.identity.category,
        targetRespondentCount: values.allocationToken.targetResponden,
        tokenPerRespondent: values.allocationToken.tokenPerResponden,
        estimatedDurationMinutes: values.identity.estimatedMinutes,
        deadline: nextDeadline(values.allocationToken.batasWaktu),
    })

    if (!patched.ok) return { ok: false, message: describeFailure(patched) }

    const criteria = await postJson(`/api/research/${researchId}/create-criteria`, { criteria: criteriaRules(values.criteria) })

    if (!criteria.ok) return { ok: false, message: describeFailure(criteria) }

    const questions = await postJson(`/api/research/${researchId}/create-questions`, { questions: questionsPayload(values.questions) })

    if (!questions.ok) return { ok: false, message: describeFailure(questions) }

    return { ok: true }
}

/** Publishes a research that has already been saved, which is what reserves its tokens. */
export async function publishResearch(researchId: string): Promise<SaveOutcome> {
    const result = await postJson(`/api/research/${researchId}/publish`)

    return result.ok ? { ok: true } : { ok: false, message: describeFailure(result) }
}

type DeleteOutcome = { ok: true; softDeleted: boolean; tokensReleased: number } | { ok: false; message: string }

/**
 * Removes a research.
 *
 * A draft that was never published is deleted outright; anything that has been
 * published is only archived, because participations, answers, and token rows point at
 * it — and archiving releases whatever reward budget nobody consumed.
 */
export async function deleteResearch(researchId: string): Promise<DeleteOutcome> {
    const result = await deleteJson<{ softDeleted: boolean; tokensReleased: number }>(`/api/research/${researchId}`)

    if (!result.ok || result.data === null) return { ok: false, message: describeFailure(result) }

    return { ok: true, softDeleted: result.data.softDeleted, tokensReleased: result.data.tokensReleased }
}
