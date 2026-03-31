import { supabase } from './supabase';
import { getCurrentSupabaseUserId } from './supabaseUserBooks';

type ClubBook = {
    id: string;
    title: string;
    author: string;
    cover: string;
};

type ClubMeeting = {
    id: string;
    meetingDate: string;
    location: string | null;
};

export type ClubOverview = {
    id: string;
    name: string;
    memberCount: number;
    averageProgress: number;
    activeQuestionCount: number;
    currentBook: ClubBook | null;
    nextMeeting: ClubMeeting | null;
};

export async function fetchClubOverviewFromSupabase(): Promise<ClubOverview | null> {
    const userId = await getCurrentSupabaseUserId();

    const { data: membership, error: membershipError } = await supabase
        .from('book_club_members')
        .select('club_id')
        .eq('user_id', userId)
        .order('joined_at', { ascending: true })
        .limit(1)
        .maybeSingle();

    if (membershipError) {
        throw membershipError;
    }

    if (!membership) {
        return null;
    }

    const clubId = membership.club_id;

    const [clubResult, membersResult, meetingResult] = await Promise.all([
        supabase
            .from('book_clubs')
            .select('id, name, current_book_id')
            .eq('id', clubId)
            .maybeSingle(),
        supabase
            .from('book_club_members')
            .select('user_id')
            .eq('club_id', clubId),
        supabase
            .from('club_meetings')
            .select('id, meeting_date, location')
            .eq('club_id', clubId)
            .order('meeting_date', { ascending: true })
            .limit(1)
            .maybeSingle()
    ]);

    if (clubResult.error) {
        throw clubResult.error;
    }

    if (membersResult.error) {
        throw membersResult.error;
    }

    if (meetingResult.error) {
        throw meetingResult.error;
    }

    const club = clubResult.data;

    if (!club) {
        return null;
    }

    const memberIds = (membersResult.data ?? []).map((member) => member.user_id);
    const memberCount = memberIds.length;

    let currentBook: ClubBook | null = null;
    let averageProgress = 0;
    let activeQuestionCount = 0;

    if (club.current_book_id) {
        const [bookResult, questionCountResult, progressResult] = await Promise.all([
            supabase
                .from('books')
                .select('id, title, author, cover_url')
                .eq('id', club.current_book_id)
                .maybeSingle(),
            supabase
                .from('discussion_questions')
                .select('id', { count: 'exact', head: true })
                .eq('club_id', clubId)
                .eq('book_id', club.current_book_id),
            memberIds.length > 0
                ? supabase
                    .from('user_books')
                    .select('user_id, progress')
                    .eq('book_id', club.current_book_id)
                    .in('user_id', memberIds)
                : Promise.resolve({ data: [], error: null }),
        ]);

        if (bookResult.error) {
            throw bookResult.error;
        }

        if (questionCountResult.error) {
            throw questionCountResult.error;
        }

        if (progressResult.error) {
            throw progressResult.error;
        }

        if (bookResult.data) {
            currentBook = {
                id: bookResult.data.id,
                title: bookResult.data.title,
                author: bookResult.data.author,
                cover: bookResult.data.cover_url ?? '',
            };
        }

        activeQuestionCount = questionCountResult.count ?? 0;

        const progressRows = progressResult.data ?? [];
        if (progressRows.length > 0) {
            const totalProgress = progressRows.reduce(
                (sum, row) => sum + (row.progress ?? 0),
                0
            );
            averageProgress = Math.round(totalProgress / progressRows.length);
        }
    } else {
        const { count, error } = await supabase
            .from('discussion_questions')
            .select('id', { count: 'exact', head: true })
            .eq('club_id', clubId);

        if (error) {
            throw error;
        }

        activeQuestionCount = count ?? 0;
    }

    return {
        id: club.id,
        name: club.name,
        memberCount,
        averageProgress,
        activeQuestionCount,
        currentBook,
        nextMeeting: meetingResult.data
            ? {
                id: meetingResult.data.id,
                meetingDate: meetingResult.data.meeting_date,
                location: meetingResult.data.location,
            }
            : null,
    };
}

