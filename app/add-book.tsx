import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LottieView from "lottie-react-native";

import { AppHeader } from "@/src/components/AppHeader";
import { BookCover } from "@/src/components/BookCover";
import { CoverPlaceholder } from "@/src/components/CoverPlaceholder";
import { t } from "@/src/i18n";
import { searchBooks } from "@/src/services/booksApi";
import {
    addBookToUserLibrary,
    getCurrentUserId,
    upsertBookFromSearchResult,
} from "@/src/services/supabaseBooks";
import {
    fetchStoredBookMapFromSupabase,
    removeUserBookFromSupabase,
} from "@/src/services/supabaseUserBooks";
import { createPageStyles } from "@/src/styles/pageStyles";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import { SearchBookResult } from "@/src/types/book";
import { showAppAlert } from "@/src/utils/appAlert";
import { getOpenLibraryWorkId } from "@/src/utils/openLibrary";
import {triggerRefresh} from "@/src/utils/refreshEvents";
import {ScreenTopBar} from "@/src/components/ScreenTopBar";

export default function AddBookScreen() {
    const theme = useAppTheme();
    const pageStyles = createPageStyles(theme);
    const styles = createStyles(theme);

    const [searchQuery, setSearchQuery] = useState("");
    const [results, setResults] = useState<SearchBookResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isAddingBookId, setIsAddingBookId] = useState<string | null>(null);
    const [errorText, setErrorText] = useState("");
    const [hasSearched, setHasSearched] = useState(false);
    const [storedBookMap, setStoredBookMap] = useState<Record<string, string>>({});

    const trimmedQuery = useMemo(() => searchQuery.trim(), [searchQuery]);

    async function loadStoredBookIds() {
        try {
            const bookMap = await fetchStoredBookMapFromSupabase();
            setStoredBookMap(bookMap);
        } catch (error) {
            console.error("Fout bij ophalen van opgeslagen boeken:", error);
            setStoredBookMap({});
        }
    }

    useEffect(() => {
        void loadStoredBookIds();
    }, []);

    async function handleSearch() {
        if (!trimmedQuery) {
            setResults([]);
            setErrorText("");
            setHasSearched(false);
            return;
        }

        try {
            setIsSearching(true);
            setErrorText("");
            setHasSearched(true);

            const foundBooks = await searchBooks(trimmedQuery);
            setResults(foundBooks);
        } catch (error) {
            console.error(error);
            setErrorText(t("addBook.error"));
            setResults([]);
        } finally {
            setIsSearching(false);
        }
    }

    async function handleToggleBook(result: SearchBookResult) {
        try {
            setIsAddingBookId(result.id);

            const workId = getOpenLibraryWorkId(result.id);
            const storedBookId = storedBookMap[workId];
            const isAlreadyStored = Boolean(storedBookId);

            if (isAlreadyStored) {
                await removeUserBookFromSupabase(storedBookId);

                setStoredBookMap((current) => {
                    const next = { ...current };
                    delete next[workId];
                    return next;
                });

                return;
            }

            const userId = await getCurrentUserId();
            const savedBook = await upsertBookFromSearchResult({
                ...result,
                id: workId,
            });

            await addBookToUserLibrary(savedBook.id, userId);
            triggerRefresh("books", "home");
            setStoredBookMap((current) => ({
                ...current,
                [workId]: savedBook.id,
            }));
        } catch (error) {
            console.error("Fout bij toevoegen of verwijderen van boek:", error);
            showAppAlert(t("addBook.errorTitle"), t("addBook.toggleError"));
        } finally {
            setIsAddingBookId(null);
        }
    }

    const screenContent = (
        <View style={pageStyles.screen}>
            <View style={styles.fixedHeaderContent}>
                <View style={styles.searchRow}>
                    <View style={styles.searchBar}>
                        <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder={t("addBook.searchPlaceholder")}
                            placeholderTextColor={theme.colors.textMuted}
                            style={styles.searchInput}
                            returnKeyType="search"
                            onSubmitEditing={() => void handleSearch()}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    <Pressable
                        style={[
                            styles.searchButton,
                            isSearching && styles.searchButtonDisabled,
                        ]}
                        onPress={() => void handleSearch()}
                        disabled={isSearching}
                    >
                        <Feather name="search" size={18} color="#FFFFFF" />
                    </Pressable>
                </View>
            </View>

            <ScrollView
                style={pageStyles.screen}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

                {isSearching ? (
                    <View style={styles.inlineLoadingState}>
                        <LottieView
                            source={require("@/assets/animations/loading-book.json")}
                            autoPlay
                            loop
                            style={styles.searchLoader}
                        />
                        <Text style={pageStyles.emptyText}>{t("addBook.searching")}</Text>
                    </View>
                ) : !hasSearched ? null : results.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>{t("addBook.noResults")}</Text>
                        <Text style={styles.emptyText}>{t("addBook.noResultsText")}</Text>
                    </View>
                ) : (
                    <View style={styles.resultsList}>
                        {results.map((book) => {
                            const isAdding = isAddingBookId === book.id;
                            const workId = getOpenLibraryWorkId(book.id);
                            const isAdded = Boolean(storedBookMap[workId]);

                            return (
                                <View key={book.id} style={styles.resultCard}>
                                    {book.cover ? (
                                        <BookCover title={book.title} cover={book.cover} small />
                                    ) : (
                                        <CoverPlaceholder title={book.title} />
                                    )}

                                    <View style={styles.bookInfo}>
                                        <Text style={styles.bookTitle}>{book.title}</Text>
                                        <Text style={styles.bookAuthor}>{book.author}</Text>

                                        {book.firstPublishYear ? (
                                            <Text style={styles.bookMeta}>
                                                {book.firstPublishYear}
                                            </Text>
                                        ) : null}
                                    </View>

                                    <Pressable
                                        style={[
                                            styles.addSmallButton,
                                            isAdded && styles.addSmallButtonAdded,
                                            isAdding && styles.addSmallButtonDisabled,
                                        ]}
                                        onPress={() => void handleToggleBook(book)}
                                        disabled={isAdding}
                                    >
                                        <Text
                                            style={[
                                                styles.addSmallButtonText,
                                                isAdded && styles.addSmallButtonTextAdded,
                                            ]}
                                        >
                                            {isAdding
                                                ? t("addBook.adding")
                                                : isAdded
                                                    ? t("addBook.added")
                                                    : t("addBook.add")}
                                        </Text>
                                    </Pressable>
                                </View>
                            );
                        })}
                    </View>
                )}

                {!hasSearched && trimmedQuery === "" ? (
                    <View>
                        <Text style={pageStyles.title}>{t("addBook.emptyTitle")}</Text>
                        <Text style={pageStyles.emptyText}>{t("addBook.emptyText")}</Text>
                    </View>
                ) : null}
            </ScrollView>
        </View>
    );

    return (
        <SafeAreaView style={pageStyles.safeArea} edges={["top"]}>
            <ScreenTopBar title={t("books.addBook")} />

            <KeyboardAvoidingView
                style={pageStyles.safeArea}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                {Platform.OS === "web" ? (
                    screenContent
                ) : (
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                        {screenContent}
                    </TouchableWithoutFeedback>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        scrollContent: {
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.lg,
            gap: theme.spacing.md,
        },
        fixedHeaderContent: {
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.lg,
            paddingBottom: theme.spacing.sm,
        },
        headerRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            marginBottom: 4,
        },
        backButton: {
            width: 32,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
            marginTop: 2,
        },
        searchRow: {
            flexDirection: "row",
            gap: theme.spacing.xs,
            alignItems: "center",
            marginTop: theme.spacing.sm,
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
        inlineLoadingState: {
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: theme.spacing.md,
        },
        searchLoader: {
            width: 88,
            height: 88,
            marginBottom: 4,
        },
        errorText: {
            color:"#D64545",
            fontSize: theme.typography.fontSize.sm,
        },
        resultsList: {
            gap: theme.spacing.md,
            marginTop: theme.spacing.md,
        },
        resultCard: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.md,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
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
        addSmallButton: {
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 14,
            paddingVertical: 10,
            alignItems: "center",
            justifyContent: "center",
        },
        addSmallButtonDisabled: {
            opacity: 0.7,
        },
        addSmallButtonText: {
            color: "#FFFFFF",
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        emptyCard: {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            gap: theme.spacing.sm,
        },
        emptyTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.md,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        emptyText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
        },
        subtitle: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            marginTop: -theme.spacing.xs,
            marginBottom: theme.spacing.sm,
        },
        addSmallButtonAdded: {
            backgroundColor: theme.colors.successSoft,
        },
        addSmallButtonTextAdded: {
            color: theme.colors.success,
        },
    });
}