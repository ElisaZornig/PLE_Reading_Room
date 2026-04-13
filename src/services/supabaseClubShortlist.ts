import { supabase } from "./supabase";
import { upsertBookFromSearchResult } from "./supabaseBooks";
import { getCurrentSupabaseUserId } from "./supabaseUserBooks";
import { SearchBookResult } from "../types/book";

export type ClubShortlistItem = {
    optionId: string;
    bookId: string;
    openLibraryWorkId: string | null;
    title: string;
    author: string;
    cover: string;
    firstPublishYear: number | null;
    reason: string | null;
    source: "algorithm" | "manual";
    status: string;
};

type ClubShortlistRow = {
    id: string;
    source: "algorithm" | "manual";
    reason: string | null;
    status: string;
    book_id: string;
    books: {
        id: string;
        open_library_work_id: string | null;
        title: string;
        author: string;
        cover_url: string | null;
        first_publish_year: number | null;
    } | null;
};

export async function fetchClubShortlist(clubId: string): Promise<ClubShortlistItem[]> {
    const trimmedClubId = clubId.trim();

    if (!trimmedClubId) {
        throw new Error("No club found.");
    }

    const { data, error } = await supabase
        .from("club_book_options")
        .select(`
            id,
            source,
            reason,
            status,
            book_id,
            books (
                id,
                open_library_work_id,
                title,
                author,
                cover_url,
                first_publish_year
            )
        `)
        .eq("club_id", trimmedClubId)
        .in("status", ["suggested", "shortlisted"])
        .order("created_at", { ascending: true });

    if (error) {
        throw error;
    }

    const rows = (data ?? []) as unknown as ClubShortlistRow[];

    return rows
        .filter((row) => row.books)
        .map((row) => ({
            optionId: row.id,
            bookId: row.books!.id,
            openLibraryWorkId: row.books!.open_library_work_id ?? null,
            title: row.books!.title,
            author: row.books!.author,
            cover: row.books!.cover_url ?? "",
            firstPublishYear: row.books!.first_publish_year ?? null,
            reason: row.reason,
            source: row.source,
            status: row.status,
        }));
}

export async function fetchClubShortlistCount(clubId: string): Promise<number> {
    const trimmedClubId = clubId.trim();

    if (!trimmedClubId) {
        return 0;
    }

    const { count, error } = await supabase
        .from("club_book_options")
        .select("*", { count: "exact", head: true })
        .eq("club_id", trimmedClubId)
        .in("status", ["suggested", "shortlisted"]);

    if (error) {
        throw error;
    }

    return count ?? 0;
}

export async function addManualBookToClubShortlist(input: {
    clubId: string;
    book: SearchBookResult;
}) {
    const userId = await getCurrentSupabaseUserId();
    const clubId = input.clubId.trim();

    if (!clubId) {
        throw new Error("No club found.");
    }

    const savedBook = await upsertBookFromSearchResult(input.book);

    const { data: existingOption, error: existingOptionError } = await supabase
        .from("club_book_options")
        .select("id, status")
        .eq("club_id", clubId)
        .eq("book_id", savedBook.id)
        .maybeSingle();

    if (existingOptionError) {
        throw existingOptionError;
    }

    if (existingOption) {
        const { data, error } = await supabase
            .from("club_book_options")
            .update({
                status: "shortlisted",
            })
            .eq("id", existingOption.id)
            .select("id")
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    const { data, error } = await supabase
        .from("club_book_options")
        .insert({
            club_id: clubId,
            book_id: savedBook.id,
            added_by: userId,
            source: "manual",
            reason: null,
            status: "shortlisted",
        })
        .select("id")
        .single();

    if (error) {
        throw error;
    }

    return data;
}

export async function removeBookFromClubShortlist(optionId: string) {
    const trimmedOptionId = optionId.trim();

    if (!trimmedOptionId) {
        throw new Error("No shortlist item found.");
    }

    const { error } = await supabase
        .from("club_book_options")
        .delete()
        .eq("id", trimmedOptionId);

    if (error) {
        throw error;
    }
}

export async function clearClubShortlist(clubId: string) {
    const trimmedClubId = clubId.trim();

    if (!trimmedClubId) {
        throw new Error("No club found.");
    }

    const { error } = await supabase
        .from("club_book_options")
        .delete()
        .eq("club_id", trimmedClubId)
        .in("status", ["suggested", "shortlisted"]);

    if (error) {
        throw error;
    }
}