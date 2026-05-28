import { supabase } from "@/src/services/supabase";
import { getCurrentSupabaseUserId } from "@/src/services/supabaseUserBooks";

export type MeetingPollAvailability = "available" | "maybe" | "unavailable";
export type MeetingPollStatus = "open" | "confirmed" | "cancelled";
export type MeetingPollConfirmationMode = "ownerOnly" | "everyone";

export type MeetingPollDateVote = {
    id: string;
    userId: string;
    availability: MeetingPollAvailability;
};

export type MeetingPollDateOption = {
    id: string;
    date: string;
    time: string | null;
    createdBy: string;
    votes: MeetingPollDateVote[];
    availableCount: number;
    maybeCount: number;
    unavailableCount: number;
    currentUserVote: MeetingPollAvailability | null;
};

export type MeetingPollLocationVote = {
    id: string;
    userId: string;
};

export type MeetingPollLocationOption = {
    id: string;
    label: string;
    createdBy: string;
    votes: MeetingPollLocationVote[];
    voteCount: number;
    currentUserVoted: boolean;
};

export type MeetingPoll = {
    id: string;
    clubId: string;
    title: string | null;
    notes: string | null;
    status: MeetingPollStatus;
    confirmationMode: MeetingPollConfirmationMode;
    createdBy: string;
    createdAt: string;
    dateOptions: MeetingPollDateOption[];
    locationOptions: MeetingPollLocationOption[];
};

type MeetingPollRow = {
    id: string;
    club_id: string;
    title: string | null;
    notes: string | null;
    status: MeetingPollStatus;
    confirmation_mode: MeetingPollConfirmationMode;
    created_by: string;
    created_at: string;
    date_options?: {
        id: string;
        option_date: string;
        option_time: string | null;
        created_by: string;
        date_votes?: {
            id: string;
            user_id: string;
            availability: MeetingPollAvailability;
        }[];
    }[];
    location_options?: {
        id: string;
        label: string;
        created_by: string;
        location_votes?: {
            id: string;
            user_id: string;
        }[];
    }[];
};

function normalizeTimeInput(value?: string | null) {
    const trimmed = value?.trim() ?? "";

    if (!trimmed) {
        return null;
    }

    const match = trimmed.match(/^(\d{1,2}):(\d{2})/);

    if (!match) {
        throw new Error("Please enter a valid time.");
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        throw new Error("Please enter a valid time.");
    }

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function normalizeDbTime(value: string | null) {
    return value ? value.slice(0, 5) : null;
}

function normalizeLocationLabel(value: string) {
    return value.trim().replace(/\s+/g, " ").toLowerCase();
}



function mapMeetingPoll(row: MeetingPollRow, currentUserId: string): MeetingPoll {
    const dateOptions = (row.date_options ?? []).map((option) => {
        const votes = option.date_votes ?? [];

        return {
            id: option.id,
            date: option.option_date,
            time: option.option_time ? option.option_time.slice(0, 5) : null,
            createdBy: option.created_by,
            votes: votes.map((vote) => ({
                id: vote.id,
                userId: vote.user_id,
                availability: vote.availability,
            })),
            availableCount: votes.filter((vote) => vote.availability === "available").length,
            maybeCount: votes.filter((vote) => vote.availability === "maybe").length,
            unavailableCount: votes.filter((vote) => vote.availability === "unavailable").length,
            currentUserVote:
                votes.find((vote) => vote.user_id === currentUserId)?.availability ?? null,
        };
    });

    const locationOptions = (row.location_options ?? []).map((option) => {
        const votes = option.location_votes ?? [];

        return {
            id: option.id,
            label: option.label,
            createdBy: option.created_by,
            votes: votes.map((vote) => ({
                id: vote.id,
                userId: vote.user_id,
            })),
            voteCount: votes.length,
            currentUserVoted: votes.some((vote) => vote.user_id === currentUserId),
        };
    });

    return {
        id: row.id,
        clubId: row.club_id,
        title: row.title,
        notes: row.notes,
        status: row.status,
        confirmationMode: row.confirmation_mode,
        createdBy: row.created_by,
        createdAt: row.created_at,
        dateOptions: dateOptions.sort((a, b) => {
            const aValue = `${a.date}T${a.time ?? "00:00"}`;
            const bValue = `${b.date}T${b.time ?? "00:00"}`;

            return aValue.localeCompare(bValue);
        }),
        locationOptions: locationOptions.sort((a, b) => b.voteCount - a.voteCount),
    };
}

export async function fetchActiveMeetingPoll(clubId: string): Promise<MeetingPoll | null> {
    const currentUserId = await getCurrentSupabaseUserId();
    const trimmedClubId = clubId.trim();

    if (!trimmedClubId) {
        throw new Error("No club found.");
    }

    const { data, error } = await supabase
        .from("club_meeting_polls")
        .select(`
            id,
            club_id,
            title,
            notes,
            status,
            confirmation_mode,
            created_by,
            created_at,
            date_options:club_meeting_poll_date_options (
                id,
                option_date,
                option_time,
                created_by,
                date_votes:club_meeting_poll_date_votes (
                    id,
                    user_id,
                    availability
                )
            ),
            location_options:club_meeting_poll_location_options (
                id,
                label,
                created_by,
                location_votes:club_meeting_poll_location_votes (
                    id,
                    user_id
                )
            )
        `)
        .eq("club_id", trimmedClubId)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!data) {
        return null;
    }

    return mapMeetingPoll(data as unknown as MeetingPollRow, currentUserId);
}

