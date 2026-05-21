import { supabase } from "./supabase";
import { fetchCurrentUserClubRole } from "./supabaseClub";
import { getCurrentSupabaseUserId } from "./supabaseUserBooks";
import {fetchOpenLibraryDescriptionSnippet} from "@/src/services/openLibraryDescription";

export type SwipeState = {
    activeSessionId: string | null;
    isOwner: boolean;
    hasCompletedSwipe: boolean;
    totalBooks: number;
    votedBooks: number;
};

type SwipeSessionRow = {
    id: string;
};

export async function fetchClubSwipeState(clubId: string): Promise<SwipeState> {
    const trimmedClubId = clubId.trim();

    if (!trimmedClubId) {
        throw new Error("No club found.");
    }

    const userId = await getCurrentSupabaseUserId();
    const role = await fetchCurrentUserClubRole({ clubId: trimmedClubId });

    const { data: activeSession, error: sessionError } = await supabase
        .from("club_swipe_sessions")
        .select("id")
        .eq("club_id", trimmedClubId)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (sessionError) {
        throw sessionError;
    }

    if (!activeSession) {
        return {
            activeSessionId: null,
            isOwner: role === "owner",
            hasCompletedSwipe: false,
            totalBooks: 0,
            votedBooks: 0,
        };
    }

    const sessionId = (activeSession as SwipeSessionRow).id;

    const [optionsResult, votesResult] = await Promise.all([
        supabase
            .from("club_swipe_session_options")
            .select("id", { count: "exact", head: true })
            .eq("session_id", sessionId),
        supabase
            .from("club_swipe_votes")
            .select("option_id")
            .eq("session_id", sessionId)
            .eq("user_id", userId),
    ]);

    if (optionsResult.error) {
        throw optionsResult.error;
    }

    if (votesResult.error) {
        throw votesResult.error;
    }

    const totalBooks = optionsResult.count ?? 0;
    const votedBooks = new Set((votesResult.data ?? []).map((vote) => vote.option_id)).size;

    return {
        activeSessionId: sessionId,
        isOwner: role === "owner",
        hasCompletedSwipe: totalBooks > 0 && votedBooks >= totalBooks,
        totalBooks,
        votedBooks,
    };
}

export async function createClubSwipeSession(clubId: string) {
    const trimmedClubId = clubId.trim();

    if (!trimmedClubId) {
        throw new Error("No club found.");
    }

    const userId = await getCurrentSupabaseUserId();
    const role = await fetchCurrentUserClubRole({ clubId: trimmedClubId });

    if (role !== "owner") {
        throw new Error("Only the owner can open a swipe round.");
    }

    const { data: existingSession, error: existingError } = await supabase
        .from("club_swipe_sessions")
        .select("id")
        .eq("club_id", trimmedClubId)
        .eq("status", "open")
        .maybeSingle();

    if (existingError) {
        throw existingError;
    }

    if (existingSession) {
        return existingSession;
    }

    const { data: options, error: optionsError } = await supabase
        .from("club_book_options")
        .select("id")
        .eq("club_id", trimmedClubId)
        .in("status", ["suggested", "shortlisted"])
        .order("created_at", { ascending: true });

    if (optionsError) {
        throw optionsError;
    }

    if (!options || options.length < 2) {
        throw new Error("Add at least 2 books to the shortlist before opening a swipe round.");
    }

    const { data: session, error: sessionError } = await supabase
        .from("club_swipe_sessions")
        .insert({
            club_id: trimmedClubId,
            created_by: userId,
            status: "open",
        })
        .select("id")
        .single();

    if (sessionError) {
        throw sessionError;
    }

    const sessionOptions = options.map((option) => ({
        session_id: session.id,
        option_id: option.id,
    }));

    const { error: insertOptionsError } = await supabase
        .from("club_swipe_session_options")
        .insert(sessionOptions);

    if (insertOptionsError) {
        await supabase.from("club_swipe_sessions").delete().eq("id", session.id);
        throw insertOptionsError;
    }

    return session;
}

export async function resetClubSwipeSession(clubId: string) {
    const trimmedClubId = clubId.trim();

    if (!trimmedClubId) {
        throw new Error("No club found.");
    }

    const role = await fetchCurrentUserClubRole({ clubId: trimmedClubId });

    if (role !== "owner") {
        throw new Error("Only the owner can reset a swipe round.");
    }

    const { error } = await supabase
        .from("club_swipe_sessions")
        .delete()
        .eq("club_id", trimmedClubId)
        .eq("status", "open");

    if (error) {
        throw error;
    }
}
export type SwipeBookOption = {
    optionId: string;
    bookId: string;
    title: string;
    author: string;
    cover: string;
    firstPublishYear: number | null;
    description: string;
};

type SwipeOptionRow = {
    option_id: string;
    club_book_options: {
        id: string;
        book_id: string;
        books: {
            id: string;
            open_library_work_id: string | null;
            title: string;
            author: string;
            cover_url: string | null;
            first_publish_year: number | null;
            description_snippet: string | null;
        } | null;
    } | null;
};

