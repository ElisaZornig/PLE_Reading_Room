import { normalizeBookDescription } from "@/src/utils/bookDescription";

type OpenLibraryWorkResponse = {
    description?: string | { value?: string };
};

function getOpenLibraryPath(bookId: string) {
    const value = bookId.trim();

    if (!value) return "";

    if (value.startsWith("/works/") || value.startsWith("/books/")) {
        return value;
    }

    if (value.startsWith("OL") && value.endsWith("W")) {
        return `/works/${value}`;
    }

    if (value.startsWith("OL") && value.endsWith("M")) {
        return `/books/${value}`;
    }

    return `/works/${value}`;
}

export async function fetchOpenLibraryDescriptionSnippet(bookId: string) {
    const path = getOpenLibraryPath(bookId);

    if (!path) {
        return "";
    }

    try {
        const response = await fetch(`https://openlibrary.org${path}.json`);

        if (!response.ok) {
            return "";
        }

        const data = (await response.json()) as OpenLibraryWorkResponse;

        return normalizeBookDescription(data.description);
    } catch (error) {
        console.error("Error fetching Open Library description:", error);
        return "";
    }
}