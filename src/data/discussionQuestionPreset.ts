export type DiscussionQuestionPresetPackId = "starter" | "deepDive" | "spicy";

export type DiscussionQuestionPreset = {
    id: string;
    textKey: string;
};

export type DiscussionQuestionPresetPack = {
    id: DiscussionQuestionPresetPackId;
    titleKey: string;
    descriptionKey: string;
    questions: DiscussionQuestionPreset[];
};

export const DISCUSSION_QUESTION_PRESETS: DiscussionQuestionPresetPack[] = [
    {
        id: "starter",
        titleKey: "discussion.presetStarterTitle",
        descriptionKey: "discussion.presetStarterDescription",
        questions: [
            { id: "first-impression", textKey: "discussion.presetQuestionFirstImpression" },
            { id: "most-memorable", textKey: "discussion.presetQuestionMostMemorable" },
            { id: "favorite-character", textKey: "discussion.presetQuestionFavoriteCharacter" },
            { id: "pace", textKey: "discussion.presetQuestionPace" },
            { id: "recommend", textKey: "discussion.presetQuestionRecommend" },
        ],
    },
    {
        id: "deepDive",
        titleKey: "discussion.presetDeepDiveTitle",
        descriptionKey: "discussion.presetDeepDiveDescription",
        questions: [
            { id: "strongest-theme", textKey: "discussion.presetQuestionStrongestTheme" },
            { id: "character-change", textKey: "discussion.presetQuestionCharacterChange" },
            { id: "ending-meaning", textKey: "discussion.presetQuestionEndingMeaning" },
            { id: "disagree-choice", textKey: "discussion.presetQuestionDisagreeChoice" },
            { id: "scene-summary", textKey: "discussion.presetQuestionSceneSummary" },
        ],
    },
    {
        id: "spicy",
        titleKey: "discussion.presetSpicyTitle",
        descriptionKey: "discussion.presetSpicyDescription",
        questions: [
            { id: "block-character", textKey: "discussion.presetQuestionBlockCharacter" },
            { id: "bad-choice", textKey: "discussion.presetQuestionBadChoice" },
            { id: "real-villain", textKey: "discussion.presetQuestionRealVillain" },
            { id: "tiktok-scene", textKey: "discussion.presetQuestionTiktokScene" },
            { id: "therapy-character", textKey: "discussion.presetQuestionTherapyCharacter" },
        ],
    },
];