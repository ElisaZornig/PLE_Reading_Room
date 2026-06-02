import { Book } from "@/src/types/book";

export type MonthlyReadingStats = {
    finishedCount: number;
    readingCount: number;
    topGenre: string | null;
};

function isSameMonth(dateValue: string | undefined, referenceDate: Date) {
    if (!dateValue) {
        return false;
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return false;
    }

    return (
        date.getMonth() === referenceDate.getMonth() &&
        date.getFullYear() === referenceDate.getFullYear()
    );
}

function normalizeGenre(genre: string) {
    return genre.trim().toLowerCase();
}

function formatGenreLabel(genre: string) {
    return genre
        .split(" ")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

export function getMonthlyReadingStats(
    books: Book[],
    referenceDate = new Date()
): MonthlyReadingStats {
    const booksUpdatedThisMonth = books.filter((book) =>
        isSameMonth(book.updatedAt, referenceDate)
    );

    const finishedCount = booksUpdatedThisMonth.filter(
        (book) => book.status === "finished"
    ).length;

    const readingCount = books.filter((book) => book.status === "reading").length;

    const genreCounts = new Map<string, number>();

    for (const book of booksUpdatedThisMonth) {
        for (const rawGenre of book.genres ?? []) {
            const genre = normalizeGenre(rawGenre);

            if (!genre) {
                continue;
            }

            genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
        }
    }

    const topGenre =
        [...genreCounts.entries()].sort((a, b) => {
            const countDifference = b[1] - a[1];

            if (countDifference !== 0) {
                return countDifference;
            }

            return a[0].localeCompare(b[0]);
        })[0]?.[0] ?? null;

    return {
        finishedCount,
        readingCount,
        topGenre: topGenre ? formatGenreLabel(topGenre) : null,
    };
}