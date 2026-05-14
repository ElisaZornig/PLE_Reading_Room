import { supabase } from "@/src/services/supabase";

export type ReadingBook = {
    id: string;
    userBookId: string;
    title: string;
    author: string | null;
    coverUrl: string | null;
    status: string;
    progress: number | null;
    rating: number | null;
    updatedAt: string | null;
};

export type FriendReadingSummary = {
    userId: string;
    currentBook: ReadingBook | null;
    tbrCount: number;
    lastUpdated: string | null;
};

export type FriendReadingProfile = {
    currentBooks: ReadingBook[];
    tbr: ReadingBook[];
    readBooks: ReadingBook[];
};

type UserBookRow = {
    id: string;
    user_id: string;
    status: string;
    progress: number | null;
    rating: number | null;
    updated_at: string | null;
    book: {
        id: string;
        title: string;
        author: string | null;
        cover_url: string | null;
    } | {
        id: string;
        title: string;
        author: string | null;
        cover_url: string | null;
    }[] | null;
};

function normalizeBook(row: UserBookRow): ReadingBook | null {
    const book = Array.isArray(row.book) ? row.book[0] : row.book;

    if (!book) return null;

    return {
        id: book.id,
        userBookId: row.id,
        title: book.title,
        author: book.author,
        coverUrl: book.cover_url,
        status: row.status,
        progress: row.progress,
        rating: row.rating,
        updatedAt: row.updated_at,
    };
}

export async function getFriendReadingSummary(
    userId: string
): Promise<FriendReadingSummary> {
    const { data, error } = await supabase
        .from("user_books")
        .select(`
            id,
            user_id,
            status,
            progress,
            rating,
            updated_at,
            book:books (
                id,
                title,
                author,
                cover_url
            )
        `)
        .eq("user_id", userId)
        .in("status", ["reading", "toRead", "finished"])
        .order("updated_at", { ascending: false });

    if (error) {
        throw error;
    }

    const rows = (data ?? []) as unknown as UserBookRow[];

    const books = rows
        .map(normalizeBook)
        .filter((book): book is ReadingBook => book !== null);

    const currentBook =
        books.find((book) => book.status === "reading") ?? null;

    const tbrCount = books.filter((book) => book.status === "toRead").length;

    const lastUpdated = books[0]?.updatedAt ?? null;

    return {
        userId,
        currentBook,
        tbrCount,
        lastUpdated,
    };
}

export async function getFriendsReadingSummaries(
    userIds: string[]
): Promise<Record<string, FriendReadingSummary>> {
    if (userIds.length === 0) return {};

    const summaries = await Promise.all(
        userIds.map((userId) => getFriendReadingSummary(userId))
    );

    return summaries.reduce<Record<string, FriendReadingSummary>>(
        (acc, summary) => {
            acc[summary.userId] = summary;
            return acc;
        },
        {}
    );
}

export async function getFriendReadingProfile(
    userId: string
): Promise<FriendReadingProfile> {
    const { data, error } = await supabase
        .from("user_books")
        .select(`
            id,
            user_id,
            status,
            progress,
            rating,
            updated_at,
            book:books (
                id,
                title,
                author,
                cover_url
            )
        `)
        .eq("user_id", userId)
        .in("status", ["reading", "toRead", "finished"])
        .order("updated_at", { ascending: false });

    if (error) {
        throw error;
    }

    const rows = (data ?? []) as unknown as UserBookRow[];

    const books = rows
        .map(normalizeBook)
        .filter((book): book is ReadingBook => book !== null);


    return {
        currentBooks: books.filter((book) => book.status === "reading"),
        tbr: books.filter((book) => book.status === "toRead"),
        readBooks: books.filter((book) => book.status === "finished"),
    };
}