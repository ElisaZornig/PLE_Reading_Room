import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    Alert,
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

import { AppHeader } from "@/src/components/AppHeader";
import { BookCover } from "@/src/components/BookCover";
import { searchBooks } from "@/src/services/booksApi";
import {
    addManualBookToClubShortlist,
    fetchClubShortlist,
    removeBookFromClubShortlist,
    type ClubShortlistItem,
} from "@/src/services/supabaseClubShortlist";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import { SearchBookResult } from "@/src/types/book";
import { useFocusEffect } from "@react-navigation/native";
import {ScreenTopBar} from "@/src/components/ScreenTopBar";
import {t} from "@/src/i18n";

export default function ChooseNextBookScreen() {
    const theme = useAppTheme();
    const styles = createStyles(theme);
    const params = useLocalSearchParams();

    const clubId = useMemo(() => {
        const value = params.clubId;
        return Array.isArray(value) ? value[0] : value;
    }, [params.clubId]);

    const [shortlistBooks, setShortlistBooks] = useState<ClubShortlistItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchBookResult[]>([]);
    const [isLoadingShortlist, setIsLoadingShortlist] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [isAddingBookId, setIsAddingBookId] = useState<string | null>(null);
    const [removingOptionId, setRemovingOptionId] = useState<string | null>(null);
    const [errorText, setErrorText] = useState("");
    const [hasSearched, setHasSearched] = useState(false);
    const [isShortlistOpen, setIsShortlistOpen] = useState(false);

    async function loadShortlist() {
        try {
            setIsLoadingShortlist(true);

            const data = await fetchClubShortlist(clubId ?? "");
            setShortlistBooks(data);
        } catch (error) {
            console.error("Error loading shortlist:", error);
            Alert.alert(
                t("chooseNextBook.errors.loadTitle"),
                t("chooseNextBook.errors.loadMessage")
            );
        } finally {
            setIsLoadingShortlist(false);
        }
    }

    useFocusEffect(
        useCallback(() => {
            loadShortlist();
        }, [clubId])
    );

    async function handleSearch() {
        const trimmedQuery = searchQuery.trim();

        if (!trimmedQuery) {
            setSearchResults([]);
            setErrorText("");
            setHasSearched(false);
            return;
        }

        try {
            setIsSearching(true);
            setErrorText("");
            setHasSearched(true);

            const results = await searchBooks(trimmedQuery);
            setSearchResults(results);
        } catch (error) {
            console.error("Error searching books:", error);
            setSearchResults([]);
            setErrorText(t("chooseNextBook.errors.searchMessage"));
        } finally {
            setIsSearching(false);
        }
    }

    async function handleAddBook(item: SearchBookResult) {
        try {
            setIsAddingBookId(item.id);

            await addManualBookToClubShortlist({
                clubId: clubId ?? "",
                book: item,
            });

            await loadShortlist();
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : t("chooseNextBook.errors.addMessage");

            Alert.alert(t("chooseNextBook.errors.addTitle"), message);
        } finally {
            setIsAddingBookId(null);
        }
    }

    function handleRemoveBook(item: ClubShortlistItem) {
        if (Platform.OS === "web") {
            const confirmed = globalThis.confirm?.(
                t("chooseNextBook.removeConfirm.message", { title: item.title })
            );

            if (confirmed) {
                void (async () => {
                    try {
                        setRemovingOptionId(item.optionId);
                        await removeBookFromClubShortlist(item.optionId);
                        await loadShortlist();
                    } catch (error) {
                        console.error("Error removing shortlist item:", error);
                        globalThis.alert?.(t("chooseNextBook.errors.removeMessage"));
                    } finally {
                        setRemovingOptionId(null);
                    }
                })();
            }

            return;
        }

        Alert.alert(
            t("chooseNextBook.removeConfirm.title"),
            t("chooseNextBook.removeConfirm.message", { title: item.title }),
            [
                {
                    text: t("chooseNextBook.removeConfirm.cancel"),
                    style: "cancel",
                },
                {
                    text: t("chooseNextBook.removeConfirm.confirm"),
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setRemovingOptionId(item.optionId);
                            await removeBookFromClubShortlist(item.optionId);
                            await loadShortlist();
                        } catch (error) {
                            console.error("Error removing shortlist item:", error);
                            Alert.alert(
                                t("chooseNextBook.errors.removeTitle"),
                                t("chooseNextBook.errors.removeMessage")
                            );
                        } finally {
                            setRemovingOptionId(null);
                        }
                    },
                },
            ]
        );
    }

    const shortlistBookIds = new Set(shortlistBooks.map((item) => item.bookId));
    const screenContent = (
        <View style={styles.screen}>
            <View style={styles.header}>

                <Text style={styles.subtitle}>
                    {t("chooseNextBook.subtitle")}
                </Text>
                <Pressable
                    style={styles.directSetLink}
                    onPress={() =>
                        router.push({
                            pathname: "/set-current-book",
                            params: { clubId: clubId ?? "" },
                        })
                    }
                >
                    <Feather name="arrow-right" size={16} color={theme.colors.accent} />
                    <Text style={styles.directSetLinkText}>
                        {t("chooseNextBook.alreadyKnowNextBook")}
                    </Text>
                </Pressable>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.sectionCard}>
                    <Pressable
                        style={styles.shortlistSummaryButton}
                        onPress={() => setIsShortlistOpen((current) => !current)}
                    >
                        <View style={styles.shortlistSummaryLeft}>
                            <Text style={styles.sectionTitle}>{t("chooseNextBook.shortlistTitle")}</Text>
                            <Text style={styles.shortlistSummaryText}>
                                {isLoadingShortlist
                                    ? t("common.loading")
                                    : shortlistBooks.length === 0
                                        ? t("chooseNextBook.shortlistCountZero")
                                        : shortlistBooks.length === 1
                                            ? t("chooseNextBook.shortlistCountOne")
                                            : t("chooseNextBook.shortlistCountOther", {
                                                count: shortlistBooks.length,
                                            })}
                            </Text>
                        </View>

                        {shortlistBooks.length > 0 ? (
                            <View style={styles.shortlistPreviewRow}>
                                {shortlistBooks.slice(0, 3).map((item, index) => (
                                    <View
                                        key={item.optionId}
                                        style={[
                                            styles.shortlistPreviewCoverWrap,
                                            index > 0 && styles.shortlistPreviewCoverOverlap,
                                        ]}
                                    >
                                        <BookCover title={item.title} cover={item.cover} small />
                                    </View>
                                ))}
                            </View>
                        ) : null}

                        <Feather
                            name={isShortlistOpen ? "chevron-up" : "chevron-down"}
                            size={18}
                            color={theme.colors.textMuted}
                        />
                    </Pressable>

                    {!isLoadingShortlist && shortlistBooks.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyTitle}>
                                {t("chooseNextBook.shortlistEmptyTitle")}
                            </Text>
                            <Text style={styles.emptyText}>
                                {t("chooseNextBook.shortlistEmptyText")}
                            </Text>
                        </View>
                    ) : null}

                    {isShortlistOpen && shortlistBooks.length > 0 ? (
                        <View style={styles.shortlistList}>
                            {shortlistBooks.map((item) => {
                                const isRemoving = removingOptionId === item.optionId;

                                return (
                                    <View key={item.optionId} style={styles.shortlistCard}>
                                        <BookCover title={item.title} cover={item.cover} small />

                                        <View style={styles.bookInfo}>
                                            <Text style={styles.bookTitle}>{item.title}</Text>
                                            <Text style={styles.bookAuthor}>{item.author}</Text>

                                            {item.firstPublishYear ? (
                                                <Text style={styles.bookMeta}>
                                                    {item.firstPublishYear}
                                                </Text>
                                            ) : null}

                                            <View style={styles.metaRow}>
                                                <View style={styles.sourceChip}>
                                                    <Text style={styles.sourceChipText}>
                                                        {item.source === "algorithm"
                                                            ? t("chooseNextBook.recommended")
                                                            : t("chooseNextBook.addedManually")}
                                                    </Text>
                                                </View>
                                            </View>

                                            {item.reason ? (
                                                <Text style={styles.reasonText}>{item.reason}</Text>
                                            ) : null}
                                        </View>

                                        <Pressable
                                            style={styles.removeButton}
                                            onPress={() => handleRemoveBook(item)}
                                            disabled={isRemoving}
                                        >
                                            <Feather
                                                name="trash-2"
                                                size={18}
                                                color={theme.colors.textMuted}
                                            />
                                        </Pressable>
                                    </View>
                                );
                            })}
                        </View>
                    ) : null}
                </View>
                <Pressable
                    style={styles.secondaryButton}
                    onPress={() =>
                        router.push({
                            pathname: "/recommendations",
                            params: { clubId: clubId ?? "" },
                        })
                    }
                >
                    <Feather name="arrow-right-circle" size={16} color={theme.colors.accent} />
                    <Text style={styles.secondaryButtonText}>
                        {t("chooseNextBook.goToRecommendations")}
                    </Text>
                </Pressable>
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>{t("chooseNextBook.addAnotherBook")}</Text>
                    <Text style={styles.sectionDescription}>
                        {t("chooseNextBook.addAnotherBookDescription")}
                    </Text>

                    <View style={styles.searchRow}>
                        <View style={styles.searchBar}>
                            <TextInput
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholder={t("chooseNextBook.searchPlaceholder")}
                                placeholderTextColor={theme.colors.textMuted}
                                style={styles.searchInput}
                                returnKeyType="search"
                                onSubmitEditing={handleSearch}
                            />
                        </View>

                        <Pressable
                            style={[
                                styles.searchButton,
                                isSearching && styles.searchButtonDisabled,
                            ]}
                            onPress={handleSearch}
                            disabled={isSearching}
                        >
                            <Feather name="search" size={18} color="#FFFFFF" />
                        </Pressable>
                    </View>

                    {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

                    {isSearching ? (
                        <Text style={styles.stateText}>{t("chooseNextBook.searching")}</Text>
                    ) : !hasSearched ? null : searchResults.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyTitle}>{t("chooseNextBook.noResultsTitle")}</Text>
                            <Text style={styles.emptyText}>{t("chooseNextBook.noResultsText")}</Text>
                        </View>
                    ) : (
                        <View style={styles.resultsList}>
                            {searchResults.map((item) => {
                                const isAdding = isAddingBookId === item.id;
                                const isAlreadyAdded = shortlistBookIds.has(item.id);

                                return (
                                    <View key={item.id} style={styles.resultCard}>
                                        <BookCover title={item.title} cover={item.cover} small />

                                        <View style={styles.bookInfo}>
                                            <Text style={styles.bookTitle}>{item.title}</Text>
                                            <Text style={styles.bookAuthor}>{item.author}</Text>

                                            {item.firstPublishYear ? (
                                                <Text style={styles.bookMeta}>
                                                    {item.firstPublishYear}
                                                </Text>
                                            ) : null}
                                        </View>

                                        <Pressable
                                            style={[
                                                styles.addSmallButton,
                                                (isAdding || isAlreadyAdded) &&
                                                styles.addSmallButtonDisabled,
                                            ]}
                                            onPress={() => handleAddBook(item)}
                                            disabled={isAdding || isAlreadyAdded}
                                        >
                                            <Text style={styles.addSmallButtonText}>
                                                {isAlreadyAdded
                                                    ? t("chooseNextBook.added")
                                                    : isAdding
                                                        ? t("chooseNextBook.adding")
                                                        : t("chooseNextBook.add")}
                                            </Text>
                                        </Pressable>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>
            </ScrollView>

            <Pressable
                style={[
                    styles.primaryButton,
                    shortlistBooks.length < 2 && styles.primaryButtonDisabled,
                ]}
                onPress={() =>
                    router.push({
                        pathname: "/spin-the-wheel",
                        params: { clubId: clubId ?? "" },
                    })
                }
                disabled={shortlistBooks.length < 2}
            >
                <Text style={styles.primaryButtonText}>
                    {shortlistBooks.length < 2
                        ? t("chooseNextBook.needMoreBooksToSpin")
                        : t("chooseNextBook.spinWheel")}
                </Text>
            </Pressable>
        </View>
    );
    return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <ScreenTopBar title={t("chooseNextBook.title")} />
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
        header: {
            marginBottom: theme.spacing.lg,
            gap: theme.spacing.sm,
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
        scrollContent: {
            gap: theme.spacing.md,
            paddingBottom: theme.spacing.lg,
        },
        sectionCard: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            gap: theme.spacing.md,
        },
        sectionHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
        },
        sectionTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        sectionMeta: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
        },
        sectionDescription: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
            marginTop: -theme.spacing.xs,
        },
        shortlistList: {
            gap: theme.spacing.md,
        },
        shortlistCard: {
            flexDirection: "row",
            alignItems: "flex-start",
            gap: theme.spacing.md,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
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
        metaRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.xs,
            marginTop: theme.spacing.xs,
        },
        sourceChip: {
            alignSelf: "flex-start",
            backgroundColor: theme.colors.accentSoft,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 10,
            paddingVertical: 6,
        },
        sourceChipText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.medium,
        },
        reasonText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
            marginTop: 2,
        },
        removeButton: {
            alignSelf: "flex-start",
            padding: 6,
        },
        searchRow: {
            flexDirection: "row",
            gap: theme.spacing.sm,
            alignItems: "center",
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
        },
        stateText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
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
        resultsList: {
            gap: theme.spacing.md,
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
        shortlistSummaryButton: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
        },

        shortlistSummaryLeft: {
            flex: 1,
            gap: 2,
        },

        shortlistSummaryText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
        },

        shortlistPreviewRow: {
            flexDirection: "row",
            alignItems: "center",
            marginRight: theme.spacing.xs,
        },

        shortlistPreviewCoverWrap: {
            width: 28,
            height: 42,
            overflow: "hidden",
            borderRadius: theme.radius.sm,
            borderWidth: 1,
            borderColor: theme.colors.card,
            backgroundColor: theme.colors.surface,
        },

        shortlistPreviewCoverOverlap: {
            marginLeft: -10,
        },
        secondaryButton: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: theme.spacing.xs,
            backgroundColor: theme.colors.accentSoft,
            borderRadius: theme.radius.pill,
            paddingVertical: 12,
            borderWidth: 1,
            borderColor: theme.colors.border,
        },

        secondaryButtonText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        directSetLink: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.xs,
            alignSelf: "flex-start",
            marginTop: theme.spacing.xs,
        },

        directSetLinkText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
        },
    });
}