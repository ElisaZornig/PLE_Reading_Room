import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import {ReactNode, useCallback, useEffect, useRef, useState} from "react";
import {
    Animated,
    Pressable,
    ScrollView,
    StyleProp,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from "react-native";
import * as Progress from "react-native-progress";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/src/components/AppHeader";
import { BookCover } from "@/src/components/BookCover";
import { t } from "@/src/i18n";
import {
    fetchClubOverviewFromSupabase,
    type ClubOverview,
} from "@/src/services/supabaseClub";
import {
    fetchCurrentUserDisplayName,
    fetchUserBooksFromSupabase,
} from "@/src/services/supabaseUserBooks";
import { createPageStyles } from "@/src/styles/pageStyles";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import { Book } from "@/src/types/book";
import {subscribeToRefresh} from "@/src/utils/refreshEvents";
import {ProfileButton} from "@/src/components/ProfileButton";

type PressableCardProps = {
    onPress: () => void;
    children: ReactNode;
    style?: StyleProp<ViewStyle>;
    disabled?: boolean;
};

function PressableCard({
                           onPress,
                           children,
                           style,
                           disabled = false,
                       }: PressableCardProps) {
    const scale = useRef(new Animated.Value(1)).current;

    function handlePressIn() {
        Animated.spring(scale, {
            toValue: 0.985,
            useNativeDriver: true,
        }).start();
    }

    function handlePressOut() {
        Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    }

    return (
        <Pressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled}
        >
            <Animated.View
                style={[
                    style,
                    {
                        transform: [{ scale }],
                    },
                ]}
            >
                {children}
            </Animated.View>
        </Pressable>
    );
}

