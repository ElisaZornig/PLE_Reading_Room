import { SearchBookResult } from "../types/book";

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

export async function searchBooks(query: string): Promise<SearchBookResult[]> {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
        return [];
    }

    const params = new URLSearchParams({
        q: trimmedQuery,
        fields: "key,title,author_name,cover_i,first_publish_year",
        limit: "10",
    });

    const response = await fetch(
        `https://openlibrary.org/search.json?${params.toString()}`
    );

    if (!response.ok) {
        throw new Error("Zoeken naar boeken is mislukt.");
    }

    const data: OpenLibraryResponse = await response.json();

    return (data.docs ?? [])
        .filter((doc) => doc.title)
        .map((doc) => ({
            id: doc.key,
            title: doc.title ?? "Onbekende titel",
            author: doc.author_name?.[0] ?? "Onbekende auteur",
            cover: doc.cover_i
                ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
                : undefined,
            firstPublishYear: doc.first_publish_year,
        }));
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