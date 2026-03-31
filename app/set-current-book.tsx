import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
    Alert,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BookCover } from "@/src/components/BookCover";
import { searchBooks } from "@/src/services/booksApi";
import { upsertBookFromSearchResult } from "@/src/services/supabaseBooks";
import { updateCurrentBookInSupabase } from "@/src/services/supabaseClub";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import { SearchBookResult } from "@/src/types/book";

export default function SetCurrentBookScreen() {
    const theme = useAppTheme();
    const styles = createStyles(theme);
    const params = useLocalSearchParams();

    const clubId = useMemo(() => {
        const value = params.clubId;
        return Array.isArray(value) ? value[0] : value;
    }, [params.clubId]);

    const [searchQuery, setSearchQuery] = useState("");
    const [books, setBooks] = useState<SearchBookResult[]>([]);
    const [selectedBook, setSelectedBook] = useState<SearchBookResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errorText, setErrorText] = useState("");
    const [hasSearched, setHasSearched] = useState(false);

    async function handleSearch() {
        const trimmedQuery = searchQuery.trim();

        if (!trimmedQuery) {
            setBooks([]);
            setSelectedBook(null);
            setErrorText("");
            setHasSearched(false);
            return;
        }

        try {
            setIsLoading(true);
            setErrorText("");
            setHasSearched(true);
            setSelectedBook(null);

            const results = await searchBooks(trimmedQuery);
            setBooks(results);
        } catch (error) {
            console.error("Error searching books:", error);
            setBooks([]);
            setErrorText("Something went wrong while searching.");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleSave() {
        try {
            if (!selectedBook) {
                Alert.alert("Select a book", "Please choose a book first.");
                return;
            }

            setIsSaving(true);

            const savedBook = await upsertBookFromSearchResult(selectedBook);

            await updateCurrentBookInSupabase({
                clubId: clubId ?? "",
                bookId: savedBook.id,
            });

            router.replace("/club");
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Something went wrong while setting the current book.";
            Alert.alert("Set current book error", message);
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <View style={styles.screen}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backText}>Back</Text>
                </Pressable>

                <View style={styles.header}>
                    <Text style={styles.title}>Set current book</Text>
                    <Text style={styles.subtitle}>
                        Search for a book and choose it as your current club book.
                    </Text>
                </View>

                <View style={styles.searchRow}>
                    <View style={styles.searchBar}>
                        <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Search for a book"
                            placeholderTextColor={theme.colors.textMuted}
                            style={styles.searchInput}
                            returnKeyType="search"
                            onSubmitEditing={handleSearch}
                        />
                    </View>

                    <Pressable
                        style={[styles.searchButton, isLoading && styles.searchButtonDisabled]}
                        onPress={handleSearch}
                        disabled={isLoading}
                    >
                        <Feather name="search" size={18} color="#FFFFFF" />
                    </Pressable>
                </View>

                {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

                {isLoading ? (
                    <View style={styles.stateWrapper}>
                        <Text style={styles.stateText}>Searching books...</Text>
                    </View>
                ) : !hasSearched ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>Search for a book</Text>
                        <Text style={styles.emptyText}>
                            Find a book from the API and set it as the current club book.
                        </Text>
                    </View>
                ) : books.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>No results</Text>
                        <Text style={styles.emptyText}>Try another title or author.</Text>
                    </View>
                ) : (
                    <>
                        <FlatList
                            data={books}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.listContent}
                            renderItem={({ item }) => {
                                const isSelected = selectedBook?.id === item.id;

                                return (
                                    <Pressable
                                        style={[styles.bookCard, isSelected && styles.bookCardSelected]}
                                        onPress={() => setSelectedBook(item)}
                                    >
                                        <BookCover title={item.title} cover={item.cover} small />

                                        <View style={styles.bookInfo}>
                                            <Text style={styles.bookTitle}>{item.title}</Text>
                                            <Text style={styles.bookAuthor}>{item.author}</Text>

                                            {item.firstPublishYear ? (
                                                <Text style={styles.bookMeta}>{item.firstPublishYear}</Text>
                                            ) : null}
                                        </View>

                                        <View style={[styles.radio, isSelected && styles.radioSelected]}>
                                            {isSelected ? (
                                                <Feather name="check" size={16} color="#FFFFFF" />
                                            ) : null}
                                        </View>
                                    </Pressable>
                                );
                            }}
                        />

                        <Pressable
                            style={[styles.primaryButton, isSaving && styles.primaryButtonDisabled]}
                            onPress={handleSave}
                            disabled={isSaving}
                        >
                            <Text style={styles.primaryButtonText}>
                                {isSaving ? "Saving..." : "Set current book"}
                            </Text>
                        </Pressable>
                    </>
                )}
            </View>
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
            padding: theme.spacing.lg,
        },
        backButton: {
            alignSelf: "flex-start",
            paddingVertical: theme.spacing.sm,
            marginBottom: theme.spacing.md,
        },
        backText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
        },
        header: {
            marginBottom: theme.spacing.lg,
            gap: theme.spacing.sm,
        },
        title: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.xxl,
            fontWeight: theme.typography.fontWeight.bold,
        },
        subtitle: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: theme.typography.lineHeight.sm,
        },
        searchRow: {
            flexDirection: "row",
            gap: theme.spacing.sm,
            alignItems: "center",
            marginBottom: theme.spacing.lg,
        },
        searchBar: {
            flex: 1,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 14,
            paddingVertical: 12,
        },
        searchInput: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
        },
        searchButton: {
            width: 48,
            height: 48,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.accent,
            alignItems: "center",
            justifyContent: "center",
        },
        searchButtonDisabled: {
            opacity: 0.7,
        },
        errorText: {
            color: "#C65A46",
            fontSize: theme.typography.fontSize.sm,
            marginBottom: theme.spacing.md,
        },
        stateWrapper: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
        },
        stateText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
        },
        emptyCard: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            gap: theme.spacing.md,
        },
        emptyTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        emptyText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
        },
        listContent: {
            gap: theme.spacing.md,
            paddingBottom: theme.spacing.lg,
        },
        bookCard: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.md,
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
        },
        bookCardSelected: {
            borderColor: theme.colors.accent,
            backgroundColor: theme.colors.surface,
        },
        bookInfo: {
            flex: 1,
            gap: 4,
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
        bookMeta: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
        },
        radio: {
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.colors.border,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.background,
        },
        radioSelected: {
            backgroundColor: theme.colors.accent,
            borderColor: theme.colors.accent,
        },
        primaryButton: {
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.pill,
            paddingVertical: 14,
            alignItems: "center",
            marginTop: theme.spacing.md,
        },
        primaryButtonDisabled: {
            opacity: 0.7,
        },
        primaryButtonText: {
            color: "#FFFFFF",
            fontWeight: theme.typography.fontWeight.semibold,
            fontSize: theme.typography.fontSize.sm,
        },
    });
}