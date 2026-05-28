import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import * as Progress from "react-native-progress";
import { SafeAreaView } from "react-native-safe-area-context";

import { BookCover } from "@/src/components/BookCover";
import { AvatarBubble } from "@/src/components/AvatarBubble";
import { StarRatingDisplay } from "@/src/components/StarRatingDisplay";
import {getProfileById, isAcceptedFriend, Profile} from "@/src/services/friendsService";
import {
    FriendReadingProfile,
    ReadingBook,
    getFriendReadingProfile,
} from "@/src/services/readingProfileService";
import { createPageStyles } from "@/src/styles/pageStyles";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import {ScreenTopBar} from "@/src/components/ScreenTopBar";
import {t} from "@/src/i18n";
import {supabase} from "@/src/services/supabase";

export default function FriendProfileScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();

    const theme = useAppTheme();
    const pageStyles = createPageStyles(theme);
    const styles = createStyles(theme);

    const [profile, setProfile] = useState<Profile | null>(null);
    const [readingProfile, setReadingProfile] =
        useState<FriendReadingProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [canViewProfile, setCanViewProfile] = useState(false);

    async function fetchFriendProfile() {
        if (!id) return;

        try {
            setLoading(true);

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                setCanViewProfile(false);
                return;
            }

            const allowed = await isAcceptedFriend(user.id, id);

            if (!allowed) {
                setCanViewProfile(false);
                return;
            }

            setCanViewProfile(true);

            const [profileData, readingData] = await Promise.all([
                getProfileById(id),
                getFriendReadingProfile(id),
            ]);

            setProfile(profileData);
            setReadingProfile(readingData);
        } catch (error) {
            console.log("Error fetching friend profile:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchFriendProfile();
    }, [id]);

    const friendName = profile?.display_name ?? t("friendProfile.unknownUser");
    const currentBooks = readingProfile?.currentBooks ?? [];
    const tbr = readingProfile?.tbr ?? [];
    const readBooks = readingProfile?.readBooks ?? [];

    return (
        <SafeAreaView style={pageStyles.safeArea} edges={["top"]}>
            <ScreenTopBar
                title={t("friendProfile.title")}
                right={
                    <Pressable
                        style={[
                            styles.refreshButton,
                            loading && styles.refreshButtonDisabled,
                        ]}
                        onPress={fetchFriendProfile}
                        disabled={loading}
                    >
                        <Feather
                            name="refresh-cw"
                            size={16}
                            color={loading ? theme.colors.textMuted : theme.colors.accent}
                        />
                    </Pressable>
                }
            />

            <ScrollView
                style={pageStyles.screen}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >

                <View style={styles.profileCard}>
                    {profile ? (
                        <AvatarBubble
                            avatarId={profile.avatar_id}
                            backgroundColor={profile.avatar_background_color}
                            name={friendName}
                            size={76}
                        />
                    ) : (
                        <View style={styles.profileIconPlaceholder}>
                            <Feather
                                name="user"
                                size={28}
                                color={theme.colors.textMuted}
                            />
                        </View>
                    )}

                    <Text style={styles.profileName}>{friendName}</Text>

                    <Text style={styles.profileSubtitle}>
                        {t("friendProfile.sharedReadingInfo")}
                    </Text>
                </View>

                {loading ? (
                    <View style={styles.emptyStateCard}>
                        <Text style={styles.emptyStateText}>
                            {t("friendProfile.loading")}
                        </Text>
                    </View>
                ) : !canViewProfile ? (
                    <View style={styles.emptyStateCard}>
                        <Feather
                            name="lock"
                            size={18}
                            color={theme.colors.textMuted}
                        />
                        <Text style={styles.emptyStateText}>
                            {t("friendProfile.privateProfile")}
                        </Text>
                    </View>
                ) : (
                    <>
                        <View>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>
                                    {t("friendProfile.currentlyReading")}
                                </Text>
                                <Text style={styles.sectionCount}>{currentBooks.length}</Text>
                            </View>

                            {currentBooks.length > 0 ? (
                                currentBooks.map((book) => (
                                    <BookListCard
                                        key={book.userBookId}
                                        book={book}
                                        showProgress
                                    />
                                ))
                            ) : (
                                <View style={styles.emptyStateCard}>
                                    <Feather
                                        name="coffee"
                                        size={18}
                                        color={theme.colors.textMuted}
                                    />
                                    <Text style={styles.emptyStateText}>
                                        {t("friendProfile.notReading")}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>
                                    {t("friendProfile.wantToRead")}
                                </Text>
                                <Text style={styles.sectionCount}>{tbr.length}</Text>
                            </View>

                            {tbr.length > 0 ? (
                                tbr.map((book) => (
                                    <BookListCard key={book.userBookId} book={book} />
                                ))
                            ) : (
                                <View style={styles.emptyStateCard}>
                                    <Feather
                                        name="bookmark"
                                        size={18}
                                        color={theme.colors.textMuted}
                                    />
                                    <Text style={styles.emptyStateText}>
                                        {t("friendProfile.noTbr")}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>
                                    {t("friendProfile.readBooks")}
                                </Text>
                                <Text style={styles.sectionCount}>{readBooks.length}</Text>
                            </View>

                            {readBooks.length > 0 ? (
                                readBooks.map((book) => (
                                    <BookListCard
                                        key={book.userBookId}
                                        book={book}
                                        showRating
                                    />
                                ))
                            ) : (
                                <View style={styles.emptyStateCard}>
                                    <Feather
                                        name="book-open"
                                        size={18}
                                        color={theme.colors.textMuted}
                                    />
                                    <Text style={styles.emptyStateText}>
                                        {t("friendProfile.noReadBooks")}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

function CurrentBookCard({ book }: { book: ReadingBook }) {
    const theme = useAppTheme();
    const styles = createStyles(theme);

    const progress = book.progress ?? 0;

    return (
        <View style={styles.currentBookRow}>
            <BookCover
                cover={book.coverUrl ?? undefined}
                title={book.title}
            />

            <View style={styles.bookTextContent}>
                <Text style={styles.bookTitle}>{book.title}</Text>

                {book.author ? (
                    <Text style={styles.bookAuthor}>{book.author}</Text>
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
    );
}

function BookListCard({
                          book,
                          showRating = false,
                          showProgress = false,
                      }: {
    book: ReadingBook;
    showRating?: boolean;
    showProgress?: boolean;
}) {
    const theme = useAppTheme();
    const styles = createStyles(theme);

    const progress = book.progress ?? 0;

    return (
        <View style={styles.listBookCard}>
            <View style={styles.listBookTopRow}>
                <BookCover
                    title={book.title}
                    cover={book.coverUrl ?? undefined}
                    small
                />

                <View style={styles.bookTextContent}>
                    <Text style={styles.bookTitle}>{book.title}</Text>

                    {book.author ? (
                        <Text style={styles.bookAuthor}>{book.author}</Text>
                    ) : null}

                    {showProgress ? (
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
                    ) : null}

                    {showRating && book.rating ? (
                        <View style={styles.ratingRow}>
                            <StarRatingDisplay value={book.rating} />
                        </View>
                    ) : null}
                </View>
            </View>

            {showRating && book.review?.trim() ? (
                <View style={styles.reviewNoteBox}>
                    <Feather
                        name="message-square"
                        size={14}
                        color={theme.colors.accent}
                    />

                    <Text style={styles.reviewNoteText} numberOfLines={3}>
                        {book.review.trim()}
                    </Text>
                </View>
            ) : null}
        </View>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        listBookCard: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.sm,
            gap: theme.spacing.md,
        },

        listBookTopRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.md,
        },

        reviewNoteBox: {
            flexDirection: "row",
            alignItems: "flex-start",
            gap: theme.spacing.xs,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.sm,
        },

        reviewNoteText: {
            flex: 1,
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
        },
        content: {
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.md,
            paddingBottom: 130,
            gap: theme.spacing.lg,
        },
        headerRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        backButton: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.border,
            alignItems: "center",
            justifyContent: "center",
        },
        headerTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.md,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        refreshButton: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.border,
            alignItems: "center",
            justifyContent: "center",
        },
        profileCard: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.lg,
            alignItems: "center",
            gap: theme.spacing.sm,
        },
        profileIconPlaceholder: {
            width: 76,
            height: 76,
            borderRadius: 38,
            backgroundColor: theme.colors.accentSoft,
            alignItems: "center",
            justifyContent: "center",
        },
        profileName: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.bold,
        },
        profileSubtitle: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
        },
        refreshButtonDisabled: {
            opacity: 0.6,
        },
        currentBookRow: {
            flexDirection: "row",
            gap: theme.spacing.md,
            alignItems: "center",
            marginBottom: theme.spacing.sm,
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
        sectionHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: theme.spacing.sm,
        },
        sectionTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        sectionCount: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        ratingRow: {
            marginTop: theme.spacing.xs,
        },
        emptyState: {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
        },
        emptyStateCard: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
        },
        emptyStateText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
        },
        ratingReviewSection: {
            marginTop: theme.spacing.xs,
            gap: theme.spacing.sm,
        },

        reviewBox: {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.sm,
            gap: 3,
        },

        reviewLabel: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
        },

        reviewText: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 19,
        },
    });
}