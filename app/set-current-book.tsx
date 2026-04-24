import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
    Alert,
    FlatList, Keyboard, KeyboardAvoidingView, Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput, TouchableWithoutFeedback,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BookCover } from "@/src/components/BookCover";
import { searchBooks } from "@/src/services/booksApi";
import { upsertBookFromSearchResult } from "@/src/services/supabaseBooks";
import {setCurrentClubBookAndAddToTbr, updateCurrentBookInSupabase} from "@/src/services/supabaseClub";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import { SearchBookResult } from "@/src/types/book";
import {AppHeader} from "@/src/components/AppHeader";
import {triggerRefresh} from "@/src/utils/refreshEvents";
import {ScreenTopBar} from "@/src/components/ScreenTopBar";
import {t} from "@/src/i18n";

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
            setErrorText(t("setCurrentBook.searchError"));
        } finally {
            setIsLoading(false);
        }
    }

    async function handleSave() {
        try {
            if (!selectedBook) {
                Alert.alert(
                    t("setCurrentBook.selectBookTitle"),
                    t("setCurrentBook.selectBookMessage")
                );
                return;
            }

            setIsSaving(true);

            const savedBook = await upsertBookFromSearchResult(selectedBook);

            await setCurrentClubBookAndAddToTbr({
                clubId: clubId ?? "",
                bookId: savedBook.id,
            });
            triggerRefresh("club","books", "home");
            router.replace({
                pathname: "/club",
                params: { clubId: clubId ?? "" },
            });
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : t("setCurrentBook.setErrorFallback");

            Alert.alert(t("setCurrentBook.setErrorTitle"), message);
        } finally {
            setIsSaving(false);
        }
    }
    const screenContent = (
        <View style={styles.screen}>

            <View style={styles.searchRow}>
                <View style={styles.searchBar}>
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder={t("setCurrentBook.searchPlaceholder")}
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
                    <Text style={styles.stateText}>{t("setCurrentBook.searching")}</Text>
                </View>
            ) : !hasSearched ? (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>{t("setCurrentBook.emptyTitle")}</Text>
                    <Text style={styles.emptyText}>{t("setCurrentBook.emptyText")}</Text>
                </View>
            ) : books.length === 0 ? (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>{t("setCurrentBook.noResultsTitle")}</Text>
                    <Text style={styles.emptyText}>{t("setCurrentBook.noResultsText")}</Text>
                </View>
            ) : (
                <>
                    <FlatList
                        data={books}
                        keyExtractor={(item) => item.id}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
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
                            {isSaving ? t("setCurrentBook.saving") : t("setCurrentBook.submit")}
                        </Text>
                    </Pressable>
                </>
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <ScreenTopBar title={t("setCurrentBook.title")} />
            <KeyboardAvoidingView
                style={styles.safeArea}
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
        safeArea: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        screen: {
            flex: 1,
            backgroundColor: theme.colors.background,
            padding: theme.spacing.lg,
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
        titleRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.xs,
        },
        backButton: {
            width: 32,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
        },
    });
}