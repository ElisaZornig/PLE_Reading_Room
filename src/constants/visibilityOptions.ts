import {CommentVisibilityMode} from "@/src/services/supabaseClub";

export const COMMENT_VISIBILITY_OPTIONS: {
    value: CommentVisibilityMode;
    labelKey: string;
    descriptionKey: string;
}[] = [
    {
        value: "always",
        labelKey: "club.commentsAlwaysVisible",
        descriptionKey: "club.commentsAlwaysVisibleDescription",
    },
    {
        value: "sameProgress",
        labelKey: "club.commentsSameProgress",
        descriptionKey: "club.commentsSameProgressDescription",
    },
    {
        value: "meetingDay",
        labelKey: "club.commentsMeetingDay",
        descriptionKey: "club.commentsMeetingDayDescription",
    },
];