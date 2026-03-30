import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/src/components/AppHeader";
import { CoverPlaceholder } from "@/src/components/CoverPlaceholder";
import { t } from "@/src/i18n";
import { searchBooks } from "@/src/services/booksApi";
import {
    addBookToUserLibrary,
    getCurrentUserId,
    upsertBookFromSearchResult,
} from "@/src/services/supabaseBooks";
import {
    fetchStoredBookIdsFromSupabase,
    removeUserBookFromSupabase,
} from "@/src/services/supabaseUserBooks";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import { SearchBookResult } from "@/src/types/book";

export default function AddBookScreen() {
    const theme = useAppTheme();
    const styles = createStyles(theme);

    const [searchQuery, setSearchQuery] = useState("");
    const [results, setResults] = useState<SearchBookResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [errorText, setErrorText] = useState("");
    const [storedBookIds, setStoredBookIds] = useState<string[]>([]);

    async function loadStoredBookIds() {
        try {
            const ids = await fetchStoredBookIdsFromSupabase();
            setStoredBookIds(ids);
        } catch (error) {
            console.error("Fout bij ophalen van opgeslagen boek ids:", error);
            setStoredBookIds([]);
        }
    }

    useEffect(() => {
        loadStoredBookIds();
    }, []);

    useEffect(() => {
        const trimmedQuery = searchQuery.trim();

        if (!trimmedQuery) {
            setResults([]);
            setErrorText("");
            setIsSearching(false);
            return;
        }

        const timeout = setTimeout(async () => {
            try {
                setIsSearching(true);
                setErrorText("");

                const foundBooks = await searchBooks(trimmedQuery);
                setResults(foundBooks);
            } catch (error) {
                console.error(error);
                setErrorText(t("addBook.error"));
                setResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 500);

        return () => clearTimeout(timeout);
    }, [searchQuery]);

    async function handleToggleBook(result: SearchBookResult) {
        try {
            const isAlreadyStored = storedBookIds.includes(result.id);

            if (isAlreadyStored) {
                await removeUserBookFromSupabase(result.id);
                setStoredBookIds((current) => current.filter((id) => id !== result.id));
                return;
            }

            const userId = await getCurrentUserId();
            const savedBook = await upsertBookFromSearchResult(result);
            await addBookToUserLibrary(savedBook.id, userId);

            setStoredBookIds((current) =>
                current.includes(result.id) ? current : [...current, result.id]
            );
        } catch (error) {
            console.error("Fout bij toevoegen of verwijderen van boek:", error);
        }
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <AppHeader />

            <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
                <View style={styles.pageHeader}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <Feather name="chevron-left" size={22} color={theme.colors.accent} />
                    </Pressable>

                    <Text style={styles.pageTitle}>{t("books.addBook")}</Text>
                </View>

                <Text style={styles.subtitle}>{t("addBook.subtitle")}</Text>

                <View style={styles.searchRow}>
                    <View style={styles.searchBar}>
                        <Feather name="search" size={18} color={theme.colors.textMuted} />
                        <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder={t("addBook.searchPlaceholder")}
                            placeholderTextColor={theme.colors.textMuted}
                            style={styles.searchInput}
                            returnKeyType="search"
                        />
                    </View>
                </View>

                {isSearching ? (
                    <Text style={styles.stateText}>{t("addBook.searching")}</Text>
                ) : null}

                {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

                {results.length > 0 ? (
                    <>
                        <Text style={styles.resultsTitle}>{t("addBook.resultsTitle")}</Text>

                        <View style={styles.resultsList}>
                            {results.map((book) => {
                                const isAdded = storedBookIds.includes(book.id);

                                return (
                                    <View key={book.id} style={styles.resultCard}>
                                        {book.cover ? (
                                            <Image source={{ uri: book.cover }} style={styles.coverImage} />
                                        ) : (
                                            <CoverPlaceholder title={book.title} />
                                        )}

                                        <View style={styles.resultInfo}>
                                            <Text style={styles.bookTitle}>{book.title}</Text>
                                            <Text style={styles.bookAuthor}>{book.author}</Text>

                                            {book.firstPublishYear ? (
                                                <Text style={styles.bookMeta}>
                                                    {book.firstPublishYear}
                                                </Text>
                                            ) : null}

                                            <Pressable
                                                style={[
                                                    styles.addButton,
                                                    isAdded && styles.addButtonAdded,
                                                ]}
                                                onPress={() => handleToggleBook(book)}
                                            >
                                                <Text
                                                    style={[
                                                        styles.addButtonText,
                                                        isAdded && styles.addButtonTextAdded,
                                                    ]}
                                                >
                                                    {isAdded ? t("addBook.added") : t("addBook.add")}
                                                </Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </>
                ) : null}

                {!isSearching &&
                searchQuery.trim() !== "" &&
                results.length === 0 &&
                !errorText ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyTitle}>{t("addBook.noResults")}</Text>
                    </View>
                ) : null}

                {searchQuery.trim() === "" && results.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyTitle}>{t("addBook.emptyTitle")}</Text>
                        <Text style={styles.emptyText}>{t("addBook.emptyText")}</Text>
                    </View>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        screen: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        content: {
            padding: theme.spacing.lg,
            paddingTop: theme.spacing.lg,
        },
        pageHeader: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            marginBottom: theme.spacing.md,
        },
        backButton: {
            width: 32,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
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
        searchRow: {
            marginBottom: theme.spacing.md,
        },
        searchBar: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 14,
            paddingVertical: 12,
        },
        searchInput: {
            flex: 1,
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
        },
        stateText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            marginBottom: theme.spacing.md,
        },
        errorText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.sm,
            marginBottom: theme.spacing.md,
        },
        resultsTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
            marginBottom: theme.spacing.sm,
        },
        resultsList: {
            gap: theme.spacing.md,
        },
        resultCard: {
            flexDirection: "row",
            gap: theme.spacing.md,
            alignItems: "center",
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md,
            padding: theme.spacing.md,
        },
        coverImage: {
            width: 70,
            height: 100,
            borderRadius: 12,
            backgroundColor: theme.colors.accentSoft,
        },
        resultInfo: {
            flex: 1,
        },
        bookTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
            marginBottom: 2,
        },
        bookAuthor: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            marginBottom: 4,
        },
        bookMeta: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            marginBottom: 10,
        },
        addButton: {
            alignSelf: "flex-start",
            backgroundColor: theme.colors.accentSoft,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 14,
            paddingVertical: 9,
        },
        addButtonAdded: {
            backgroundColor: theme.colors.successSoft,
        },
        addButtonText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        addButtonTextAdded: {
            color: theme.colors.success,
        },
        emptyState: {
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.lg,
            padding: theme.spacing.lg,
            marginTop: theme.spacing.lg,
        },
        emptyTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
            marginBottom: 6,
        },
        emptyText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
        },
    });
}