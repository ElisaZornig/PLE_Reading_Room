import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Progress from "react-native-progress";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/src/components/AppHeader";
import { BookCover } from "@/src/components/BookCover";
import { t } from "@/src/i18n";
import {
    fetchClubOverviewFromSupabase,
    type ClubOverview,
} from "@/src/services/supabaseClub";
import {fetchCurrentUserDisplayName, fetchUserBooksFromSupabase} from "@/src/services/supabaseUserBooks";
import { Book } from "@/src/types/book";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";


export default function HomeScreen() {
    const [books, setBooks] = useState<Book[]>([]);
    const theme = useAppTheme();
    const styles = createStyles(theme);
    const [club, setClub] = useState<ClubOverview | null>(null);
    const [displayName, setDisplayName] = useState("");

    const booksSortedByUpdated = [...books].sort((a, b) => {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bTime - aTime;
    });

    const currentBook = booksSortedByUpdated.find(
        (book) => book.status === "reading"
    );

    const listBooks = booksSortedByUpdated
        .filter((book) => book.id !== currentBook?.id)
        .slice(0, 4);

    const listCardScale = useRef(new Animated.Value(1)).current;

    const animateIn = () => {
        Animated.spring(listCardScale, {
            toValue: 0.97,
            useNativeDriver: true,
        }).start();
    };

    function formatMeetingLabel(isoDate: string) {
        const date = new Date(isoDate);

        return new Intl.DateTimeFormat("en-GB", {
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
            return `${book.progress}% • ${t("home.page")} ${book.currentPage} ${t("home.pageOf")} ${book.totalPages}`;
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

    const animateOut = () => {
        Animated.spring(listCardScale, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    };
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

    useFocusEffect(
        useCallback(() => {
            loadHomeData();
        }, [])
    );
    return (
        <SafeAreaView
            style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
            edges={["top"]}
        >
            <AppHeader />

            <ScrollView
                style={styles.screen}
                contentContainerStyle={styles.content}
            >

                <Text style={styles.title}>
                    {t("home.welcome", {
                        name: displayName || t("home.fallbackName"),
                    })}
                </Text>
                    <Text style={styles.subtitle}>{t("home.subtitle")}</Text>

                {currentBook ? (
                    <Pressable onPress={() => router.push("/books")}>
                        <View style={styles.bookRow}>
                            <View style={styles.bookInfo}>
                                <Text style={styles.label}>{t("home.currentlyReading")}</Text>
                                <Text style={styles.bookTitle}>{currentBook.title}</Text>
                                <Text style={styles.bookMeta}>{currentBook.author}</Text>
                                <Text style={styles.bookMeta}>
                                    {getCurrentBookProgressText(currentBook)}
                                </Text>
                                <Progress.Bar
                                    progress={(currentBook.progress ?? 0) / 100}
                                    width={230}
                                    borderColor={theme.colors.surface}
                                    unfilledColor={theme.colors.border}
                                    color={theme.colors.accent}
                                />
                            </View>

                            <BookCover title={currentBook.title} cover={currentBook.cover} />
                        </View>
                    </Pressable>
                ) : (
                    <Pressable onPress={() => router.push("/books")}>
                        <View style={styles.emptyCard}>
                            <Text style={styles.label}>{t("home.currentlyReading")}</Text>
                            <Text style={styles.bookTitle}>{t("home.noCurrentBookTitle")}</Text>
                            <Text style={styles.bookMeta}>{t("home.noCurrentBookText")}</Text>
                        </View>
                    </Pressable>
                )}
                {club ? (
                    <Pressable onPress={() => router.push("/club")}>
                        <View style={styles.bookRow}>
                            <View style={styles.bookInfo}>
                                <Text style={styles.label}>{t("home.clubSection")}</Text>
                                <Text style={styles.bookTitle}>{club.name}</Text>

                                {club.currentBook ? (
                                    <>
                                        <Text style={styles.bookMeta}>{club.currentBook.title}</Text>
                                        <Text style={styles.bookMeta}>{club.currentBook.author}</Text>
                                    </>
                                ) : (
                                    <Text style={styles.bookMeta}>{t("home.noCurrentClubBook")}</Text>
                                )}

                                <Text style={styles.bookMeta}>
                                    {club.nextMeeting
                                        ? `${t("home.nextMeeting")}: ${formatMeetingLabel(club.nextMeeting.meetingDate)}`
                                        : t("home.noMeetingPlanned")}
                                </Text>

                                <Text style={styles.bookMeta}>
                                    {club.memberCount}{" "}
                                    {club.memberCount === 1 ? t("home.member") : t("home.members")}
                                </Text>
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
                        </View>
                    </Pressable>
                ) : (
                    <View style={styles.emptyCard}>
                        <Text style={styles.label}>{t("home.clubSection")}</Text>
                        <Text style={styles.bookTitle}>{t("home.noClubTitle")}</Text>
                        <Text style={styles.bookMeta}>{t("home.noClubText")}</Text>

                        <View style={styles.clubActionRow}>
                            <Pressable
                                style={styles.secondaryButton}
                                onPress={() => router.push("/create-club")}
                            >
                                <Text style={styles.secondaryButtonText}>
                                    {t("home.createClub")}
                                </Text>
                            </Pressable>

                            <Pressable
                                style={styles.secondaryButton}
                                onPress={() => router.push("/join-club")}
                            >
                                <Text style={styles.secondaryButtonText}>
                                    {t("home.joinClub")}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                )}
                <Pressable
                    onPress={() => router.push("/books")}
                    onPressIn={animateIn}
                    onPressOut={animateOut}
                >
                    <Animated.View
                        style={[
                            styles.listCard,
                            {
                                transform: [{ scale: listCardScale }],
                            },
                        ]}
                    >
                        <View style={styles.listHeader}>
                            <Text style={styles.label}>{t("home.booksOnList")}</Text>

                            <View style={styles.arrowButton}>
                                <Feather
                                    name="chevron-right"
                                    size={theme.spacing.xl}
                                    color={theme.colors.accent}
                                />
                            </View>
                        </View>

                        <View style={styles.listRow}>
                            {listBooks.map((book) => (
                                <BookCover
                                    key={book.id}
                                    title={book.title}
                                    cover={book.cover}
                                />
                            ))}
                        </View>
                    </Animated.View>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        safeArea: {
            flex: 1,
        },
        screen: {
            flex: 1,
            backgroundColor: theme.colors.background,
            display: "flex",
        },
        content: {
            padding: theme.spacing.lg,
        },
        topBar: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: theme.colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            marginHorizontal: -theme.spacing.lg,
            marginTop: -theme.spacing.lg,
            marginBottom: theme.spacing.lg,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: 14,
        },
        brandRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
        },
        logoBox: {
            width: 42,
            height: 42,
            borderRadius: 10,
            backgroundColor: theme.colors.accent,
            alignItems: "center",
            justifyContent: "center",
        },
        brand: {
            color: theme.colors.text,
            fontSize: 18,
            fontWeight: "500",
        },
        profileButton: {
            width: 40,
            height: 40,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: theme.colors.text,
            alignItems: "center",
            justifyContent: "center",
        },
        card: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.lg,
        },
        title: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.bold,
            marginBottom: 4,
        },
        subtitle: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            marginBottom: theme.spacing.lg,
        },
        bookRow: {
            flexDirection: "row",
            gap: theme.spacing.md,
            alignItems: "center",
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.md,
        },
        bookInfo: {
            flex: 1,
        },
        label: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.md,
            marginBottom: 4,
        },
        bookTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
            marginBottom: 4,
        },
        bookMeta: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            marginBottom: 8,
        },
        smallButton: {
            marginTop: theme.spacing.sm,
            alignSelf: "flex-start",
            backgroundColor: theme.colors.accentSoft,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 12,
            paddingVertical: 8,
        },
        smallButtonText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        avatarText: {
            color: theme.colors.accent,
            fontSize: 11,
            fontWeight: "700",
        },
        avatarMore: {
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: theme.colors.accent,
            alignItems: "center",
            justifyContent: "center",
            marginLeft: 6,
        },
        avatarMoreText: {
            color: "#FFFFFF",
            fontSize: 11,
            fontWeight: "700",
        },
        avatarRow: {
            flexDirection: "row",
            alignItems: "center",
            marginTop: theme.spacing.xs,
        },
        avatar: {
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: theme.colors.accentSoft,
            borderWidth: 1,
            borderColor: theme.colors.border,
            alignItems: "center",
            justifyContent: "center",
            marginRight: -6,
        },
        listCard: {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
        },
        listRow: {
            flexDirection: "row",
            gap: theme.spacing.sm,
            marginTop: theme.spacing.sm,
        },
        listHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
        },
        arrowButton: {
            width: 28,
            height: 28,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
        },
        emptyClubCard: {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            gap: theme.spacing.sm,
            marginBottom: theme.spacing.md,
        },

        clubActionRow: {
            flexDirection: "row",
            gap: theme.spacing.sm,
            marginTop: theme.spacing.sm,
        },

        secondaryButton: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.border,
            paddingVertical: 10,
            paddingHorizontal: 14,
            alignItems: "center",
            justifyContent: "center",
        },

        secondaryButtonText: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
        },
        clubPlaceholderCover: {
            width: 90,
            height: 135,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.card,
            alignItems: "center",
            justifyContent: "center",
        },
        emptyCard: {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.md,
        },


    });

}