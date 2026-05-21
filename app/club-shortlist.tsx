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
    type ClubShortlistItem, clearClubShortlist,
} from "@/src/services/supabaseClubShortlist";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import { SearchBookResult } from "@/src/types/book";
import { useFocusEffect } from "@react-navigation/native";
import {ScreenTopBar} from "@/src/components/ScreenTopBar";
import {t} from "@/src/i18n";
import {ChoiceStepper} from "@/src/components/ChoiceStepper";

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
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isManualOpen, setIsManualOpen] = useState(false);
    const [manualTitle, setManualTitle] = useState("");
    const [manualAuthor, setManualAuthor] = useState("");
    const [manualYear, setManualYear] = useState("");
    const [isAddingManualBook, setIsAddingManualBook] = useState(false);
    const [addedSearchBookIds, setAddedSearchBookIds] = useState<Set<string>>(new Set());
    const [isClearingShortlist, setIsClearingShortlist] = useState(false);
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
        if (addedSearchBookIds.has(item.id) || isAddingBookId === item.id) {
            return;
        }

        try {
            setIsAddingBookId(item.id);

            await addManualBookToClubShortlist({
                clubId: clubId ?? "",
                book: item,
            });

            setAddedSearchBookIds((current) => {
                const next = new Set(current);
                next.add(item.id);
                return next;
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

    function handleClearShortlist() {
        if (shortlistBooks.length === 0 || isClearingShortlist) {
            return;
        }

        if (Platform.OS === "web") {
            const confirmed = globalThis.confirm?.(
                t("chooseNextBook.clearShortlistConfirm.message")
            );

            if (confirmed) {
                void clearShortlist();
            }

            return;
        }

        Alert.alert(
            t("chooseNextBook.clearShortlistConfirm.title"),
            t("chooseNextBook.clearShortlistConfirm.message"),
            [
                {
                    text: t("chooseNextBook.clearShortlistConfirm.cancel"),
                    style: "cancel",
                },
                {
                    text: t("chooseNextBook.clearShortlistConfirm.confirm"),
                    style: "destructive",
                    onPress: () => void clearShortlist(),
                },
            ]
        );
    }

    async function clearShortlist() {
        try {
            setIsClearingShortlist(true);

            await clearClubShortlist(clubId ?? "");

            setShortlistBooks([]);
            setAddedSearchBookIds(new Set());
        } catch (error) {
            console.error("Error clearing shortlist:", error);

            Alert.alert(
                t("chooseNextBook.errors.clearShortlistTitle"),
                error instanceof Error
                    ? error.message
                    : t("chooseNextBook.errors.clearShortlistMessage")
            );
        } finally {
            setIsClearingShortlist(false);
        }
    }

    async function handleAddManualBook() {
        const title = manualTitle.trim();
        const author = manualAuthor.trim();
        const yearText = manualYear.trim();

        if (!title) {
            Alert.alert(
                t("chooseNextBook.manualMissingTitle"),
                t("chooseNextBook.manualMissingTitleMessage")
            );
            return;
        }

        const firstPublishYear = yearText ? Number(yearText) : undefined;

        if (yearText && Number.isNaN(firstPublishYear)) {
            Alert.alert(
                t("chooseNextBook.manualInvalidYearTitle"),
                t("chooseNextBook.manualInvalidYearMessage")
            );
            return;
        }

        try {
            setIsAddingManualBook(true);

            await addManualBookToClubShortlist({
                clubId: clubId ?? "",
                book: {
                    id: `manual-${Date.now()}`,
                    title,
                    author: author || t("chooseNextBook.unknownAuthor"),
                    cover: "",
                    firstPublishYear,
                },
            });

            setManualTitle("");
            setManualAuthor("");
            setManualYear("");
            setIsManualOpen(false);

            await loadShortlist();
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : t("chooseNextBook.errors.addMessage");

            Alert.alert(t("chooseNextBook.errors.addTitle"), message);
        } finally {
            setIsAddingManualBook(false);
        }
    }

    const shortlistBookIds = new Set(shortlistBooks.map((item) => item.bookId));
    const screenContent = (
        <View style={styles.screen}>
            <ChoiceStepper currentStep={2} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.scrollContent}
            >

                <View style={styles.header}>
                    <Text style={styles.title}>{t("chooseNextBook.shortlistTitleMain")}</Text>
                    <Text style={styles.subtitle}>{t("chooseNextBook.shortlistSubtitle")}</Text>
                </View>

                <View style={styles.actionRow}>
                    <Pressable
                        style={[
                            styles.actionButton,
                            isSearchOpen && styles.actionButtonActive,
                        ]}
                        onPress={() => {
                            setIsSearchOpen((current) => !current);
                            setIsManualOpen(false);
                        }}                    >
                        <Feather name="search" size={17} color={theme.colors.text} />
                        <Text style={styles.actionButtonText}>
                            {t("chooseNextBook.searchAction")}
                        </Text>
                    </Pressable>

                    <Pressable
                        style={[
                            styles.actionButton,
                            isManualOpen && styles.actionButtonActive,
                        ]}
                        onPress={() => {
                            setIsManualOpen((current) => !current);
                            setIsSearchOpen(false);
                        }}
                    >
                        <Feather name="plus" size={17} color={theme.colors.text} />
                        <Text style={styles.actionButtonText}>
                            {t("chooseNextBook.addManuallyAction")}
                        </Text>
                    </Pressable>

                    <Pressable
                        style={styles.actionButton}
                        onPress={() =>
                            router.push({
                                pathname: "/recommendations",
                                params: { clubId: clubId ?? "" },
                            })
                        }
                    >
                        <Feather name="star" size={17} color={theme.colors.text} />
                        <Text style={styles.actionButtonText}>
                            {t("chooseNextBook.recommendationsAction")}
                        </Text>
                    </Pressable>
                </View>

                {isSearchOpen ? (
                    <View style={styles.searchArea}>
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

                        {errorText ? (
                            <Text style={styles.errorText}>{errorText}</Text>
                        ) : null}

                        {isSearching ? (
                            <Text style={styles.stateText}>
                                {t("chooseNextBook.searching")}
                            </Text>
                        ) : !hasSearched ? null : searchResults.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptyTitle}>
                                    {t("chooseNextBook.noResultsTitle")}
                                </Text>
                                <Text style={styles.emptyText}>
                                    {t("chooseNextBook.noResultsText")}
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.resultsList}>
                                {searchResults.map((item) => {
                                    const isAdding = isAddingBookId === item.id;
                                    const isAlreadyAdded = addedSearchBookIds.has(item.id);
                                    return (
                                        <View key={item.id} style={styles.resultCard}>
                                            <BookCover
                                                title={item.title}
                                                cover={item.cover}
                                                small
                                            />

                                            <View style={styles.bookInfo}>
                                                <Text style={styles.bookTitle} numberOfLines={1}>
                                                    {item.title}
                                                </Text>
                                                <Text style={styles.bookAuthor} numberOfLines={1}>
                                                    {item.author}
                                                </Text>

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
                                                <Text
                                                    style={[
                                                        styles.addSmallButtonText,
                                                        (isAdding || isAlreadyAdded) && styles.addSmallButtonTextDisabled,
                                                    ]}
                                                >
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
                ) : null}

                {isManualOpen ? (
                    <View style={styles.manualArea}>
                        <TextInput
                            value={manualTitle}
                            onChangeText={setManualTitle}
                            placeholder={t("chooseNextBook.manualTitlePlaceholder")}
                            placeholderTextColor={theme.colors.textMuted}
                            style={styles.manualInput}
                        />

                        <TextInput
                            value={manualAuthor}
                            onChangeText={setManualAuthor}
                            placeholder={t("chooseNextBook.manualAuthorPlaceholder")}
                            placeholderTextColor={theme.colors.textMuted}
                            style={styles.manualInput}
                        />

                        <TextInput
                            value={manualYear}
                            onChangeText={setManualYear}
                            placeholder={t("chooseNextBook.manualYearPlaceholder")}
                            placeholderTextColor={theme.colors.textMuted}
                            style={styles.manualInput}
                            keyboardType="number-pad"
                        />

                        <Pressable
                            style={[
                                styles.manualAddButton,
                                (!manualTitle.trim() || isAddingManualBook) &&
                                styles.primaryButtonDisabled,
                            ]}
                            onPress={handleAddManualBook}
                            disabled={!manualTitle.trim() || isAddingManualBook}
                        >
                            <Text style={styles.manualAddButtonText}>
                                {isAddingManualBook
                                    ? t("chooseNextBook.adding")
                                    : t("chooseNextBook.addManualBook")}
                            </Text>
                        </Pressable>
                    </View>
                ) : null}

                <View style={styles.shortlistHeaderRow}>
                    <Text style={styles.shortlistHeading}>
                        {t("chooseNextBook.yourShortlist")}
                    </Text>

                    {shortlistBooks.length > 0 ? (
                        <Pressable
                            style={[
                                styles.clearShortlistButton,
                                isClearingShortlist && styles.clearShortlistButtonDisabled,
                            ]}
                            onPress={handleClearShortlist}
                            disabled={isClearingShortlist}
                        >
                            <Feather
                                name="trash-2"
                                size={14}
                                color={theme.colors.danger}
                            />
                            <Text style={styles.clearShortlistButtonText}>
                                {isClearingShortlist
                                    ? t("chooseNextBook.clearingShortlist")
                                    : t("chooseNextBook.clearShortlist")}
                            </Text>
                        </Pressable>
                    ) : null}
                </View>

                {isLoadingShortlist ? (
                    <Text style={styles.stateText}>{t("common.loading")}</Text>
                ) : shortlistBooks.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>
                            {t("chooseNextBook.shortlistEmptyTitle")}
                        </Text>
                        <Text style={styles.emptyText}>
                            {t("chooseNextBook.shortlistEmptyText")}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.shortlistList}>
                        {shortlistBooks.map((item) => {
                            const isRemoving = removingOptionId === item.optionId;

                            return (
                                <View key={item.optionId} style={styles.shortlistCard}>
                                    <BookCover title={item.title} cover={item.cover} small />

                                    <View style={styles.bookInfo}>
                                        <Text style={styles.bookTitle} numberOfLines={1}>
                                            {item.title}
                                        </Text>
                                        <Text style={styles.bookAuthor} numberOfLines={1}>
                                            {t("chooseNextBook.byAuthor", {
                                                author: item.author,
                                            })}
                                        </Text>

                                        <Text style={styles.addedByText}>
                                            {item.source === "algorithm"
                                                ? t("chooseNextBook.addedByRecommendations")
                                                : t("chooseNextBook.addedManually")}
                                        </Text>
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
                )}
            </ScrollView>

            <Pressable
                style={[
                    styles.primaryButton,
                    shortlistBooks.length < 2 && styles.primaryButtonDisabled,
                ]}
                onPress={() =>
                    router.push({
                        pathname: "/choose-method",
                        params: { clubId: clubId ?? "" },
                    })
                }
                disabled={shortlistBooks.length < 2}
            >
                <Text style={styles.primaryButtonText}>
                    {shortlistBooks.length < 2
                        ? t("chooseNextBook.needMoreBooksToChoose")
                        : t("chooseNextBook.continueToChoose")}
                </Text>
            </Pressable>
        </View>
    );
    return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <ScreenTopBar title={t("chooseNextBook.shortlistScreenTitle")} />
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
        screen: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },

        scrollContent: {
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.lg,
            paddingBottom: theme.spacing.lg,
            gap: theme.spacing.md,
        },

        searchArea: {
            gap: theme.spacing.md,
            marginBottom: theme.spacing.sm,
        },

        primaryButton: {
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.pill,
            paddingVertical: 14,
            alignItems: "center",
            marginHorizontal: theme.spacing.lg,
            marginTop: theme.spacing.sm,
            marginBottom: theme.spacing.lg,
        },
        safeArea: {
            flex: 1,
            backgroundColor: theme.colors.background,
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
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
        },
        addSmallButtonText: {
            color: "#FFFFFF",
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        addSmallButtonTextDisabled: {
            color: theme.colors.textMuted,
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
        stepText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            marginBottom: theme.spacing.md,
        },
        actionRow: {
            flexDirection: "row",
            gap: theme.spacing.sm,
        },

        actionButton: {
            flex: 1,
            backgroundColor: theme.colors.background,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            paddingVertical: 11,
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
        },

        actionButtonText: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
        },

        shortlistHeading: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.md,
            fontWeight: theme.typography.fontWeight.semibold,
        },

        shortlistCard: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.md,
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            padding: theme.spacing.md,
            borderWidth: 0,
        },

        addedByText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
        },

        moreButton: {
            padding: 6,
        },

        searchPanel: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            gap: theme.spacing.md,
        },
        actionButtonActive: {
            borderColor: theme.colors.accent,
            backgroundColor: theme.colors.accentSoft,
        },
        manualArea: {
            gap: theme.spacing.sm,
            marginBottom: theme.spacing.sm,
        },

        manualInput: {
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.lg,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
        },

        manualAddButton: {
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.pill,
            paddingVertical: 13,
            alignItems: "center",
            justifyContent: "center",
            marginTop: theme.spacing.xs,
        },

        manualAddButtonText: {
            color: "#FFFFFF",
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },

        shortlistHeaderRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: theme.spacing.sm,
            marginBottom: theme.spacing.sm,
        },

        clearShortlistButton: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.xs,
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.danger,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: 8,
        },

        clearShortlistButtonDisabled: {
            opacity: 0.5,
        },

        clearShortlistButtonText: {
            color: theme.colors.danger,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
        },
    });
}