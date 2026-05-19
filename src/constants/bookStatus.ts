import type { BookStatus } from "@/src/types/book";

export const ADD_BOOK_STATUS_OPTIONS: {
    labelKey: string;
    value: BookStatus;
}[] = [
    {
        labelKey: "bookStatus.toRead",
        value: "toRead",
    },
    {
        labelKey: "bookStatus.reading",
        value: "reading",
    },
    {
        labelKey: "bookStatus.finished",
        value: "finished",
    },
    {
        labelKey: "bookStatus.dnf",
        value: "dnf",
    },
];