export async function createClubInSupabase(input: {
    name: string;
    description?: string;
}) {
    const userId = await getCurrentSupabaseUserId();

    const name = input.name.trim();
    const description = input.description?.trim() ?? "";

    if (!name) {
        throw new Error("Please enter a club name.");
    }

    const { data: club, error: clubError } = await supabase
        .from("book_clubs")
        .insert({
            name,
            description: description || null,
            created_by: userId,
        })
        .select("id, name")
        .single();

    if (clubError) {
        throw clubError;
    }

    const { error: memberError } = await supabase
        .from("book_club_members")
        .insert({
            club_id: club.id,
            user_id: userId,
            role: "owner",
        });

    if (memberError) {
        await supabase.from("book_clubs").delete().eq("id", club.id);
        throw memberError;
    }

    return club;
}
export async function createMeetingInSupabase(input: {
    clubId: string;
    title?: string;
    date: string;
    time: string;
    location?: string;
    notes?: string;
}) {
    const userId = await getCurrentSupabaseUserId();

    const clubId = input.clubId.trim();
    const title = input.title?.trim() || null;
    const date = input.date.trim();
    const time = input.time.trim();
    const location = input.location?.trim() || null;
    const notes = input.notes?.trim() || null;

    if (!clubId) {
        throw new Error("No club found.");
    }

    if (!date) {
        throw new Error("Please enter a date.");
    }

    if (!time) {
        throw new Error("Please enter a time.");
    }

    const meetingDate = new Date(`${date}T${time}:00`);

    if (Number.isNaN(meetingDate.getTime())) {
        throw new Error("Please enter a valid date and time.");
    }
    const { error: deleteError } = await supabase
        .from("club_meetings")
        .delete()
        .eq("club_id", clubId);

    if (deleteError) {
        throw deleteError;
    }
    const { data, error } = await supabase
        .from("club_meetings")
        .insert({
            club_id: clubId,
            title,
            meeting_date: meetingDate.toISOString(),
            location,
            notes,
            created_by: userId,
        })
        .select("id")
        .single();

    if (error) {
        throw error;
    }

    return data;
}
export async function updateCurrentBookInSupabase(input: {
    clubId: string;
    bookId: string;
}) {
    const clubId = input.clubId.trim();
    const bookId = input.bookId.trim();

    if (!clubId) {
        throw new Error("No club found.");
    }

    if (!bookId) {
        throw new Error("No book selected.");
    }

    const { error: updateClubError } = await supabase
        .from("book_clubs")
        .update({
            current_book_id: bookId,
        })
        .eq("id", clubId);

    if (updateClubError) {
        throw updateClubError;
    }

    const { data: members, error: membersError } = await supabase
        .from("book_club_members")
        .select("user_id")
        .eq("club_id", clubId);

    if (membersError) {
        throw membersError;
    }

    const userIds = (members ?? []).map((member) => member.user_id).filter(Boolean);

    if (userIds.length === 0) {
        return;
    }

    const rows = userIds.map((userId) => ({
        user_id: userId,
        book_id: bookId,
        status: "toRead",
        progress: 0,
        progress_mode: "percentage",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    }));

    const { error: userBooksError } = await supabase
        .from("user_books")
        .upsert(rows, {
            onConflict: "user_id,book_id",
            ignoreDuplicates: true,
        });

    if (userBooksError) {
        throw userBooksError;
    }
}

export type ClubBookOption = {
    id: string;
    title: string;
    author: string;
    cover: string;
};

export async function fetchSelectableBooksForClub(): Promise<ClubBookOption[]> {
    const userId = await getCurrentSupabaseUserId();

    const { data, error } = await supabase
        .from("user_books")
        .select(`
      book_id,
      books (
        id,
        title,
        author,
        cover_url
      )
    `)
        .eq("user_id", userId);

    if (error) {
        throw error;
    }

    const mapped = (data ?? [])
        .map((row: any) => row.books)
        .filter(Boolean)
        .map((book: any) => ({
            id: book.id,
            title: book.title,
            author: book.author,
            cover: book.cover_url ?? "",
        }));

    const uniqueBooks = mapped.filter(
        (book, index, self) => self.findIndex((item) => item.id === book.id) === index
    );

    return uniqueBooks;
}