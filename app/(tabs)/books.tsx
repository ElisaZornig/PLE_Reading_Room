import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {Pressable, ScrollView, StyleSheet, Text, View, Image, Alert} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "@/src/components/AppHeader";
import { t } from "@/src/i18n";
import { getStoredBooks, removeStoredBook } from "@/src/services/bookStorage";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import { Book } from "@/src/types/book";
import * as Progress from 'react-native-progress';
import { router } from "expo-router";
import { getBookStatusLabel } from "@/src/utils/bookStatus";
import {StarRatingDisplay} from "@/src/components/StarRatingDisplay";
import {BookCover} from "@/src/components/BookCover";
import {supabase} from "@/src/services/supabase";
import {
    fetchUserBooksFromSupabase,
    removeUserBookFromSupabase,
} from "@/src/services/supabaseUserBooks";



export default function BooksScreen() {
    const theme = useAppTheme();
    const styles = createStyles(theme);

    const [books, setBooks] = useState<Book[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<
        "all" | "reading" | "toRead" | "finished" | "dnf"
    >("all");

    const filters = [
        { key: "all", label: t("books.all") },
        { key: "reading", label: t("books.reading") },
        { key: "toRead", label: "TBR" },
        { key: "finished", label: t("books.finished") },
        { key: "dnf", label: "DNF" },
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
    function handleDeleteBook(bookId: string, bookTitle: string) {
        Alert.alert(
            t("deleteBook.title"),
            t("deleteBook.message", { title: bookTitle }),
            [
                {
                    text: t("deleteBook.cancel"),
                    style: "cancel",
                },
                {
                    text: t("deleteBook.confirm"),
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await removeUserBookFromSupabase(bookId);
                            await removeStoredBook(bookId);
                            await loadBooks();
                        } catch (error) {
                            console.error("Fout bij verwijderen van boek:", error);
                        }
                    },
                },
            ]
        );
    }

    useFocusEffect(
        useCallback(() => {
            loadBooks();
        }, [])
    );

    const filteredBooks = useMemo(() => {
        const statusOrder = {
            reading: 0,
            toRead: 2,
            finished: 1,
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
    useEffect(() => {
        async function testSupabase() {
            const { data, error } = await supabase.from("books").select("*").limit(5);
            console.log("SUPABASE DATA:", data);
            console.log("SUPABASE ERROR:", error);
        }

        testSupabase();
    }, []);

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

                <View style={styles.pageHeader}>
                    <Text style={styles.pageTitle}>{t("books.title")}</Text>
                </View>

                <Text style={styles.subtitle}>{t("books.subtitle")}</Text>
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

                {isLoading ? (
                    <Text style={styles.stateText}>Boeken laden...</Text>
                ) : filteredBooks.length === 0 ? (
                    <Text style={styles.stateText}>Geen boeken in deze categorie.</Text>
                ) : (
                    <View style={styles.bookList}>
                        {filteredBooks.map((book) => (
                            <Pressable
                                key={book.id}
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
                                    <Text style={styles.bookTitle}>{book.title}</Text>
                                    <Text style={styles.bookAuthor}>{book.author}</Text>

                                    <View style={styles.metaRow}>
                                        <View style={styles.statusChip}>
                                            <Text style={styles.statusChipText}>
                                                {getBookStatusLabel(book.status)}
                                            </Text>
                                        </View>
                                    </View>

                                    {book.status === "reading" && book.progress !== undefined ? (
                                        <View style={styles.progressSection}>
                                            <Text style={styles.bookMeta}>
                                                {book.progress}% • Pagina {book.currentPage ?? 0} van {book.totalPages ?? 0}
                                            </Text>

                                            <Progress.Bar
                                                progress={book.progress / 100}
                                                width={170}
                                                borderColor={theme.colors.surface}
                                                unfilledColor={theme.colors.border}
                                                color={theme.colors.accent}
                                            />
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
                                        handleDeleteBook(book.id, book.title);
                                    }}
                                >
                                    <Feather name="trash-2" size={18} color={theme.colors.textMuted} />
                                </Pressable>
                            </Pressable>
                        ))}
                    </View>
                )}
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
        },
        content: {
            padding: theme.spacing.lg,
        },
        pageHeader: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: theme.spacing.md,
        },
        pageTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        subtitle: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            marginBottom: theme.spacing.md,
        },
        filterRow: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: theme.spacing.sm,
            marginBottom: theme.spacing.lg,
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
        stateText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            marginTop: theme.spacing.md,
        },
        bookList: {
            gap: theme.spacing.md,
        },
        bookCard: {
            flexDirection: "row",
            gap: theme.spacing.md,
            alignItems: "flex-start",
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
        },
        bookInfo: {
            flex: 1,
        },
        bookTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        bookAuthor: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            marginTop: 2,
        },
        bookStatus: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.xs,
            marginBottom: 4,
        },
        bookMeta: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            marginBottom: theme.spacing.sm,
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
            color: '#FFFFFF',
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        coverImage: {
            width: 70,
            height: 100,
            borderRadius: 12,
            backgroundColor: theme.colors.accentSoft,
        },
        metaRow: {
            flexDirection: "row",
            alignItems: "center",
            marginTop: 4,
            marginBottom: 8,
        },
        statusChip: {
            alignSelf: "flex-start",
            backgroundColor: theme.colors.accentSoft,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 10,
            paddingVertical: 6,
        },
        statusChipText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.medium,
        },
        progressSection: {
            marginTop: 2,
            gap: 8,
        },
        deleteButton: {
            alignSelf: "flex-start",
            padding: 6,
            marginLeft: theme.spacing.xs,
        },
    });
}