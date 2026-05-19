import { supabase } from "./supabase";
import { SearchBookResult } from "../types/book";
import { normalizeOpenLibraryWorkId } from "../utils/openLibrary";

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

export async function addBookToUserLibrary(bookId: string, userId: string) {
    const { data, error } = await supabase
        .from("user_books")
        .upsert(
            {
                user_id: userId,
                book_id: bookId,
                status: "toRead",
                progress: 0,
                progress_mode: "percentage",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
            {
                onConflict: "user_id,book_id",
            }
        )
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}

export async function addManualBookToUserLibrary({
                                                     title,
                                                     author,
                                                     firstPublishYear,
                                                     genres,
                                                 }: {
    title: string;
    author: string;
    firstPublishYear?: number;
    genres?: string[];
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

    await addBookToUserLibrary(savedBook.id, userId);

    return savedBook;
}