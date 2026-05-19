import { supabase } from "./supabase";
import type {
    BookStatus,
    ProgressMode,
    SearchBookResult,
} from "@/src/types/book";import { normalizeOpenLibraryWorkId } from "../utils/openLibrary";

type AddBookToUserLibraryOptions = {
    status?: BookStatus;
    progress?: number;
    progressMode?: ProgressMode;
    rating?: number;
    dnfReason?: string;
};

export async function getCurrentUserId() {
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        throw new Error("Geen ingelogde gebruiker gevonden.");
    }

    return user.id;
}

export async function upsertBookFromSearchResult(book: SearchBookResult) {
    const { data, error } = await supabase
        .from("books")
        .upsert(
            {
                open_library_work_id: normalizeOpenLibraryWorkId(book.id) ?? book.id,
                title: book.title,
                author: book.author,
                cover_url: book.cover ?? null,
                first_publish_year: book.firstPublishYear ?? null,
                updated_at: new Date().toISOString(),
                genres: book.genres ?? [],
            },
            {
                onConflict: "open_library_work_id",
            }
        )
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}

export async function addBookToUserLibrary(
    bookId: string,
    userId: string,
    options: AddBookToUserLibraryOptions = {}
) {
    const status = options.status ?? "toRead";

    const { error } = await supabase.from("user_books").insert({
        book_id: bookId,
        user_id: userId,
        status,
        progress: options.progress ?? (status === "finished" ? 100 : 0),
        progress_mode: options.progressMode ?? "percentage",
        rating: options.rating ?? null,
        dnf_reason: options.dnfReason ?? null,
    });

    if (error) {
        throw error;
    }
}

export async function addManualBookToUserLibrary({
                                                     title,
                                                     author,
                                                     firstPublishYear,
                                                     genres,
                                                     status,
                                                     progress,
                                                     progressMode,
                                                     rating,
                                                     dnfReason,
                                                 }: {
    title: string;
    author: string;
    firstPublishYear?: number;
    genres?: string[];
    status?: BookStatus;
    progress?: number;
    progressMode?: ProgressMode;
    rating?: number;
    dnfReason?: string;
}) {
    const userId = await getCurrentUserId();

    const manualBookId = `manual-${userId}-${Date.now()}`;

    const savedBook = await upsertBookFromSearchResult({
        id: manualBookId,
        title,
        author,
        firstPublishYear,
        genres: genres ?? [],
    });

    await addBookToUserLibrary(savedBook.id, userId, {
        status,
        progress,
        progressMode,
        rating,
        dnfReason,
    });

    return savedBook;
}