export async function fetchSwipeBooks(sessionId: string): Promise<SwipeBookOption[]> {
    const trimmedSessionId = sessionId.trim();

    if (!trimmedSessionId) {
        throw new Error("No swipe session found.");
    }

    const userId = await getCurrentSupabaseUserId();

    const [optionsResult, votesResult] = await Promise.all([
        supabase
            .from("club_swipe_session_options")
            .select(`
                option_id,
                club_book_options (
                    id,
                    book_id,
                    books (
                        id,
                        open_library_work_id,
                        title,
                        author,
                        cover_url,
                        first_publish_year,
                        description_snippet
                    )
                )
            `)
            .eq("session_id", trimmedSessionId)
            .order("created_at", { ascending: true }),

        supabase
            .from("club_swipe_votes")
            .select("option_id")
            .eq("session_id", trimmedSessionId)
            .eq("user_id", userId),
    ]);

    if (optionsResult.error) {
        throw optionsResult.error;
    }

    if (votesResult.error) {
        throw votesResult.error;
    }

    const votedOptionIds = new Set(
        (votesResult.data ?? []).map((vote) => vote.option_id)
    );

    const rows = (optionsResult.data ?? []) as unknown as SwipeOptionRow[];

    const availableRows = rows
        .filter((row) => row.club_book_options?.books)
        .filter((row) => !votedOptionIds.has(row.option_id));

    return Promise.all(
        availableRows.map(async (row) => {
            const option = row.club_book_options!;
            const book = option.books!;
            console.log("DESCRIPTION FETCH", {
                title: book.title,
                internalBookId: book.id,
                openLibraryWorkId: book.open_library_work_id,
            });
            let description = book.description_snippet ?? "";

            if (!description && book.open_library_work_id) {
                description = await fetchOpenLibraryDescriptionSnippet(
                    book.open_library_work_id
                );

                if (description) {
                    await saveBookDescriptionSnippet({
                        bookId: book.id,
                        descriptionSnippet: description,
                    });
                }
            }

            return {
                optionId: row.option_id,
                bookId: option.book_id,
                title: book.title,
                author: book.author,
                cover: book.cover_url ?? "",
                firstPublishYear: book.first_publish_year ?? null,
                description,
            };
        })
    );
}

export async function saveSwipeVote(input: {
    sessionId: string;
    optionId: string;
    vote: "like" | "skip";
}) {
    const sessionId = input.sessionId.trim();
    const optionId = input.optionId.trim();

    if (!sessionId || !optionId) {
        throw new Error("No swipe option found.");
    }

    const userId = await getCurrentSupabaseUserId();

    const { error } = await supabase.from("club_swipe_votes").insert({
        session_id: sessionId,
        option_id: optionId,
        user_id: userId,
        vote: input.vote,
    });

    if (error) {
        throw error;
    }
}

async function saveBookDescriptionSnippet(input: {
    bookId: string;
    descriptionSnippet: string;
}) {
    if (!input.descriptionSnippet.trim()) return;

    const { error } = await supabase
        .from("books")
        .update({
            description_snippet: input.descriptionSnippet,
        })
        .eq("id", input.bookId);

    if (error) {
        console.warn("Could not save description snippet:", error);
    }
}

export type SwipeResult = {
    optionId: string;
    bookId: string;
    title: string;
    author: string;
    cover: string;
    firstPublishYear: number | null;
    description: string;
    likes: number;
    skips: number;
    totalVotes: number;
};

type SwipeResultOptionRow = {
    option_id: string;
    club_book_options: {
        id: string;
        book_id: string;
        books: {
            id: string;
            title: string;
            author: string;
            cover_url: string | null;
            first_publish_year: number | null;
            description_snippet: string | null;
        } | null;
    } | null;
};

type SwipeVoteRow = {
    option_id: string;
    vote: "like" | "skip";
};

export async function fetchSwipeResults(sessionId: string): Promise<SwipeResult[]> {
    const trimmedSessionId = sessionId.trim();

    if (!trimmedSessionId) {
        throw new Error("No swipe session found.");
    }

    const [optionsResult, votesResult] = await Promise.all([
        supabase
            .from("club_swipe_session_options")
            .select(`
                option_id,
                club_book_options (
                    id,
                    book_id,
                    books (
                        id,
                        title,
                        author,
                        cover_url,
                        first_publish_year,
                        description_snippet
                    )
                )
            `)
            .eq("session_id", trimmedSessionId)
            .order("created_at", { ascending: true }),

        supabase
            .from("club_swipe_votes")
            .select("option_id, vote")
            .eq("session_id", trimmedSessionId),
    ]);

    if (optionsResult.error) {
        throw optionsResult.error;
    }

    if (votesResult.error) {
        throw votesResult.error;
    }

    const voteRows = (votesResult.data ?? []) as SwipeVoteRow[];

    const voteMap = new Map<string, { likes: number; skips: number }>();

    for (const vote of voteRows) {
        const current = voteMap.get(vote.option_id) ?? { likes: 0, skips: 0 };

        if (vote.vote === "like") {
            current.likes += 1;
        } else {
            current.skips += 1;
        }

        voteMap.set(vote.option_id, current);
    }

    const optionRows = (optionsResult.data ?? []) as unknown as SwipeResultOptionRow[];

    return optionRows
        .filter((row) => row.club_book_options?.books)
        .map((row) => {
            const option = row.club_book_options!;
            const book = option.books!;
            const votes = voteMap.get(row.option_id) ?? { likes: 0, skips: 0 };

            return {
                optionId: row.option_id,
                bookId: option.book_id,
                title: book.title,
                author: book.author,
                cover: book.cover_url ?? "",
                firstPublishYear: book.first_publish_year ?? null,
                description: book.description_snippet ?? "",
                likes: votes.likes,
                skips: votes.skips,
                totalVotes: votes.likes + votes.skips,
            };
        })
        .sort((a, b) => {
            if (b.likes !== a.likes) return b.likes - a.likes;
            return a.skips - b.skips;
        });
}