export async function createMeetingPoll(input: {
    clubId: string;
    title?: string;
    notes?: string;
}): Promise<{ id: string }> {
    const userId = await getCurrentSupabaseUserId();
    const clubId = input.clubId.trim();

    if (!clubId) {
        throw new Error("No club found.");
    }

    const existingPoll = await fetchActiveMeetingPoll(clubId);

    if (existingPoll) {
        return { id: existingPoll.id };
    }

    const { data, error } = await supabase
        .from("club_meeting_polls")
        .insert({
            club_id: clubId,
            title: input.title?.trim() || null,
            notes: input.notes?.trim() || null,
            created_by: userId,
            status: "open",
            confirmation_mode: "ownerOnly",
        })
        .select("id")
        .single();

    if (error) {
        throw error;
    }

    return data;
}

export async function addMeetingPollDateOption(input: {
    pollId: string;
    date: string;
    time?: string | null;
}) {
    const userId = await getCurrentSupabaseUserId();
    const pollId = input.pollId.trim();
    const date = input.date.trim();
    const time = normalizeTimeInput(input.time);

    if (!pollId) {
        throw new Error("No poll found.");
    }

    if (!date) {
        throw new Error("Please choose a date.");
    }

    const parsedDate = new Date(`${date}T12:00:00`);

    if (Number.isNaN(parsedDate.getTime())) {
        throw new Error("Please choose a valid date.");
    }

    const { data: existingOptions, error: existingError } = await supabase
        .from("club_meeting_poll_date_options")
        .select("id, option_time")
        .eq("poll_id", pollId)
        .eq("option_date", date);

    if (existingError) {
        throw existingError;
    }

    const existingOption = (existingOptions ?? []).find(
        (option) => normalizeDbTime(option.option_time) === time
    );

    if (existingOption) {
        return { id: existingOption.id };
    }

    const { data, error } = await supabase
        .from("club_meeting_poll_date_options")
        .insert({
            poll_id: pollId,
            option_date: date,
            option_time: time,
            created_by: userId,
        })
        .select("id")
        .single();

    if (error) {
        throw error;
    }

    return data;
}

export async function voteForMeetingPollLocation(input: {
    locationOptionId: string;
}) {
    const userId = await getCurrentSupabaseUserId();
    const locationOptionId = input.locationOptionId.trim();

    if (!locationOptionId) {
        throw new Error("No location option found.");
    }

    const { data: existingVote, error: existingError } = await supabase
        .from("club_meeting_poll_location_votes")
        .select("id")
        .eq("location_option_id", locationOptionId)
        .eq("user_id", userId)
        .maybeSingle();

    if (existingError) {
        throw existingError;
    }

    if (existingVote) {
        return existingVote;
    }

    const { data, error } = await supabase
        .from("club_meeting_poll_location_votes")
        .insert({
            location_option_id: locationOptionId,
            user_id: userId,
        })
        .select("id")
        .single();

    if (error) {
        throw error;
    }

    return data;
}

export async function addMeetingPollLocationOption(input: {
    pollId: string;
    label: string;
}) {
    const userId = await getCurrentSupabaseUserId();
    const pollId = input.pollId.trim();
    const label = input.label.trim();

    if (!pollId) {
        throw new Error("No poll found.");
    }

    if (!label) {
        throw new Error("Please enter a location.");
    }

    const normalizedLabel = normalizeLocationLabel(label);

    const { data: existingOptions, error: existingError } = await supabase
        .from("club_meeting_poll_location_options")
        .select("id, label")
        .eq("poll_id", pollId);

    if (existingError) {
        throw existingError;
    }

    const existingOption = (existingOptions ?? []).find(
        (option) => normalizeLocationLabel(option.label) === normalizedLabel
    );

    if (existingOption) {
        return { id: existingOption.id };
    }

    const { data, error } = await supabase
        .from("club_meeting_poll_location_options")
        .insert({
            poll_id: pollId,
            label,
            created_by: userId,
        })
        .select("id")
        .single();

    if (error) {
        throw error;
    }

    return data;
}

async function getCurrentUserClubRole(clubId: string) {
    const userId = await getCurrentSupabaseUserId();

    const { data, error } = await supabase
        .from("book_club_members")
        .select("role")
        .eq("club_id", clubId)
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data?.role ?? null;
}

