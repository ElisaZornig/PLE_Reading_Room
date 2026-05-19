import type { SearchBookResult } from "@/src/types/book";

const MIN_WORD_LENGTH_FOR_FALLBACK = 4;

export function normalizeBookSearchText(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function createBookSearchVariants(query: string): string[] {
    const trimmedQuery = query.trim();
    const normalizedQuery = normalizeBookSearchText(trimmedQuery);
    const importantWords = normalizedQuery
        .split(" ")
        .filter((word) => word.length >= MIN_WORD_LENGTH_FOR_FALLBACK);

    const variants = [
        trimmedQuery,
        normalizedQuery,
        importantWords.join(" "),
        ...importantWords,
    ];

    return Array.from(
        new Set(variants.map((variant) => variant.trim()).filter(Boolean))
    ).slice(0, 5);
}

function getLevenshteinDistance(firstValue: string, secondValue: string): number {
    if (firstValue === secondValue) return 0;
    if (!firstValue.length) return secondValue.length;
    if (!secondValue.length) return firstValue.length;

    const previousRow = Array.from(
        { length: secondValue.length + 1 },
        (_, index) => index
    );

    for (let firstIndex = 0; firstIndex < firstValue.length; firstIndex += 1) {
        let previousDiagonal = previousRow[0];
        previousRow[0] = firstIndex + 1;

        for (let secondIndex = 0; secondIndex < secondValue.length; secondIndex += 1) {
            const previousAbove = previousRow[secondIndex + 1];
            const cost = firstValue[firstIndex] === secondValue[secondIndex] ? 0 : 1;

            previousRow[secondIndex + 1] = Math.min(
                previousRow[secondIndex + 1] + 1,
                previousRow[secondIndex] + 1,
                previousDiagonal + cost
            );

            previousDiagonal = previousAbove;
        }
    }

    return previousRow[secondValue.length];
}

function getSimilarity(firstValue: string, secondValue: string): number {
    const longestLength = Math.max(firstValue.length, secondValue.length);

    if (!longestLength) return 1;

    return 1 - getLevenshteinDistance(firstValue, secondValue) / longestLength;
}

function getBestWordSimilarity(queryWord: string, targetWords: string[]): number {
    if (targetWords.includes(queryWord)) return 1;

    return Math.max(
        0,
        ...targetWords.map((targetWord) => getSimilarity(queryWord, targetWord))
    );
}

export function getBookSearchScore(query: string, book: SearchBookResult): number {
    const normalizedQuery = normalizeBookSearchText(query);

    if (!normalizedQuery) return 0;

    const normalizedTitle = normalizeBookSearchText(book.title);
    const normalizedAuthor = normalizeBookSearchText(book.author);
    const searchableText = `${normalizedTitle} ${normalizedAuthor}`.trim();

    if (normalizedTitle === normalizedQuery) return 100;
    if (searchableText.includes(normalizedQuery)) return 85;

    const queryWords = normalizedQuery.split(" ").filter(Boolean);
    const targetWords = searchableText.split(" ").filter(Boolean);

    const averageWordScore =
        queryWords.reduce(
            (total, queryWord) => total + getBestWordSimilarity(queryWord, targetWords),
            0
        ) / queryWords.length;

    const titleSimilarity = getSimilarity(normalizedQuery, normalizedTitle);

    return Math.round((averageWordScore * 70 + titleSimilarity * 30) * 100) / 100;
}

export function rankBookSearchResults(
    query: string,
    books: SearchBookResult[]
): SearchBookResult[] {
    return [...books]
        .map((book, index) => ({
            book,
            index,
            score: getBookSearchScore(query, book),
        }))
        .sort((firstBook, secondBook) => {
            if (secondBook.score !== firstBook.score) {
                return secondBook.score - firstBook.score;
            }

            return firstBook.index - secondBook.index;
        })
        .map(({ book }) => book);
}