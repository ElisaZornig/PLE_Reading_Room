import { t } from "../i18n";
import { BookStatus } from "../types/book";
import { AppTheme } from "../theme/theme";

export function getBookStatusLabel(status: BookStatus) {
    switch (status) {
        case "toRead":
            return t("books.toRead");
        case "reading":
            return t("books.reading");
        case "finished":
            return t("books.finished");
        case "dnf":
            return t("books.dnf");
        default:
            return "";
    }
}

export function getBookStatusColors(status: BookStatus, theme: AppTheme) {
    switch (status) {
        case "reading":
            return {
                backgroundColor: theme.colors.accentSoft,
                textColor: theme.colors.accent,
            };
        case "finished":
            return {
                backgroundColor: "#E8F6EE",
                textColor: "#2F7D57",
            };
        case "toRead":
            return {
                backgroundColor: "#F1ECFF",
                textColor: "#6B4FB3",
            };
        case "dnf":
            return {
                backgroundColor: "#FBECEC",
                textColor: "#A15454",
            };
        default:
            return {
                backgroundColor: theme.colors.surface,
                textColor: theme.colors.textMuted,
            };
    }
}