export async function confirmMeetingPoll(input: {
    pollId: string;
    dateOptionId: string;
    locationOptionId?: string | null;
    notes?: string;
}) {
    const pollId = input.pollId.trim();
    const dateOptionId = input.dateOptionId.trim();
    const locationOptionId = input.locationOptionId?.trim() || null;

    if (!pollId) {
        throw new Error("No poll found.");
    }

    if (!dateOptionId) {
        throw new Error("Choose a date before confirming the meeting.");
    }

    const { data: poll, error: pollError } = await supabase
        .from("club_meeting_polls")
        .select("id, club_id, title, notes, confirmation_mode")
        .eq("id", pollId)
        .maybeSingle();

    if (pollError) {
        throw pollError;
    }

    if (!poll) {
        throw new Error("No poll found.");
    }

    const role = await getCurrentUserClubRole(poll.club_id);

    if (poll.confirmation_mode === "ownerOnly" && role !== "owner") {
        throw new Error("Only the club owner can confirm this meeting.");
    }

    const { data: dateOption, error: dateOptionError } = await supabase
        .from("club_meeting_poll_date_options")
        .select("id, option_date, option_time")
        .eq("id", dateOptionId)
        .maybeSingle();

    if (dateOptionError) {
        throw dateOptionError;
    }

    if (!dateOption) {
        throw new Error("Date option not found.");
    }

    let location: string | null = null;

    if (locationOptionId) {
        const { data: locationOption, error: locationError } = await supabase
            .from("club_meeting_poll_location_options")
            .select("label")
            .eq("id", locationOptionId)
            .maybeSingle();

        if (locationError) {
            throw locationError;
        }

        location = locationOption?.label ?? null;
    }

    const time = dateOption.option_time ?? "12:00";
    const meetingDate = new Date(`${dateOption.option_date}T${time}:00`);

    if (Number.isNaN(meetingDate.getTime())) {
        throw new Error("Meeting date is invalid.");
    }

    const notes =
        input.notes?.trim() ||
        poll.notes ||
        (dateOption.option_time ? null : "Tijd volgt nog.");

    const { error: deleteError } = await supabase
        .from("club_meetings")
        .delete()
        .eq("club_id", poll.club_id);

    if (deleteError) {
        throw deleteError;
    }

    const { data: meeting, error: meetingError } = await supabase
        .from("club_meetings")
        .insert({
            club_id: poll.club_id,
            title: poll.title,
            meeting_date: meetingDate.toISOString(),
            location,
            notes,
        })
        .select("id")
        .single();

    if (meetingError) {
        throw meetingError;
    }

    const { error: updatePollError } = await supabase
        .from("club_meeting_polls")
        .update({
            status: "confirmed",
            confirmed_meeting_id: meeting.id,
        })
        .eq("id", poll.id);

    if (updatePollError) {
        throw updatePollError;
    }

    return meeting;
}

export async function voteForMeetingPollDate(input: {
    dateOptionId: string;
    availability: MeetingPollAvailability;
}) {
    const userId = await getCurrentSupabaseUserId();
    const dateOptionId = input.dateOptionId.trim();

    if (!dateOptionId) {
        throw new Error("No date option found.");
    }

    const { data, error } = await supabase
        .from("club_meeting_poll_date_votes")
        .upsert(
            {
                date_option_id: dateOptionId,
                user_id: userId,
                availability: input.availability,
            },
            {
                onConflict: "date_option_id,user_id",
            }
        )
        .select("id")
        .single();

    if (error) {
        throw error;
    }

    return data;
}

export async function deleteMeetingPollDateOption(input: {
    dateOptionId: string;
}) {
    const dateOptionId = input.dateOptionId.trim();

    if (!dateOptionId) {
        throw new Error("No date option found.");
    }

    const { error } = await supabase
        .from("club_meeting_poll_date_options")
        .delete()
        .eq("id", dateOptionId);

    if (error) {
        throw error;
    }
}

export async function toggleMeetingPollLocationVote(input: {
    locationOptionId: string;
}) {
    const userId = await getCurrentSupabaseUserId();
    const locationOptionId = input.locationOptionId.trim();

    if (!locationOptionId) {
        throw new Error("No location option found.");
    }

    const { data: existingVote, error: existingError } = await supabase
        .from("club_meeting_poll_location_votes")
        .select("id")
        .eq("location_option_id", locationOptionId)
        .eq("user_id", userId)
        .maybeSingle();

    if (existingError) {
        throw existingError;
    }

    if (existingVote) {
        const { error: deleteError } = await supabase
            .from("club_meeting_poll_location_votes")
            .delete()
            .eq("id", existingVote.id);

        if (deleteError) {
            throw deleteError;
        }

        return { action: "removed" as const };
    }

    const { data, error } = await supabase
        .from("club_meeting_poll_location_votes")
        .insert({
            location_option_id: locationOptionId,
            user_id: userId,
        })
        .select("id")
        .single();

    if (error) {
        throw error;
    }

    return { action: "added" as const, id: data.id };
}