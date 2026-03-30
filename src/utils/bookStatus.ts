import { t } from "../i18n";
import { BookStatus } from "../types/book";

export function getBookStatusLabel(status: BookStatus) {
    switch (status) {
        case "toRead":
            return t("books.statusWantToRead");
        case "reading":
            return t("books.statusReading");
        case "finished":
            return t("books.statusFinished");
        case "dnf":
            return t("books.statusStopped");
        default:
            return "";
    }
}