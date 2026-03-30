export type BookStatus = "reading" | "toRead" | "finished" | "dnf";
export type ProgressMode = "percentage" | "pages";

export type Book = {
    id: string;
    title: string;
    author: string;
    status: BookStatus;
    progress?: number;
    progressMode?: ProgressMode;
    currentPage?: number;
    totalPages?: number;
    cover?: string;
    rating?: number;
    review?: string;
    dnfReason?: string;
    updatedAt?: string;
};

export type RecommendedBook = {
    id: string;
    title: string;
    author: string;
    reasons: string[];
    cover?: string;
};

export type SearchBookResult = {
    id: string;
    title: string;
    author: string;
    cover?: string;
    firstPublishYear?: number;
};