import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import {Image, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from "react-native";
import * as Progress from "react-native-progress";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProfileButton } from "@/src/components/ProfileButton";
import { createPageStyles } from "@/src/styles/pageStyles";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import {
    Friend,
    Profile,
    PendingFriendRequest,
    getAcceptedFriends,
    getPendingFriendRequests,
    searchProfiles,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
} from "@/src/services/friendsService";
import {useEffect, useState} from "react";
import {supabase} from "@/src/services/supabase";
import {AvatarBubble} from "@/src/components/AvatarBubble";
import {
    FriendReadingSummary,
    getFriendsReadingSummaries,
} from "@/src/services/readingProfileService";
import {BookCover} from "@/src/components/BookCover";
import {t} from "@/src/i18n";


function getInitials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();

    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export default function FriendsScreen() {
    const theme = useAppTheme();
    const pageStyles = createPageStyles(theme);
    const styles = createStyles(theme);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Profile[]>([]);
    const [searching, setSearching] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [sentRequestIds, setSentRequestIds] = useState<string[]>([]);
    const [pendingRequests, setPendingRequests] = useState<PendingFriendRequest[]>([]);
    const [readingSummaries, setReadingSummaries] = useState<
        Record<string, FriendReadingSummary>
    >({});

    async function fetchFriends() {
        try {
            setLoading(true);

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) return;

            setCurrentUserId(user.id);

            const acceptedFriends = await getAcceptedFriends(user.id);
            const requests = await getPendingFriendRequests(user.id);

            const summaries = await getFriendsReadingSummaries(
                acceptedFriends.map((friend) => friend.id)
            );

            setFriends(acceptedFriends);
            setPendingRequests(requests);
            setReadingSummaries(summaries);
        } catch (error) {
            console.log("Error fetching friends:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchFriends();
    }, []);

    async function handleSearch(text: string) {
        setSearchQuery(text);

        if (!currentUserId || text.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        try {
            setSearching(true);
            const results = await searchProfiles(text, currentUserId);
            setSearchResults(results);
        } catch (error) {
            console.log("Error searching profiles:", error);
        } finally {
            setSearching(false);
        }
    }

    async function handleSendFriendRequest(receiverId: string) {
        if (!currentUserId) return;

        Keyboard.dismiss();

        console.log("ADD BUTTON PRESSED");
        console.log("REQUESTER:", currentUserId);
        console.log("RECEIVER:", receiverId);

        try {
            await sendFriendRequest(currentUserId, receiverId);
            setSentRequestIds((previousIds) => [...previousIds, receiverId]);
        } catch (error) {
            console.log("Error sending friend request:", error);
        }
    }

    async function handleAcceptRequest(friendshipId: string) {
        try {
            await acceptFriendRequest(friendshipId);
            await fetchFriends();
        } catch (error) {
            console.log("Error accepting friend request:", error);
        }
    }

    async function handleRejectRequest(friendshipId: string) {
        try {
            await rejectFriendRequest(friendshipId);
            await fetchFriends();
        } catch (error) {
            console.log("Error rejecting friend request:", error);
        }
    }

    return (
        <SafeAreaView style={pageStyles.safeArea} edges={["top"]}>
            <ScrollView
                style={pageStyles.screen}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.topRow}>
                    <View style={styles.topText}>
                        <Text style={pageStyles.pageTitle}>{t("friends.title")}</Text>
                        <Text style={pageStyles.pageSubtitle}>
                            {t("friends.subtitle")}
                        </Text>
                    </View>

                    <ProfileButton />
                </View>

                <View style={pageStyles.sectionCard}>
                    <Text style={pageStyles.sectionLabel}>
                        {t("friends.addFriend")}
                    </Text>
                    <View style={styles.searchRow}>
                        <Feather name="search" size={18} color={theme.colors.textMuted} />

                        <TextInput
                            placeholder="Zoek op naam of gebruikersnaam"
                            placeholderTextColor={theme.colors.textMuted}
                            style={styles.searchInput}
                            value={searchQuery}
                            onChangeText={handleSearch}
                        />
                    </View>
                    {searching ? (
                        <Text style={styles.helperText}>{t("friends.searching")}</Text>
                    ) : searchResults.length > 0 ? (
                        <View style={styles.searchResults}>
                            {searchResults.map((profile) => {
                                const profileName =
                                    profile.display_name ?? "Onbekende gebruiker";
                                const requestSent = sentRequestIds.includes(profile.id);


                                return (
                                    <View key={profile.id} style={styles.searchResultRow}>
                                            <AvatarBubble
                                                avatarId={profile?.avatar_id}
                                                backgroundColor={profile?.avatar_background_color}
                                                name={profileName}
                                                size={42}
                                            />

                                        <View style={styles.searchResultInfo}>
                                            <Text style={styles.searchResultName}>{profileName}</Text>
                                        </View>


                                        <Pressable
                                            style={({ pressed }) => [
                                                styles.addIconButton,
                                                requestSent && styles.addIconButtonSent,
                                                pressed && !requestSent && styles.addIconButtonPressed,
                                            ]}
                                            onPress={() => handleSendFriendRequest(profile.id)}
                                            disabled={requestSent}
                                            hitSlop={10}
                                        >
                                            <Feather
                                                name={requestSent ? "check" : "plus"}
                                                size={18}
                                                color={requestSent ? theme.colors.textMuted : theme.colors.background}
                                            />
                                        </Pressable>
                                    </View>
                                );
                            })}
                        </View>
                    ) : searchQuery.trim().length >= 2 ? (
                        <Text style={styles.helperText}>{t("friends.noUsersFound")}</Text>
                    ) : null}
                </View>
                {pendingRequests.length > 0 ? (
                    <View style={pageStyles.sectionCard}>
                        <Text style={pageStyles.sectionLabel}>
                            {t("friends.requestsTitle")}
                        </Text>

                        {pendingRequests.map((request) => {
                            const requesterName =
                                request.requester.display_name ?? "Onbekende gebruiker";

                            return (
                                <View key={request.id} style={styles.requestRow}>
                                    <View style={styles.smallAvatarFallback}>
                                        <Text style={styles.smallAvatarFallbackText}>
                                            {getInitials(requesterName)}
                                        </Text>
                                    </View>

                                    <View style={styles.searchResultInfo}>
                                        <Text style={styles.searchResultName}>{requesterName}</Text>
                                        <Text style={styles.searchResultUsername}>
                                            {t("friends.wantsToAddYou")}
                                        </Text>
                                    </View>

                                    <Pressable
                                        style={styles.acceptButton}
                                        onPress={() => handleAcceptRequest(request.id)}
                                    >
                                        <Feather
                                            name="check"
                                            size={17}
                                            color={theme.colors.background}
                                        />
                                    </Pressable>

                                    <Pressable
                                        style={styles.rejectButton}
                                        onPress={() => handleRejectRequest(request.id)}
                                    >
                                        <Feather
                                            name="x"
                                            size={17}
                                            color={theme.colors.textMuted}
                                        />
                                    </Pressable>
                                </View>
                            );
                        })}
                    </View>
                ) : null}
                <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                        <Text style={styles.sectionTitle}>{t("friends.myFriends")}</Text>
                        {/*<Text style={styles.sectionCount}>{friends.length}</Text>*/}
                    </View>

                    <Pressable
                        style={[
                            styles.refreshButton,
                            loading && styles.refreshButtonDisabled,
                        ]}
                        onPress={fetchFriends}
                        disabled={loading}
                    >
                        <Feather
                            name="refresh-cw"
                            size={16}
                            color={loading ? theme.colors.textMuted : theme.colors.accent}
                        />
                    </Pressable>
                </View>

                {loading ? (
                    <View style={styles.emptyBookBlock}>
                        <Text style={styles.emptyBookText}>
                            {t("friends.loadingFriends")}
                        </Text>
                    </View>
                ) : friends.length === 0 ? (
                    <View style={styles.emptyBookBlock}>
                        <Feather name="users" size={17} color={theme.colors.accent} />
                        <Text style={styles.emptyBookText}>
                            {t("friends.noFriends")}
                        </Text>
                    </View>
                ) : (
                    friends.map((friend) => {
                        const friendName =
                            friend.display_name ?? "Onbekende gebruiker";
                        const summary = readingSummaries[friend.id];
                        const currentBook = summary?.currentBook ?? null;
                        const progress = currentBook?.progress ?? 0;

                        return (
                            <Pressable
                                key={friend.id}
                                style={styles.friendCard}
                                onPress={() =>
                                    router.push({
                                        pathname: "/friend/[id]",
                                        params: { id: friend.id },
                                    })
                                }
                            >
                                <View style={styles.friendTopRow}>
                                    <AvatarBubble
                                        avatarId={friend.avatar_id}
                                        backgroundColor={friend.avatar_background_color}
                                        name={friendName}
                                        size={44}
                                    />

                                    <View style={styles.friendInfo}>
                                        <Text style={styles.friendName}>{friendName}</Text>
                                        <Text style={styles.friendMeta}>
                                            {t("friends.viewReadingProfile")}
                                        </Text>
                                    </View>

                                    <Feather
                                        name="chevron-right"
                                        size={20}
                                        color={theme.colors.accent}
                                    />
                                </View>
                                {currentBook ? (
                                    <View style={styles.bookPreviewRow}>
                                        <BookCover
                                            title={currentBook.title}
                                            cover={currentBook.coverUrl ?? undefined}
                                            small
                                        />

                                        <View style={styles.bookTextContent}>
                                            <Text style={styles.bookTitle} numberOfLines={1}>
                                                {currentBook.title}
                                            </Text>

                                            {currentBook.author ? (
                                                <Text style={styles.bookAuthor} numberOfLines={1}>
                                                    {currentBook.author}
                                                </Text>
                                            ) : null}

                                            <View style={styles.progressRow}>
                                                <Progress.Bar
                                                    progress={progress / 100}
                                                    width={null}
                                                    height={7}
                                                    color={theme.colors.accent}
                                                    unfilledColor={theme.colors.accentSoft}
                                                    borderWidth={0}
                                                    style={styles.progressBar}
                                                />

                                                <Text style={styles.progressText}>{progress}%</Text>
                                            </View>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.emptyBookRow}>
                                        <Feather
                                            name="bookmark"
                                            size={17}
                                            color={theme.colors.accent}
                                        />
                                        <Text style={styles.emptyBookText}>
                                            {t("friends.booksOnTbr", { count: summary?.tbrCount ?? 0 })}
                                        </Text>
                                    </View>
                                )}
                            </Pressable>
                        );
                    })
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        content: {
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.md,
            paddingBottom: 130,
            gap: theme.spacing.lg,
        },
        topRow: {
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: theme.spacing.md,
        },
        addIconButtonPressed: {
            opacity: 0.75,
        },
        bookContentRow: {
            flexDirection: "row",
            gap: theme.spacing.md,
            alignItems: "center",
        },
        addIconButton: {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: theme.colors.accent,
            alignItems: "center",
            justifyContent: "center",
        },
        addIconButtonSent: {
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
        },
        refreshButtonDisabled: {
            opacity: 0.6,
        },
        bookCover: {
            width: 46,
            height: 68,
            borderRadius: theme.radius.sm,
            backgroundColor: theme.colors.surface,
        },
        bookCoverPlaceholder: {
            width: 46,
            height: 68,
            borderRadius: theme.radius.sm,
            backgroundColor: theme.colors.accentSoft,
            alignItems: "center",
            justifyContent: "center",
        },
        topText: {
            flex: 1,
        },
        searchRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.border,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: 10,
        },
        searchInput: {
            flex: 1,
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            padding: 0,
        },
        sectionHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        sectionTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        sectionTitleRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
        },
        refreshButton: {
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            alignItems: "center",
            justifyContent: "center",
        },
        sectionCount: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        friendCard: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            gap: theme.spacing.md,
        },
        friendTopRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
        },
        avatar: {
            width: 44,
            height: 44,
            borderRadius: 22,
        },
        avatarFallback: {
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: theme.colors.accentSoft,
            alignItems: "center",
            justifyContent: "center",
        },
        avatarFallbackText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        friendInfo: {
            flex: 1,
            gap: 2,
        },
        friendName: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.md,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        friendMeta: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
        },
        bookBlock: {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            gap: 3,
        },
        bookLabel: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
            textTransform: "uppercase",
            letterSpacing: 0.4,
        },
        bookPreviewRow: {
            flexDirection: "row",
            gap: theme.spacing.md,
            alignItems: "center",
            paddingTop: theme.spacing.xs,
        },

        bookTextContent: {
            flex: 1,
            gap: 2,
        },

        bookTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.md,
            fontWeight: theme.typography.fontWeight.semibold,
        },

        bookAuthor: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
        },

        progressRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            marginTop: theme.spacing.sm,
        },

        progressBar: {
            flex: 1,
        },

        progressText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
            minWidth: 34,
            textAlign: "right",
        },

        emptyBookRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            paddingTop: theme.spacing.xs,
        },

        emptyBookText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
        },

        emptyBookBlock: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
        },

        updatedText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
        },
        helperText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            marginTop: theme.spacing.sm,
        },
        searchResults: {
            gap: theme.spacing.sm,
            marginTop: theme.spacing.md,
        },
        searchResultRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.sm,
        },
        smallAvatar: {
            width: 36,
            height: 36,
            borderRadius: 18,
        },
        smallAvatarFallback: {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: theme.colors.accentSoft,
            alignItems: "center",
            justifyContent: "center",
        },
        smallAvatarFallbackText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        searchResultInfo: {
            flex: 1,
        },
        searchResultName: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        searchResultUsername: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
        },
        addButton: {
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.pill,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.xs,
        },
        addButtonText: {
            color: theme.colors.background,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        requestRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.sm,
            marginTop: theme.spacing.sm,
        },
        acceptButton: {
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: theme.colors.accent,
            alignItems: "center",
            justifyContent: "center",
        },
        rejectButton: {
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.border,
            alignItems: "center",
            justifyContent: "center",
        },
    });
}