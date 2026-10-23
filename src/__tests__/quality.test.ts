import { describe, expect, test } from "vitest"
import { computeAutoScore, detectStraightLining, isTooFast, screenSubmission, screeningVerdict } from "@/lib/server/quality"

const questions = [
    {
        id: "q1",
        choices: [
            { id: "q1-a", pos: 0 },
            { id: "q1-b", pos: 1 },
        ],
    },
    {
        id: "q2",
        choices: [
            { id: "q2-a", pos: 0 },
            { id: "q2-b", pos: 1 },
        ],
    },
    {
        id: "q3",
        choices: [
            { id: "q3-a", pos: 0 },
            { id: "q3-b", pos: 1 },
        ],
    },
]

describe("quality screening", () => {
    test("flags only completions below the configured pace threshold", () => {
        expect(isTooFast(98, 300)).toBe(true)
        expect(isTooFast(99, 300)).toBe(false)
        expect(isTooFast(10, 0)).toBe(false)
    })

    test("detects a repeated choice position rather than repeated choice ids", () => {
        expect(
            detectStraightLining(
                questions.map((question) => ({
                    researchQuestionId: question.id,
                    choiceIds: [question.choices[0].id],
                })),
                questions,
            ),
        ).toBe(true)
    })

    test("ignores multi-select answers and scores fired signals consistently", () => {
        const multiSelectAnswers = questions.map((question) => ({
            researchQuestionId: question.id,
            choiceIds: [question.choices[0].id, question.choices[1].id],
        }))

        expect(detectStraightLining(multiSelectAnswers, questions)).toBe(false)
        expect(computeAutoScore([])).toBe(1)
        expect(computeAutoScore(["SPEEDING", "STRAIGHT_LINING"])).toBe(0)
    })

    test("combines pace and answer-pattern flags for a submission", () => {
        const submittedAt = new Date("2026-01-01T00:00:10.000Z")
        const result = screenSubmission({
            startedAt: new Date("2026-01-01T00:00:00.000Z"),
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            submittedAt,
            estimatedDurationMinutes: 5,
            questions,
            answers: questions.map((question) => ({
                researchQuestionId: question.id,
                choiceIds: [question.choices[0].id],
            })),
        })

        expect(result).toEqual({ signalFlags: ["SPEEDING", "STRAIGHT_LINING"], autoScore: 0 })
    })

    test("derives CLEAN with a full score, and FLAGGED with a score that drops per signal", () => {
        expect(screeningVerdict([], computeAutoScore([]))).toEqual({ result: "CLEAN", score: 100 })
        expect(screeningVerdict(["SPEEDING"], computeAutoScore(["SPEEDING"]))).toEqual({
            result: "FLAGGED",
            score: 50,
        })
        expect(screeningVerdict(["SPEEDING", "STRAIGHT_LINING"], computeAutoScore(["SPEEDING", "STRAIGHT_LINING"]))).toEqual({
            result: "FLAGGED",
            score: 0,
        })
    })
})
