import { supabase } from "./supabase";
import { Book } from "../types/book";

type UserBookRow = {
    id: string;
    status: "toRead" | "reading" | "finished" | "dnf";
    progress: number | null;
    progress_mode: "percentage" | "pages" | null;
    current_page: number | null;
    total_pages: number | null;
    rating: number | null;
    review: string | null;
    dnf_reason: string | null;
    updated_at: string | null;
    books: {
        id: string;
        title: string;
        author: string;
        cover_url: string | null;
    } | null;
};

export async function getCurrentSupabaseUserId() {
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        throw new Error("Geen ingelogde gebruiker gevonden.");
    }

    return user.id;
}

export async function fetchUserBooksFromSupabase(): Promise<Book[]> {
    const userId = await getCurrentSupabaseUserId();

    const { data, error } = await supabase
        .from("user_books")
        .select(
            `
      id,
      status,
      progress,
      progress_mode,
      current_page,
      total_pages,
      rating,
      review,
      dnf_reason,
      updated_at,
      books (
        id,
        title,
        author,
        cover_url
      )
    `
        )
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

    if (error) {
        throw error;
    }

    const rows = (data ?? []) as unknown as UserBookRow[];

    return rows
        .filter((row) => row.books)
        .map((row) => ({
            id: row.books!.id,
            title: row.books!.title,
            author: row.books!.author,
            cover: row.books!.cover_url ?? "",
            status: row.status,
            progress: row.progress ?? undefined,
            progressMode: row.progress_mode ?? undefined,
            currentPage: row.current_page ?? undefined,
            totalPages: row.total_pages ?? undefined,
            rating: row.rating ?? undefined,
            review: row.review ?? undefined,
            dnfReason: row.dnf_reason ?? undefined,
            updatedAt: row.updated_at ?? undefined,
        }));
}

export async function removeUserBookFromSupabase(openLibraryWorkId: string) {
    const userId = await getCurrentSupabaseUserId();

    const { data: bookRow, error: bookError } = await supabase
        .from("books")
        .select("id")
        .eq("open_library_work_id", openLibraryWorkId)
        .maybeSingle();

    if (bookError) {
        throw bookError;
    }

    if (!bookRow) {
        return;
    }

    const { error } = await supabase
        .from("user_books")
        .delete()
        .eq("user_id", userId)
        .eq("book_id", bookRow.id);

    if (error) {
        throw error;
    }
}

export async function fetchSingleUserBookFromSupabase(bookId: string): Promise<Book | null> {
    const userId = await getCurrentSupabaseUserId();

    const { data, error } = await supabase
        .from("user_books")
        .select(
            `
      id,
      status,
      progress,
      progress_mode,
      current_page,
      total_pages,
      rating,
      review,
      dnf_reason,
      updated_at,
      books (
        id,
        title,
        author,
        cover_url
      )
    `
        )
        .eq("user_id", userId)
        .eq("book_id", bookId)
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!data || !data.books) {
        return null;
    }

    const row = data as unknown as UserBookRow;

    return {
        id: row.books.id,
        title: row.books.title,
        author: row.books.author,
        cover: row.books.cover_url ?? "",
        status: row.status,
        progress: row.progress ?? undefined,
        progressMode: row.progress_mode ?? undefined,
        currentPage: row.current_page ?? undefined,
        totalPages: row.total_pages ?? undefined,
        rating: row.rating ?? undefined,
        review: row.review ?? undefined,
        dnfReason: row.dnf_reason ?? undefined,
        updatedAt: row.updated_at ?? undefined,
    };
}

export async function updateUserBookInSupabase(book: Book) {
    const userId = await getCurrentSupabaseUserId();

    const { error } = await supabase
        .from("user_books")
        .update({
            status: book.status,
            progress: book.progress ?? null,
            progress_mode: book.progressMode ?? null,
            current_page: book.currentPage ?? null,
            total_pages: book.totalPages ?? null,
            rating: book.rating ?? null,
            review: book.review ?? null,
            dnf_reason: book.dnfReason ?? null,
            updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("book_id", book.id);

    if (error) {
        throw error;
    }
}
export async function fetchStoredBookIdsFromSupabase(): Promise<string[]> {
    const userId = await getCurrentSupabaseUserId();

    const { data, error } = await supabase
        .from("user_books")
        .select(
            `
      books (
        open_library_work_id
      )
    `
        )
        .eq("user_id", userId);

    if (error) {
        throw error;
    }

    return (data ?? [])
        .map((row: any) => row.books?.open_library_work_id)
        .filter(Boolean);
}