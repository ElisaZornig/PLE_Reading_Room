import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import {useCallback, useEffect, useMemo, useState} from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Progress from "react-native-progress";
import { SafeAreaView } from "react-native-safe-area-context";
import LottieView from "lottie-react-native";

import { AppHeader } from "@/src/components/AppHeader";
import { BookCover } from "@/src/components/BookCover";
import { StarRatingDisplay } from "@/src/components/StarRatingDisplay";
import { t } from "@/src/i18n";
import { getStoredBooks, removeStoredBook } from "@/src/services/bookStorage";
import {
    fetchUserBooksFromSupabase,
    removeUserBookFromSupabase,
} from "@/src/services/supabaseUserBooks";
import { createPageStyles } from "@/src/styles/pageStyles";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import { Book } from "@/src/types/book";
import {getBookStatusColors, getBookStatusLabel} from "@/src/utils/bookStatus";
import { showAppAlert, showAppConfirm } from "@/src/utils/appAlert";
import {subscribeToRefresh} from "@/src/utils/refreshEvents";

export default function BooksScreen() {
    const theme = useAppTheme();
    const pageStyles = createPageStyles(theme);
    const styles = createStyles(theme);

    const [books, setBooks] = useState<Book[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<
        "all" | "reading" | "toRead" | "finished" | "dnf"
    >("all");

    const filters = [
        { key: "all", label: t("books.all") },
        { key: "reading", label: t("books.reading") },
        { key: "toRead", label: t("books.toRead") },
        { key: "finished", label: t("books.finished") },
        { key: "dnf", label: t("books.dnf") },
    ] as const;

    async function loadBooks() {
        try {
            const supabaseBooks = await fetchUserBooksFromSupabase();
            setBooks(supabaseBooks);
        } catch (error) {
            console.error("Supabase ophalen mislukt, fallback naar AsyncStorage:", error);
            const storedBooks = await getStoredBooks();
            setBooks(storedBooks);
        } finally {
            setIsLoading(false);
        }
    }

    async function deleteBookNow(bookId: string) {
        try {
            await removeUserBookFromSupabase(bookId);
            await removeStoredBook(bookId);
            await loadBooks();
        } catch (error) {
            console.error("Fout bij verwijderen van boek:", error);
            showAppAlert(t("books.deleteErrorTitle"), t("books.deleteError"));
        }
    }

    async function handleDeleteBook(bookId: string, bookTitle: string) {
        const confirmed = await showAppConfirm({
            title: t("deleteBook.title"),
            message: t("deleteBook.message", { title: bookTitle }),
            confirmText: t("deleteBook.confirm"),
            cancelText: t("deleteBook.cancel"),
        });

        if (!confirmed) return;

        await deleteBookNow(bookId);
    }

    useEffect(() => {
        void loadBooks();

        const unsubscribe = subscribeToRefresh("books", () => {
            void loadBooks();
        });

        return unsubscribe;
    }, [loadBooks]);

    const filteredBooks = useMemo(() => {
        const statusOrder = {
            reading: 0,
            finished: 1,
            toRead: 2,
            dnf: 3,
        };

        const filtered =
            activeFilter === "all"
                ? books
                : books.filter((book) => book.status === activeFilter);

        return [...filtered].sort(
            (a, b) => statusOrder[a.status] - statusOrder[b.status]
        );
    }, [books, activeFilter]);

    return (
        <SafeAreaView style={pageStyles.safeArea} edges={["top"]}>
            <AppHeader />

            <View style={pageStyles.screen}>
                <View style={styles.fixedHeaderContent}>
                    <View style={pageStyles.pageHeader}>
                        <Text style={pageStyles.pageTitle}>{t("books.title")}</Text>
                    </View>

                    <Text style={pageStyles.pageSubtitle}>{t("books.subtitle")}</Text>

                    <Pressable
                        style={styles.addButton}
                        onPress={() => router.push("/add-book")}
                    >
                        <Feather name="plus" size={18} color="#FFFFFF" />
                        <Text style={styles.addButtonText}>{t("books.addBook")}</Text>
                    </Pressable>

                    <View style={styles.filterRow}>
                        {filters.map((filter) => {
                            const isActive = activeFilter === filter.key;

                            return (
                                <Pressable
                                    key={filter.key}
                                    onPress={() => setActiveFilter(filter.key)}
                                    style={[
                                        styles.filterChip,
                                        isActive && styles.filterChipActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.filterText,
                                            isActive && styles.filterTextActive,
                                        ]}
                                    >
                                        {filter.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>

                {isLoading ? (
                    <View style={styles.stateWrapper}>
                        <LottieView
                            source={require("@/assets/animations/loading-book.json")}
                            autoPlay
                            loop
                            style={styles.loadingAnimation}
                        />
                    </View>
                ) : filteredBooks.length === 0 ? (
                    <View style={styles.stateWrapper}>
                        <Text style={pageStyles.emptyText}>{t("books.emptyState")}</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredBooks}
                        keyExtractor={(item) => item.id}
                        showsVerticalScrollIndicator={false}
                        style={styles.list}
                        contentContainerStyle={styles.bookListContent}
                        renderItem={({ item: book }) => {
                            const statusColors = getBookStatusColors(book.status, theme);

                            return (
                                <Pressable
                                    style={styles.bookCard}
                                    onPress={() =>
                                        router.push({
                                            pathname: "/book/[id]",
                                            params: { id: encodeURIComponent(book.id) },
                                        })
                                    }
                                >
                                    <BookCover title={book.title} cover={book.cover} />

                                    <View style={styles.bookInfo}>
                                        <Text style={pageStyles.title}>{book.title}</Text>
                                        <Text style={styles.bookAuthor}>{book.author}</Text>

                                        <View style={styles.metaRow}>
                                            <View
                                                style={[
                                                    styles.statusChip,
                                                    { backgroundColor: statusColors.backgroundColor },
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.statusChipText,
                                                        { color: statusColors.textColor },
                                                    ]}
                                                >
                                                    {getBookStatusLabel(book.status)}
                                                </Text>
                                            </View>
                                        </View>

                                        {book.status === "reading" && typeof book.progress === "number" ? (
                                            <View style={styles.progressSection}>
                                                <Text style={styles.bookMeta}>
                                                    {book.progress}% • {t("books.page")} {book.currentPage ?? 0}{" "}
                                                    {t("books.pageOf")} {book.totalPages ?? 0}
                                                </Text>

                                                <View style={styles.progressWrap}>
                                                    <Progress.Bar
                                                        progress={book.progress / 100}
                                                        width={null}
                                                        borderColor={theme.colors.card}
                                                        unfilledColor={theme.colors.border}
                                                        color={theme.colors.accent}
                                                    />
                                                </View>
                                            </View>
                                        ) : null}

                                        {book.status === "finished" && book.rating && book.rating > 0 ? (
                                            <StarRatingDisplay value={book.rating} />
                                        ) : null}
                                    </View>

                                    <Pressable
                                        style={styles.deleteButton}
                                        onPress={(event) => {
                                            event.stopPropagation();
                                            void handleDeleteBook(book.id, book.title);
                                        }}
                                    >
                                        <Feather
                                            name="trash-2"
                                            size={18}
                                            color={theme.colors.textMuted}
                                        />
                                    </Pressable>
                                </Pressable>
                            );
                        }}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        fixedHeaderContent: {
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.lg,
            paddingBottom: theme.spacing.md,
        },
        addButton: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: theme.spacing.sm,
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.pill,
            paddingVertical: 12,
            marginBottom: theme.spacing.md,
        },
        addButtonText: {
            color: "#FFFFFF",
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        filterRow: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: theme.spacing.sm,
        },
        filterChip: {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 12,
            paddingVertical: 7,
        },
        filterChipActive: {
            backgroundColor: theme.colors.accentSoft,
        },
        filterText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
        },
        filterTextActive: {
            color: theme.colors.accent,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        list: {
            flex: 1,
        },
        bookListContent: {
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.xl,
            gap: theme.spacing.md,
        },
        bookCard: {
            flexDirection: "row",
            gap: theme.spacing.md,
            alignItems: "flex-start",
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
        },
        bookInfo: {
            flex: 1,
        },
        bookAuthor: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            marginTop: 2,
        },
        metaRow: {
            flexDirection: "row",
            alignItems: "center",
            marginTop: 6,
            marginBottom: 8,
        },
        statusChip: {
            alignSelf: "flex-start",
            borderRadius: theme.radius.pill,
            paddingHorizontal: 10,
            paddingVertical: 6,
        },
        statusChipText: {
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.medium,
        },
        progressSection: {
            marginTop: 2,
            gap: 8,
        },
        progressWrap: {
            width: "100%",
        },
        bookMeta: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
        },
        deleteButton: {
            alignSelf: "flex-start",
            padding: 6,
            marginLeft: theme.spacing.xs,
        },
        stateWrapper: {
            flex: 1,
            paddingHorizontal: theme.spacing.lg,
            alignItems: "center",
            justifyContent: "center",
        },
        loadingAnimation: {
            width: 200,
            height: 200,
        },
    });
}