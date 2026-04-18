export function normalizeOpenLibraryWorkId(value?: string | null) {
    if (!value) {
        return null;
    }

    const trimmed = value.trim();

    if (!trimmed) {
        return null;
    }

    if (trimmed.startsWith("https://openlibrary.org/works/")) {
        const normalized = trimmed.replace("https://openlibrary.org/works/", "").trim();
        return /^OL\d+W$/i.test(normalized) ? normalized.toUpperCase() : null;
    }

    if (trimmed.startsWith("/works/")) {
        const normalized = trimmed.replace("/works/", "").trim();
        return /^OL\d+W$/i.test(normalized) ? normalized.toUpperCase() : null;
    }

    if (/^OL\d+W$/i.test(trimmed)) {
        return trimmed.toUpperCase();
    }

    return null;
}

export function isValidOpenLibraryWorkId(value?: string | null) {
    return normalizeOpenLibraryWorkId(value) !== null;
}

export function getOpenLibraryWorkId(value: string) {
    return value.replace("/works/", "").trim();
}