import { Feather } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
    Keyboard,
    KeyboardAvoidingView, Modal,
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

import { BookCover } from "@/src/components/BookCover";
import { CoverPlaceholder } from "@/src/components/CoverPlaceholder";
import { t } from "@/src/i18n";
import { searchBooks } from "@/src/services/booksApi";
import {
    addBookToUserLibrary, addManualBookToUserLibrary,
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
import {BookStatus, SearchBookResult} from "@/src/types/book";
import { showAppAlert } from "@/src/utils/appAlert";
import { getOpenLibraryWorkId } from "@/src/utils/openLibrary";
import {triggerRefresh} from "@/src/utils/refreshEvents";
import {ScreenTopBar} from "@/src/components/ScreenTopBar";
import {GENRE_OPTIONS} from "@/src/constants/readingPreferences";
import {ADD_BOOK_STATUS_OPTIONS} from "@/src/constants/bookStatus";

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
    const [isManualBookModalVisible, setIsManualBookModalVisible] = useState(false);
    const [manualTitle, setManualTitle] = useState("");
    const [manualAuthor, setManualAuthor] = useState("");
    const [manualYear, setManualYear] = useState("");
    const [isSavingManualBook, setIsSavingManualBook] = useState(false);
    const [manualGenres, setManualGenres] = useState<string[]>([]);
    const [selectedStatus, setSelectedStatus] = useState<BookStatus>("toRead");
    const [selectedProgress, setSelectedProgress] = useState("");
    const [selectedRating, setSelectedRating] = useState("");
    const [selectedDnfReason, setSelectedDnfReason] = useState("");
    const [bookToAddWithStatus, setBookToAddWithStatus] =
        useState<SearchBookResult | null>(null);

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
            const workId = getOpenLibraryWorkId(result.id);
            const storedBookId = storedBookMap[workId];
            const isAlreadyStored = Boolean(storedBookId);

            if (isAlreadyStored) {
                setIsAddingBookId(result.id);

                await removeUserBookFromSupabase(storedBookId);

                setStoredBookMap((current) => {
                    const next = { ...current };
                    delete next[workId];
                    return next;
                });

                return;
            }

            resetAddBookDetails();
            setBookToAddWithStatus(result);
        } catch (error) {
            console.error("Fout bij toevoegen of verwijderen van boek:", error);
            showAppAlert(t("addBook.errorTitle"), t("addBook.toggleError"));
        } finally {
            setIsAddingBookId(null);
        }
    }
    async function handleConfirmAddSearchedBook() {
        if (!bookToAddWithStatus) return;

        const addBookDetails = getAddBookDetails();

        if (!addBookDetails) return;

        try {
            setIsAddingBookId(bookToAddWithStatus.id);

            const workId = getOpenLibraryWorkId(bookToAddWithStatus.id);
            const userId = await getCurrentUserId();

            const savedBook = await upsertBookFromSearchResult({
                ...bookToAddWithStatus,
                id: workId,
            });

            await addBookToUserLibrary(savedBook.id, userId, addBookDetails);

            triggerRefresh("books", "home");

            setStoredBookMap((current) => ({
                ...current,
                [workId]: savedBook.id,
            }));

            setBookToAddWithStatus(null);
            resetAddBookDetails();
        } catch (error) {
            console.error("Fout bij toevoegen van boek:", error);
            showAppAlert(t("addBook.errorTitle"), t("addBook.toggleError"));
        } finally {
            setIsAddingBookId(null);
        }
    }

    async function handleAddManualBook() {
        const title = manualTitle.trim();
        const author = manualAuthor.trim();
        const parsedYear = manualYear.trim() ? Number(manualYear.trim()) : undefined;

        if (!title || !author) {
            showAppAlert(
                t("addBook.manualErrorTitle"),
                t("addBook.manualRequiredFields")
            );
            return;
        }

        if (parsedYear && Number.isNaN(parsedYear)) {
            showAppAlert(
                t("addBook.manualErrorTitle"),
                t("addBook.manualInvalidYear")
            );
            return;
        }
        const addBookDetails = getAddBookDetails();

        if (!addBookDetails) return;

        try {
            setIsSavingManualBook(true);

            await addManualBookToUserLibrary({
                title,
                author,
                firstPublishYear: parsedYear,
                genres: manualGenres,
                ...addBookDetails,
            });

            triggerRefresh("books", "home");

            setManualTitle("");
            setManualAuthor("");
            setManualYear("");
            setIsManualBookModalVisible(false);
            setManualGenres([]);
            resetAddBookDetails();

            showAppAlert(
                t("addBook.manualSuccessTitle"),
                t("addBook.manualSuccessText")
            );
        } catch (error) {
            console.error("Fout bij handmatig toevoegen van boek:", error);
            showAppAlert(
                t("addBook.errorTitle"),
                t("addBook.manualSaveError")
            );
        } finally {
            setIsSavingManualBook(false);
        }
    }
    function handleToggleManualGenre(genreValue: string) {
        setManualGenres((currentGenres) => {
            if (currentGenres.includes(genreValue)) {
                return currentGenres.filter((genre) => genre !== genreValue);
            }

            return [...currentGenres, genreValue];
        });
    }
    const addBookDetailsSection = (
        <View style={styles.statusSection}>
            <Text style={styles.statusSectionTitle}>
                {t("addBook.statusLabel")}
            </Text>

            <View style={styles.statusChipWrap}>
                {ADD_BOOK_STATUS_OPTIONS.map((status) => {
                    const isSelected = selectedStatus === status.value;

                    return (
                        <Pressable
                            key={status.value}
                            style={[
                                styles.statusChip,
                                isSelected && styles.statusChipSelected,
                            ]}
                            onPress={() => setSelectedStatus(status.value)}
                        >
                            <Text
                                style={[
                                    styles.statusChipText,
                                    isSelected && styles.statusChipTextSelected,
                                ]}
                            >
                                {t(status.labelKey)}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {selectedStatus === "reading" ? (
                <TextInput
                    value={selectedProgress}
                    onChangeText={setSelectedProgress}
                    placeholder={t("addBook.progressPlaceholder")}
                    placeholderTextColor={theme.colors.textMuted}
                    style={styles.manualInput}
                    keyboardType="decimal-pad"
                />
            ) : null}

            {selectedStatus === "finished" ? (
                <TextInput
                    value={selectedRating}
                    onChangeText={setSelectedRating}
                    placeholder={t("addBook.ratingPlaceholder")}
                    placeholderTextColor={theme.colors.textMuted}
                    style={styles.manualInput}
                    keyboardType="decimal-pad"
                />
            ) : null}

            {selectedStatus === "dnf" ? (
                <>
                    <TextInput
                        value={selectedProgress}
                        onChangeText={setSelectedProgress}
                        placeholder={t("addBook.dnfProgressPlaceholder")}
                        placeholderTextColor={theme.colors.textMuted}
                        style={styles.manualInput}
                        keyboardType="decimal-pad"
                    />

                    <TextInput
                        value={selectedDnfReason}
                        onChangeText={setSelectedDnfReason}
                        placeholder={t("addBook.dnfReasonPlaceholder")}
                        placeholderTextColor={theme.colors.textMuted}
                        style={[styles.manualInput, styles.dnfReasonInput]}
                        multiline
                    />
                </>
            ) : null}
        </View>
    );

    function resetAddBookDetails() {
        setSelectedStatus("toRead");
        setSelectedProgress("");
        setSelectedRating("");
        setSelectedDnfReason("");
    }

    function parseNumberInput(value: string) {
        const normalizedValue = value.replace(",", ".").trim();

        if (!normalizedValue) {
            return undefined;
        }

        return Number(normalizedValue);
    }

    function getAddBookDetails() {
        const progress = parseNumberInput(selectedProgress);
        const rating = parseNumberInput(selectedRating);

        if (selectedStatus === "reading") {
            if (progress === undefined || Number.isNaN(progress)) {
                showAppAlert(
                    t("addBook.errorTitle"),
                    t("addBook.progressRequired")
                );
                return null;
            }

            if (progress < 0 || progress > 100) {
                showAppAlert(
                    t("addBook.errorTitle"),
                    t("addBook.progressInvalid")
                );
                return null;
            }
        }

        if (selectedStatus === "dnf" && progress !== undefined) {
            if (Number.isNaN(progress) || progress < 0 || progress > 100) {
                showAppAlert(
                    t("addBook.errorTitle"),
                    t("addBook.progressInvalid")
                );
                return null;
            }
        }

        if (selectedStatus === "finished" && rating !== undefined) {
            if (Number.isNaN(rating) || rating < 0 || rating > 5) {
                showAppAlert(
                    t("addBook.errorTitle"),
                    t("addBook.ratingInvalid")
                );
                return null;
            }
        }

        return {
            status: selectedStatus,
            progress:
                selectedStatus === "finished"
                    ? 100
                    : selectedStatus === "reading" || selectedStatus === "dnf"
                        ? progress ?? 0
                        : 0,
            progressMode: "percentage" as const,
            rating: selectedStatus === "finished" ? rating : undefined,
            dnfReason:
                selectedStatus === "dnf"
                    ? selectedDnfReason.trim() || undefined
                    : undefined,
        };
    }

    const manualBookCard = hasSearched ? (
        <View style={styles.manualBookCard}>
            <Text style={styles.manualBookTitle}>
                {t("addBook.manualBookTitle")}
            </Text>
            <Text style={styles.manualBookText}>
                {t("addBook.manualBookText")}
            </Text>

            <Pressable
                style={styles.manualBookButton}
                onPress={() => setIsManualBookModalVisible(true)}
            >
                <Text style={styles.manualBookButtonText}>
                    {t("addBook.manualBookButton")}
                </Text>
            </Pressable>
        </View>
    ) : null;

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
                        {manualBookCard}
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
                        {manualBookCard}
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
            <Modal
                visible={isManualBookModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsManualBookModalVisible(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalKeyboardView}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                >
                    <View style={styles.modalOverlay}>
                        <ScrollView
                            contentContainerStyle={styles.modalScrollContent}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={styles.modalCard}>
                                <Text style={styles.modalTitle}>
                                    {t("addBook.manualModalTitle")}
                                </Text>

                                <Text style={styles.modalText}>
                                    {t("addBook.manualModalText")}
                                </Text>

                                <TextInput
                                    value={manualTitle}
                                    onChangeText={setManualTitle}
                                    placeholder={t("addBook.manualTitlePlaceholder")}
                                    placeholderTextColor={theme.colors.textMuted}
                                    style={styles.manualInput}
                                    returnKeyType="next"
                                />

                                <TextInput
                                    value={manualAuthor}
                                    onChangeText={setManualAuthor}
                                    placeholder={t("addBook.manualAuthorPlaceholder")}
                                    placeholderTextColor={theme.colors.textMuted}
                                    style={styles.manualInput}
                                    returnKeyType="next"
                                />

                                <TextInput
                                    value={manualYear}
                                    onChangeText={setManualYear}
                                    placeholder={t("addBook.manualYearPlaceholder")}
                                    placeholderTextColor={theme.colors.textMuted}
                                    style={styles.manualInput}
                                    keyboardType="number-pad"
                                    returnKeyType="done"
                                />

                                <View style={styles.genreSection}>
                                    <Text style={styles.genreSectionTitle}>
                                        {t("addBook.manualGenresLabel")}
                                    </Text>

                                    <View style={styles.genreChipWrap}>
                                        {GENRE_OPTIONS.map((genre) => {
                                            const isSelected = manualGenres.includes(genre.value);

                                            return (
                                                <Pressable
                                                    key={genre.value}
                                                    style={[
                                                        styles.genreChip,
                                                        isSelected && styles.genreChipSelected,
                                                    ]}
                                                    onPress={() => handleToggleManualGenre(genre.value)}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.genreChipText,
                                                            isSelected && styles.genreChipTextSelected,
                                                        ]}
                                                    >
                                                        {genre.label}
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                </View>

                                {addBookDetailsSection}

                                <View style={styles.modalButtonRow}>
                                    <Pressable
                                        style={styles.modalSecondaryButton}
                                        onPress={() => {
                                            Keyboard.dismiss();
                                            setIsManualBookModalVisible(false);
                                        }}
                                        disabled={isSavingManualBook}
                                    >
                                        <Text style={styles.modalSecondaryButtonText}>
                                            {t("common.cancel")}
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        style={[
                                            styles.modalPrimaryButton,
                                            isSavingManualBook && styles.searchButtonDisabled,
                                        ]}
                                        onPress={() => void handleAddManualBook()}
                                        disabled={isSavingManualBook}
                                    >
                                        <Text style={styles.modalPrimaryButtonText}>
                                            {isSavingManualBook
                                                ? t("addBook.manualSaving")
                                                : t("addBook.manualSaveButton")}
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
            <Modal
                visible={Boolean(bookToAddWithStatus)}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    setBookToAddWithStatus(null);
                    resetAddBookDetails();
                }}
            >
                <KeyboardAvoidingView
                    style={styles.modalKeyboardView}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                >
                    <View style={styles.modalOverlay}>
                        <ScrollView
                            contentContainerStyle={styles.modalScrollContent}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={styles.modalCard}>
                                <Text style={styles.modalTitle}>
                                    {t("addBook.chooseStatusTitle")}
                                </Text>

                                {bookToAddWithStatus ? (
                                    <View style={styles.selectedBookPreview}>
                                        {bookToAddWithStatus.cover ? (
                                            <BookCover
                                                title={bookToAddWithStatus.title}
                                                cover={bookToAddWithStatus.cover}
                                                small
                                            />
                                        ) : (
                                            <CoverPlaceholder title={bookToAddWithStatus.title} />
                                        )}

                                        <View style={styles.bookInfo}>
                                            <Text style={styles.bookTitle}>
                                                {bookToAddWithStatus.title}
                                            </Text>
                                            <Text style={styles.bookAuthor}>
                                                {bookToAddWithStatus.author}
                                            </Text>
                                        </View>
                                    </View>
                                ) : null}

                                {addBookDetailsSection}

                                <View style={styles.modalButtonRow}>
                                    <Pressable
                                        style={styles.modalSecondaryButton}
                                        onPress={() => {
                                            Keyboard.dismiss();
                                            setBookToAddWithStatus(null);
                                            resetAddBookDetails();
                                        }}
                                        disabled={Boolean(isAddingBookId)}
                                    >
                                        <Text style={styles.modalSecondaryButtonText}>
                                            {t("common.cancel")}
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        style={[
                                            styles.modalPrimaryButton,
                                            isAddingBookId && styles.searchButtonDisabled,
                                        ]}
                                        onPress={() => void handleConfirmAddSearchedBook()}
                                        disabled={Boolean(isAddingBookId)}
                                    >
                                        <Text style={styles.modalPrimaryButtonText}>
                                            {isAddingBookId
                                                ? t("addBook.adding")
                                                : t("addBook.add")}
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
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
        manualBookCard: {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            gap: theme.spacing.sm,
            marginTop: theme.spacing.md,
        },
        manualBookTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.md,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        manualBookText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
        },
        manualBookButton: {
            alignSelf: "flex-start",
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 14,
            paddingVertical: 10,
        },
        manualBookButtonText: {
            color: "#FFFFFF",
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.35)",
        },
        modalCard: {
            width: "100%",
            maxWidth: 420,
            backgroundColor: theme.colors.background,
            borderRadius: theme.radius.lg,
            padding: theme.spacing.lg,
            gap: theme.spacing.md,
        },
        modalTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        modalText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
        },
        manualInput: {
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
        },
        modalButtonRow: {
            flexDirection: "row",
            justifyContent: "flex-end",
            gap: theme.spacing.sm,
            marginTop: theme.spacing.sm,
        },
        modalSecondaryButton: {
            borderRadius: theme.radius.pill,
            paddingHorizontal: 14,
            paddingVertical: 10,
        },
        modalSecondaryButtonText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        modalPrimaryButton: {
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 14,
            paddingVertical: 10,
        },
        modalPrimaryButtonText: {
            color: "#FFFFFF",
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        modalKeyboardView: {
            flex: 1,
        },
        modalScrollContent: {
            flexGrow: 1,
            justifyContent: "center",
            padding: theme.spacing.lg,
        },
        genreSection: {
            gap: theme.spacing.sm,
        },
        genreSectionTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        genreChipWrap: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: theme.spacing.xs,
        },
        genreChip: {
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: theme.colors.surface,
        },
        genreChipSelected: {
            backgroundColor: theme.colors.accent,
            borderColor: theme.colors.accent,
        },
        genreChipText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.medium,
        },
        genreChipTextSelected: {
            color: "#FFFFFF",
        },
        statusSection: {
            gap: theme.spacing.sm,
        },
        statusSectionTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        statusChipWrap: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: theme.spacing.xs,
        },
        statusChip: {
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: theme.colors.surface,
        },
        statusChipSelected: {
            backgroundColor: theme.colors.accent,
            borderColor: theme.colors.accent,
        },
        statusChipText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.medium,
        },
        statusChipTextSelected: {
            color: "#FFFFFF",
        },
        dnfReasonInput: {
            minHeight: 84,
            textAlignVertical: "top",
        },
        selectedBookPreview: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.md,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
        },
    });
}