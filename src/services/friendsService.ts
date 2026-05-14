import { supabase } from "./supabase";

export type Profile = {
    id: string;
    display_name: string | null;
    avatar_id: string | null;
    avatar_background_color: string | null;
};

export type Friend = Profile & {
    friendshipId: string;
};

type FriendshipRow = {
    id: string;
    requester_id: string;
    receiver_id: string;
    requester: Profile;
    receiver: Profile;
};

export type PendingFriendRequest = {
    id: string;
    requester_id: string;
    requester: Profile;
};

type PendingFriendRequestRow = {
    id: string;
    requester_id: string;
    requester: Profile | Profile[];
};

export async function getAcceptedFriends(userId: string): Promise<Friend[]> {
    const { data, error } = await supabase
        .from("friendships")
        .select(`
            id,
            requester_id,
            receiver_id,
            requester:profiles!friendships_requester_id_fkey (
                id,
                display_name,
                avatar_id,
                avatar_background_color
            ),
            receiver:profiles!friendships_receiver_id_fkey (
                id,
                display_name,
                avatar_id,
                avatar_background_color
            )
        `)
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq("status", "accepted");

    if (error) {
        throw error;
    }

    return (
        data?.map((friendship) => {
            const row = friendship as unknown as FriendshipRow;

            const friend =
                row.requester_id === userId
                    ? row.receiver
                    : row.requester;

            return {
                ...friend,
                friendshipId: row.id,
            };
        }) ?? []
    );
}

export async function getProfileById(profileId: string): Promise<Profile | null> {
    const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_id, avatar_background_color")
        .eq("id", profileId)
        .single();

    if (error) {
        throw error;
    }

    return data;
}

export async function getPendingFriendRequests(
    userId: string
): Promise<PendingFriendRequest[]> {
    const { data, error } = await supabase
        .from("friendships")
        .select(`
            id,
            requester_id,
            requester:profiles!friendships_requester_id_fkey (
                id,
                display_name,
                avatar_id,
                avatar_background_color
            )
        `)
        .eq("receiver_id", userId)
        .eq("status", "pending");

    if (error) {
        throw error;
    }

    return (
        data?.map((request) => {
            const row = request as unknown as PendingFriendRequestRow;

            return {
                id: row.id,
                requester_id: row.requester_id,
                requester: Array.isArray(row.requester)
                    ? row.requester[0]
                    : row.requester,
            };
        }) ?? []
    );
}

export async function sendFriendRequest(requesterId: string, receiverId: string) {
    const { data, error } = await supabase
        .from("friendships")
        .insert({
            requester_id: requesterId,
            receiver_id: receiverId,
            status: "pending",
        })
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}

export async function acceptFriendRequest(friendshipId: string) {
    const { data, error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", friendshipId)
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}

export async function rejectFriendRequest(friendshipId: string) {
    const { data, error } = await supabase
        .from("friendships")
        .update({ status: "rejected" })
        .eq("id", friendshipId)
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}

export async function removeFriend(friendshipId: string) {
    const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);

    if (error) {
        throw error;
    }
}

export async function searchProfiles(
    query: string,
    currentUserId: string
): Promise<Profile[]> {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
        return [];
    }

    const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_id, avatar_background_color")
        .neq("id", currentUserId)
        .ilike("display_name", `%${trimmedQuery}%`)
        .limit(10);

    if (error) {
        throw error;
    }

    return data ?? [];
}

export async function isAcceptedFriend(
    currentUserId: string,
    profileId: string
): Promise<boolean> {
    const { data, error } = await supabase
        .from("friendships")
        .select("id")
        .or(
            `and(requester_id.eq.${currentUserId},receiver_id.eq.${profileId}),and(requester_id.eq.${profileId},receiver_id.eq.${currentUserId})`
        )
        .eq("status", "accepted")
        .maybeSingle();

    if (error) {
        throw error;
    }

    return !!data;
}