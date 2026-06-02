function normalizeQuestionText(question: string) {
    return question.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getPresetQuestionsToAdd({
                                            selectedQuestions,
                                            existingQuestions,
                                        }: {
    selectedQuestions: string[];
    existingQuestions: string[];
}) {
    const existingNormalized = new Set(
        existingQuestions
            .map(normalizeQuestionText)
            .filter((question) => question.length > 0)
    );

    const selectedNormalized = new Set<string>();

    return selectedQuestions
        .map((question) => question.trim())
        .filter((question) => {
            const normalizedQuestion = normalizeQuestionText(question);

            if (!normalizedQuestion) {
                return false;
            }

            if (existingNormalized.has(normalizedQuestion)) {
                return false;
            }

            if (selectedNormalized.has(normalizedQuestion)) {
                return false;
            }

            selectedNormalized.add(normalizedQuestion);
            return true;
        });
}