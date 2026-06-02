import { describe, expect, it } from "vitest";
import { getPresetQuestionsToAdd } from "./discussionPresetQuestions";

describe("getPresetQuestionsToAdd", () => {
    it("filters out questions that already exist", () => {
        const result = getPresetQuestionsToAdd({
            selectedQuestions: [
                "What did you think of the ending?",
                "Which moment stayed with you?",
            ],
            existingQuestions: ["What did you think of the ending?"],
        });

        expect(result).toEqual(["Which moment stayed with you?"]);
    });

    it("filters out duplicate selected questions", () => {
        const result = getPresetQuestionsToAdd({
            selectedQuestions: [
                "Which character did you like most?",
                "  Which character did you like most?  ",
            ],
            existingQuestions: [],
        });

        expect(result).toEqual(["Which character did you like most?"]);
    });

    it("ignores empty questions", () => {
        const result = getPresetQuestionsToAdd({
            selectedQuestions: ["", "   ", "Would you recommend this book?"],
            existingQuestions: [],
        });

        expect(result).toEqual(["Would you recommend this book?"]);
    });
});