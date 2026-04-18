import Slider from "@react-native-community/slider";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LottieView from "lottie-react-native";

import { AppHeader } from "@/src/components/AppHeader";
import { CoverPlaceholder } from "@/src/components/CoverPlaceholder";
import { StarRatingInput } from "@/src/components/StarRatingInput";
import { t } from "@/src/i18n";
import {
    fetchSingleUserBookFromSupabase,
    updateUserBookInSupabase,
} from "@/src/services/supabaseUserBooks";
import { createPageStyles } from "@/src/styles/pageStyles";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import { Book, BookStatus, ProgressMode } from "@/src/types/book";
import { getBookStatusColors, getBookStatusLabel } from "@/src/utils/bookStatus";
import { showAppAlert } from "@/src/utils/appAlert";
import {triggerRefresh} from "@/src/utils/refreshEvents";

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

export default function BookDetailScreen() {
    const theme = useAppTheme();
    const pageStyles = createPageStyles(theme);
    const styles = createStyles(theme);

    const { id } = useLocalSearchParams<{ id: string }>();
    const decodedId = typeof id === "string" ? decodeURIComponent(id) : "";

    const [book, setBook] = useState<Book | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [status, setStatus] = useState<BookStatus>("toRead");
    const [progressMode, setProgressMode] = useState<ProgressMode>("percentage");
    const [progress, setProgress] = useState(0);
    const [currentPage, setCurrentPage] = useState("");
    const [totalPages, setTotalPages] = useState("");

    const [rating, setRating] = useState(0);
    const [review, setReview] = useState("");
    const [dnfReason, setDnfReason] = useState("");

    useEffect(() => {
        async function loadBook() {
            try {
                const foundBook = await fetchSingleUserBookFromSupabase(decodedId);

                setBook(foundBook);

                if (foundBook) {
                    setStatus(foundBook.status);

                    const initialProgressMode =
                        foundBook.progressMode ??
                        (foundBook.currentPage !== undefined ||
                        foundBook.totalPages !== undefined
                            ? "pages"
                            : "percentage");

                    setProgressMode(initialProgressMode);
                    setProgress(foundBook.progress ?? 0);
                    setCurrentPage(foundBook.currentPage?.toString() ?? "");
                    setTotalPages(foundBook.totalPages?.toString() ?? "");
                    setRating(foundBook.rating ?? 0);
                    setReview(foundBook.review ?? "");
                    setDnfReason(foundBook.dnfReason ?? "");
                }
            } catch (error) {
                console.error("Fout bij laden van boek uit Supabase:", error);
                setBook(null);
                showAppAlert(
                    t("bookDetail.loadErrorTitle"),
                    t("bookDetail.loadErrorMessage")
                );
            } finally {
                setIsLoading(false);
            }
        }

        void loadBook();
    }, [decodedId]);

    async function handleSave() {
        if (!book) return;

        try {
            setIsSaving(true);

            let nextProgress = progress;
            let nextCurrentPage: number | undefined = undefined;
            let nextTotalPages: number | undefined = undefined;

            const parsedTotalPages = Number(totalPages);
            const hasValidTotalPages =
                Number.isFinite(parsedTotalPages) && parsedTotalPages > 0;

            if (status === "reading") {
                if (progressMode === "pages") {
                    const parsedCurrentPage = Number(currentPage);
                    const hasValidCurrentPage =
                        Number.isFinite(parsedCurrentPage) && parsedCurrentPage >= 0;

                    nextTotalPages = hasValidTotalPages ? parsedTotalPages : undefined;
                    nextCurrentPage = hasValidCurrentPage ? parsedCurrentPage : undefined;

                    if (nextTotalPages && nextCurrentPage !== undefined) {
                        nextCurrentPage = clamp(nextCurrentPage, 0, nextTotalPages);
                        nextProgress = Math.round((nextCurrentPage / nextTotalPages) * 100);
                    } else {
                        nextProgress = clamp(progress, 0, 100);
                    }
                } else {
                    nextProgress = clamp(progress, 0, 100);
                    nextCurrentPage = undefined;
                    nextTotalPages = hasValidTotalPages ? parsedTotalPages : undefined;
                }
            }

            if (status === "toRead") {
                nextProgress = 0;
                nextCurrentPage = undefined;
                nextTotalPages = undefined;
            }

            if (status === "finished") {
                nextProgress = 100;
                nextCurrentPage = undefined;
                nextTotalPages = undefined;
            }

            if (status === "dnf") {
                nextCurrentPage = undefined;
                nextTotalPages = undefined;
            }

            const updatedBook: Book = {
                ...book,
                status,
                progressMode,
                progress: nextProgress,
                currentPage: nextCurrentPage,
                totalPages: nextTotalPages,
                rating: status === "finished" || status === "dnf" ? rating : undefined,
                review:
                    status === "finished" || status === "dnf"
                        ? review.trim()
                        : undefined,
                dnfReason: status === "dnf" ? dnfReason.trim() : undefined,
                updatedAt: new Date().toISOString(),
            };

            await updateUserBookInSupabase(updatedBook);
            setBook(updatedBook);
            triggerRefresh("books", "home", "club");
            router.back();
        } catch (error) {
            console.error("Fout bij opslaan van boekdetails:", error);
            showAppAlert(
                t("bookDetail.saveErrorTitle"),
                t("bookDetail.saveErrorMessage")
            );
        } finally {
            setIsSaving(false);
        }
    }

    const statusOptions: BookStatus[] = ["toRead", "reading", "finished", "dnf"];

    if (isLoading) {
        return (
            <SafeAreaView style={pageStyles.safeArea} edges={["top"]}>
                <AppHeader />
                <View style={styles.loadingWrapper}>
                    <LottieView
                        source={require("@/assets/animations/loading-book.json")}
                        autoPlay
                        loop
                        style={styles.loadingAnimation}
                    />
                    <Text style={pageStyles.emptyText}>{t("bookDetail.loading")}</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!book) {
        return (
            <SafeAreaView style={pageStyles.safeArea} edges={["top"]}>
                <AppHeader />
                <View style={pageStyles.screen}>
                    <View style={styles.fixedHeaderContent}>
                        <View style={styles.headerRow}>
                            <Pressable onPress={() => router.back()} style={styles.backButton}>
                                <Feather
                                    name="chevron-left"
                                    size={22}
                                    color={theme.colors.accent}
                                />
                            </Pressable>

                            <View style={pageStyles.pageHeader}>
                                <Text style={pageStyles.pageTitle}>
                                    {t("bookDetail.title")}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.notFoundContent}>
                        <View style={pageStyles.sectionCard}>
                            <Text style={pageStyles.title}>
                                {t("bookDetail.notFoundTitle")}
                            </Text>
                            <Text style={pageStyles.emptyText}>
                                {t("bookDetail.notFoundText")}
                            </Text>
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <AppHeader />

            <KeyboardAvoidingView
                style={styles.safeArea}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <View style={pageStyles.screen}>
                    <View style={styles.fixedHeaderContent}>
                        <View style={styles.headerRow}>
                            <Pressable onPress={() => router.back()} style={styles.backButton}>
                                <Feather
                                    name="chevron-left"
                                    size={22}
                                    color={theme.colors.accent}
                                />
                            </Pressable>

                            <View style={pageStyles.pageHeader}>
                                <Text style={pageStyles.pageTitle}>
                                    {t("bookDetail.title")}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <ScrollView
                        style={pageStyles.screen}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={pageStyles.sectionCard}>
                            <View style={styles.bookTopRow}>
                                {book.cover ? (
                                    <Image source={{ uri: book.cover }} style={styles.coverImage} />
                                ) : (
                                    <CoverPlaceholder title={book.title} />
                                )}

                                <View style={styles.bookInfo}>
                                    <Text style={styles.bookTitle}>{book.title}</Text>
                                    <Text style={styles.bookAuthor}>{book.author}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={pageStyles.sectionCard}>
                            <Text style={pageStyles.title}>{t("bookDetail.status")}</Text>

                            <View style={styles.chipRow}>
                                {statusOptions.map((option) => {
                                    const isActive = status === option;
                                    const statusColors = getBookStatusColors(option, theme);

                                    return (
                                        <Pressable
                                            key={option}
                                            onPress={() => setStatus(option)}
                                            style={[
                                                styles.chip,
                                                isActive && {
                                                    backgroundColor: statusColors.backgroundColor,
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.chipText,
                                                    isActive && {
                                                        color: statusColors.textColor,
                                                        fontWeight:
                                                        theme.typography.fontWeight.semibold,
                                                    },
                                                ]}
                                            >
                                                {getBookStatusLabel(option)}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>

                        {status === "reading" ? (
                            <View style={pageStyles.sectionCard}>
                                <Text style={pageStyles.title}>{t("bookDetail.progress")}</Text>

                                <View style={styles.modeRow}>
                                    <Pressable
                                        onPress={() => setProgressMode("percentage")}
                                        style={[
                                            styles.modeChip,
                                            progressMode === "percentage" &&
                                            styles.modeChipActive,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.modeChipText,
                                                progressMode === "percentage" &&
                                                styles.modeChipTextActive,
                                            ]}
                                        >
                                            {t("bookDetail.percentage")}
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={() => setProgressMode("pages")}
                                        style={[
                                            styles.modeChip,
                                            progressMode === "pages" && styles.modeChipActive,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.modeChipText,
                                                progressMode === "pages" &&
                                                styles.modeChipTextActive,
                                            ]}
                                        >
                                            {t("bookDetail.pages")}
                                        </Text>
                                    </Pressable>
                                </View>

                                {progressMode === "percentage" ? (
                                    <View style={styles.progressBlock}>
                                        <Text style={styles.progressValue}>
                                            {Math.round(progress)}%
                                        </Text>

                                        <Slider
                                            value={progress}
                                            onValueChange={setProgress}
                                            minimumValue={0}
                                            maximumValue={100}
                                            step={1}
                                            minimumTrackTintColor={theme.colors.accent}
                                            maximumTrackTintColor={theme.colors.border}
                                            thumbTintColor={theme.colors.accent}
                                        />
                                    </View>
                                ) : (
                                    <View style={styles.pageInputs}>
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.fieldLabel}>
                                                {t("bookDetail.currentPage")}
                                            </Text>
                                            <TextInput
                                                value={currentPage}
                                                onChangeText={setCurrentPage}
                                                keyboardType="numeric"
                                                style={styles.input}
                                                placeholder="0"
                                                placeholderTextColor={theme.colors.textMuted}
                                            />
                                        </View>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.fieldLabel}>
                                                {t("bookDetail.totalPages")}
                                            </Text>
                                            <TextInput
                                                value={totalPages}
                                                onChangeText={setTotalPages}
                                                keyboardType="numeric"
                                                style={styles.input}
                                                placeholder="320"
                                                placeholderTextColor={theme.colors.textMuted}
                                            />
                                        </View>
                                    </View>
                                )}
                            </View>
                        ) : null}

                        {status === "finished" || status === "dnf" ? (
                            <View style={pageStyles.sectionCard}>
                                <Text style={pageStyles.title}>
                                    {t("bookDetail.reviewTitle")}
                                </Text>

                                {status === "dnf" ? (
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.fieldLabel}>
                                            {t("bookDetail.dnfReason")}
                                        </Text>
                                        <TextInput
                                            value={dnfReason}
                                            onChangeText={setDnfReason}
                                            style={styles.input}
                                            placeholder={t("bookDetail.dnfReason")}
                                            placeholderTextColor={theme.colors.textMuted}
                                        />
                                    </View>
                                ) : null}

                                <StarRatingInput value={rating} onChange={setRating} />

                                <View style={styles.inputGroup}>
                                    <Text style={styles.fieldLabel}>
                                        {t("bookDetail.reviewTitle")}
                                    </Text>
                                    <TextInput
                                        value={review}
                                        onChangeText={setReview}
                                        style={styles.textArea}
                                        placeholder={t("bookDetail.reviewPlaceholder")}
                                        placeholderTextColor={theme.colors.textMuted}
                                        multiline
                                        textAlignVertical="top"
                                    />
                                </View>
                            </View>
                        ) : null}
                    </ScrollView>

                    <View style={styles.footer}>
                        <Pressable
                            style={[
                                styles.saveButton,
                                isSaving && styles.saveButtonDisabled,
                            ]}
                            onPress={handleSave}
                            disabled={isSaving}
                        >
                            <Text style={styles.saveButtonText}>
                                {isSaving ? t("bookDetail.saving") : t("bookDetail.save")}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        fixedHeaderContent: {
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.lg,
            paddingBottom: theme.spacing.sm,
        },
        safeArea: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        headerRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
        },
        backButton: {
            width: 32,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
        },
        scrollContent: {
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.md,
            gap: theme.spacing.md,
        },
        loadingWrapper: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.background,
        },
        loadingAnimation: {
            width: 180,
            height: 180,
            marginBottom: 8,
        },
        notFoundContent: {
            flex: 1,
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.md,
        },
        bookTopRow: {
            flexDirection: "row",
            gap: theme.spacing.lg,
            alignItems: "center",
        },
        coverWrap: {
            width: 90,
            height: 130,
        },
        coverImageWrap: {
            width: 90,
            height: 130,
            borderRadius: 14,
            overflow: "hidden",
            backgroundColor: theme.colors.accentSoft,
        },
        coverMask: {
            width: "100%",
            height: "100%",
        },
        bookInfo: {
            flex: 1,
            gap: 6,
        },
        bookTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        bookAuthor: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.md,
        },
        chipRow: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: theme.spacing.sm,
        },
        chip: {
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 12,
            paddingVertical: 10,
        },
        chipText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
        },
        fieldLabel: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
        },
        modeRow: {
            flexDirection: "row",
            gap: theme.spacing.sm,
        },
        modeChip: {
            flex: 1,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.pill,
            paddingVertical: 12,
            alignItems: "center",
        },
        modeChipActive: {
            backgroundColor: theme.colors.accentSoft,
            borderColor: theme.colors.accentSoft,
        },
        modeChipText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
        },
        modeChipTextActive: {
            color: theme.colors.accent,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        progressBlock: {
            gap: theme.spacing.md,
        },
        progressValue: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        pageInputs: {
            gap: theme.spacing.md,
        },
        inputGroup: {
            gap: 8,
        },
        input: {
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
        },
        textArea: {
            minHeight: 120,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
        },
        footer: {
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.sm,
            paddingBottom: theme.spacing.lg,
            backgroundColor: theme.colors.background,
        },
        saveButton: {
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.pill,
            paddingVertical: 14,
            alignItems: "center",
            justifyContent: "center",
        },
        saveButtonDisabled: {
            opacity: 0.7,
        },
        saveButtonText: {
            color: "#FFFFFF",
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        coverImage: {
            width: 90,
            height: 130,
            borderRadius: 14,
            backgroundColor: theme.colors.accentSoft,
        },
    });
}