export default function HomeScreen() {
    const [books, setBooks] = useState<Book[]>([]);
    const [club, setClub] = useState<ClubOverview | null>(null);
    const [displayName, setDisplayName] = useState("");

    const theme = useAppTheme();
    const pageStyles = createPageStyles(theme);
    const styles = createStyles(theme);

    const booksSortedByUpdated = [...books].sort((a, b) => {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bTime - aTime;
    });

    const currentBook = booksSortedByUpdated.find((book) => book.status === "reading");

    const listBooks = booksSortedByUpdated
        .filter((book) => book.id !== currentBook?.id)
        .slice(0, 4);

    function formatMeetingLabel(isoDate: string) {
        const date = new Date(isoDate);

        return new Intl.DateTimeFormat(undefined, {
            weekday: "long",
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date);
    }

    function getCurrentBookProgressText(book: Book) {
        const hasProgress = typeof book.progress === "number";
        const hasCurrentPage = typeof book.currentPage === "number";
        const hasTotalPages = typeof book.totalPages === "number";

        if (hasProgress && hasCurrentPage && hasTotalPages) {
            return `${book.progress}% • ${t("home.page")} ${book.currentPage} ${t(
                "home.pageOf"
            )} ${book.totalPages}`;
        }

        if (hasProgress) {
            return `${book.progress}%`;
        }

        if (hasCurrentPage && hasTotalPages) {
            return `${t("home.page")} ${book.currentPage} ${t("home.pageOf")} ${book.totalPages}`;
        }

        if (hasCurrentPage) {
            return `${t("home.page")} ${book.currentPage}`;
        }

        return t("home.noProgressYet");
    }

    async function loadHomeData() {
        try {
            const [supabaseBooks, clubData, currentUserName] = await Promise.all([
                fetchUserBooksFromSupabase(),
                fetchClubOverviewFromSupabase(),
                fetchCurrentUserDisplayName(),
            ]);

            setBooks(supabaseBooks);
            setClub(clubData);
            setDisplayName(currentUserName);
        } catch (error) {
            console.error("Error loading home data:", error);
            setBooks([]);
            setClub(null);
            setDisplayName("");
        }
    }

    useEffect(() => {
        void loadHomeData();

        const unsubscribe = subscribeToRefresh("home", () => {
            void loadHomeData();
        });

        return unsubscribe;
    }, [loadHomeData]);

    return (
        <SafeAreaView style={pageStyles.safeArea} edges={["top"]}>

            <ScrollView
                style={pageStyles.screen}
                contentContainerStyle={[
                    pageStyles.content,
                    styles.contentWithTabBar,
                ]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.topRow}>
                    <View style={styles.topText}>
                        <Text style={pageStyles.pageTitle}>
                            {t("home.welcome", {
                                name: displayName || t("home.fallbackName"),
                            })}
                        </Text>
                        <Text style={pageStyles.pageSubtitle}>{t("home.subtitle")}</Text>
                    </View>

                    <ProfileButton />
                </View>

                {currentBook ? (
                    <PressableCard onPress={() => router.push(`/book/${currentBook.id}`)} style={pageStyles.rowCard}>
                        <View style={styles.bookInfo}>
                            <Text style={pageStyles.sectionLabel}>{t("home.currentlyReading")}</Text>
                            <Text style={pageStyles.title}>{currentBook.title}</Text>
                            <Text style={styles.bookMeta}>{currentBook.author}</Text>
                            <Text style={styles.bookMeta}>
                                {getCurrentBookProgressText(currentBook)}
                            </Text>

                            <View style={styles.progressWrap}>
                                <Progress.Bar
                                    progress={(currentBook.progress ?? 0) / 100}
                                    width={null}
                                    borderColor={theme.colors.card}
                                    unfilledColor={theme.colors.border}
                                    color={theme.colors.accent}
                                />
                            </View>
                        </View>

                        <BookCover title={currentBook.title} cover={currentBook.cover} />
                    </PressableCard>
                ) : (
                    <PressableCard
                        onPress={() => router.push("/books")}
                        style={pageStyles.sectionCard}
                    >
                        <Text style={pageStyles.sectionLabel}>{t("home.currentlyReading")}</Text>
                        <Text style={pageStyles.title}>{t("home.noCurrentBookTitle")}</Text>
                        <Text style={pageStyles.emptyText}>{t("home.noCurrentBookText")}</Text>
                    </PressableCard>
                )}

                {club ? (
                    <PressableCard onPress={() => router.push("/club")} style={pageStyles.rowCard}>
                        <View style={styles.bookInfo}>
                            <Text style={pageStyles.sectionLabel}>{t("home.clubSection")}</Text>
                            <Text style={pageStyles.title}>{club.name}</Text>

                            {club.currentBook ? (
                                <>
                                    <Text style={styles.clubCurrentBookTitle}>
                                        {club.currentBook.title}
                                    </Text>
                                    <Text style={styles.clubCurrentBookAuthor}>
                                        {club.currentBook.author}
                                    </Text>
                                </>
                            ) : (
                                <Text style={styles.clubEmptyText}>{t("home.noCurrentClubBook")}</Text>
                            )}

                            <View style={styles.clubMetaGroup}>
                                <Text style={styles.clubMetaLine}>
                                    {club.nextMeeting
                                        ? `${t("home.nextMeeting")}: ${formatMeetingLabel(
                                            club.nextMeeting.meetingDate
                                        )}`
                                        : t("home.noMeetingPlanned")}
                                </Text>

                                <Text style={styles.clubMetaLine}>
                                    {club.memberCount}{" "}
                                    {club.memberCount === 1 ? t("home.member") : t("home.members")}
                                </Text>
                            </View>
                        </View>

                        {club.currentBook ? (
                            <BookCover
                                title={club.currentBook.title}
                                cover={club.currentBook.cover}
                            />
                        ) : (
                            <View style={styles.clubPlaceholderCover}>
                                <Feather name="users" size={24} color={theme.colors.accent} />
                            </View>
                        )}
                    </PressableCard>
                ) : (
                    <View style={pageStyles.sectionCard}>
                        <Text style={pageStyles.sectionLabel}>{t("home.clubSection")}</Text>
                        <Text style={pageStyles.title}>{t("home.noClubTitle")}</Text>
                        <Text style={pageStyles.emptyText}>{t("home.noClubText")}</Text>

                        <View style={styles.clubActionRow}>
                            <Pressable
                                style={[pageStyles.secondaryButton, styles.flexButton]}
                                onPress={() => router.push("/create-club")}
                            >
                                <Text style={pageStyles.secondaryButtonText}>
                                    {t("home.createClub")}
                                </Text>
                            </Pressable>

                            <Pressable
                                style={[pageStyles.secondaryButton, styles.flexButton]}
                                onPress={() => router.push("/join-club")}
                            >
                                <Text style={pageStyles.secondaryButtonText}>
                                    {t("home.joinClub")}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                )}

                <PressableCard onPress={() => router.push("/books")} style={pageStyles.sectionCard}>
                    <View style={styles.listHeader}>
                        <Text style={pageStyles.sectionLabel}>{t("home.booksOnList")}</Text>

                        <View style={styles.arrowButton}>
                            <Feather
                                name="chevron-right"
                                size={20}
                                color={theme.colors.accent}
                            />
                        </View>
                    </View>

                    {listBooks.length > 0 ? (
                        <View style={styles.listRow}>
                            {listBooks.map((book) => (
                                <BookCover
                                    key={book.id}
                                    title={book.title}
                                    cover={book.cover}
                                />
                            ))}
                        </View>
                    ) : (
                        <Text style={pageStyles.emptyText}>{t("home.noBooksOnListYet")}</Text>
                    )}
                </PressableCard>
            </ScrollView>
        </SafeAreaView>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        topRow: {
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: theme.spacing.md,
            marginBottom: theme.spacing.md,
        },
        contentWithTabBar: {
            paddingBottom: 120,
        },
        topText: {
            flex: 1,
        },
        bookInfo: {
            flex: 1,
        },
        bookMeta: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            marginBottom: 8,
        },
        progressWrap: {
            width: "100%",
            marginTop: theme.spacing.xs,
        },
        listHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
        },
        listRow: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: theme.spacing.sm,
            marginTop: theme.spacing.sm,
        },
        arrowButton: {
            width: 28,
            height: 28,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
        },
        clubActionRow: {
            flexDirection: "row",
            gap: theme.spacing.sm,
            marginTop: theme.spacing.md,
        },
        flexButton: {
            flex: 1,
        },
        clubPlaceholderCover: {
            width: 90,
            height: 135,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
            alignItems: "center",
            justifyContent: "center",
        },
        clubCurrentBookTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
            marginTop: 2,
        },

        clubCurrentBookAuthor: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            marginTop: 2,
        },

        clubEmptyText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            marginTop: 2,
        },

        clubMetaGroup: {
            marginTop: theme.spacing.sm,
            gap: 4,
        },

        clubMetaLine: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
            lineHeight: theme.typography.lineHeight.xs ?? 16,
        },
    });
}