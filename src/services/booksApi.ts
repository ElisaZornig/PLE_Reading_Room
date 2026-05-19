import { SearchBookResult } from "../types/book";
import {createBookSearchVariants, rankBookSearchResults} from "@/src/utils/bookSearch";

type OpenLibraryDoc = {
    key: string;
    title?: string;
    author_name?: string[];
    cover_i?: number;
    first_publish_year?: number;
};

type OpenLibraryResponse = {
    docs?: OpenLibraryDoc[];
};

const SEARCH_RESULT_LIMIT = 10;
const FALLBACK_SEARCH_LIMIT = 8;
const MIN_RESULTS_BEFORE_FALLBACK = 5;

function mapOpenLibraryDocToSearchResult(doc: OpenLibraryDoc): SearchBookResult | null {
    if (!doc.title) {
        return null;
    }

    return {
        id: doc.key,
        title: doc.title,
        author: doc.author_name?.[0] ?? "Onbekende auteur",
        cover: doc.cover_i
            ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
            : undefined,
        firstPublishYear: doc.first_publish_year,
    };
}

function removeDuplicateBooks(books: SearchBookResult[]): SearchBookResult[] {
    const seenBookIds = new Set<string>();

    return books.filter((book) => {
        if (seenBookIds.has(book.id)) {
            return false;
        }

        seenBookIds.add(book.id);
        return true;
    });
}

async function fetchOpenLibraryBooks(
    query: string,
    limit = SEARCH_RESULT_LIMIT
): Promise<SearchBookResult[]> {
    const params = new URLSearchParams({
        q: query,
        fields: "key,title,author_name,cover_i,first_publish_year",
        limit: String(limit),
    });

    const response = await fetch(
        `https://openlibrary.org/search.json?${params.toString()}`
    );

    if (!response.ok) {
        throw new Error("Zoeken naar boeken is mislukt.");
    }

    const data: OpenLibraryResponse = await response.json();

    return (data.docs ?? [])
        .map(mapOpenLibraryDocToSearchResult)
        .filter((book): book is SearchBookResult => Boolean(book));
}

export async function searchBooks(query: string): Promise<SearchBookResult[]> {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
        return [];
    }

    const [primaryQuery, ...fallbackQueries] = createBookSearchVariants(trimmedQuery);

    const primaryResults = await fetchOpenLibraryBooks(
        primaryQuery ?? trimmedQuery,
        SEARCH_RESULT_LIMIT
    );

    if (primaryResults.length >= MIN_RESULTS_BEFORE_FALLBACK) {
        return rankBookSearchResults(trimmedQuery, primaryResults).slice(
            0,
            SEARCH_RESULT_LIMIT
        );
    }

    const fallbackResults = await Promise.all(
        fallbackQueries.map((fallbackQuery) =>
            fetchOpenLibraryBooks(fallbackQuery, FALLBACK_SEARCH_LIMIT).catch(() => [])
        )
    );

    const mergedResults = removeDuplicateBooks([
        ...primaryResults,
        ...fallbackResults.flat(),
    ]);

    return rankBookSearchResults(trimmedQuery, mergedResults).slice(
        0,
        SEARCH_RESULT_LIMIT
    );
}

export async function getSubjectBooks(
    subject: string
): Promise<SearchBookResult[]> {
    const response = await fetch(
        `https://openlibrary.org/subjects/${subject}.json?details=false&limit=10`
    );

    if (!response.ok) {
        throw new Error("Aanbevolen boeken ophalen is mislukt.");
    }

    const data = await response.json();

    return (data.works ?? []).map((work: any) => ({
        id: work.key,
        title: work.title ?? "Onbekende titel",
        author: work.authors?.[0]?.name ?? "Onbekende auteur",
        cover: work.cover_id
            ? `https://covers.openlibrary.org/b/id/${work.cover_id}-M.jpg`
            : undefined,
        firstPublishYear: work.first_publish_year,
    }));
}

type OpenLibraryWorkDetails = {
    description?: string | { value?: string };
    subjects?: string[];
};

function getOpenLibraryDescription(
    description: OpenLibraryWorkDetails["description"]
) {
    if (!description) return undefined;

    if (typeof description === "string") {
        return description;
    }

    return description.value;
}

export async function fetchBookDetailsByWorkId(workId: string) {
    const normalizedWorkPath = workId.startsWith("/works/")
        ? workId
        : `/works/${workId}`;

    const response = await fetch(
        `https://openlibrary.org${normalizedWorkPath}.json`
    );

    if (!response.ok) {
        throw new Error("Boekdetails ophalen is mislukt.");
    }

    const data: OpenLibraryWorkDetails = await response.json();

    return {
        description: getOpenLibraryDescription(data.description),
        subjects: data.subjects ?? [],
    };
}