import Slider from "@react-native-community/slider";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
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
import { StarRatingInput } from "@/src/components/StarRatingInput";
import { t } from "@/src/i18n";
import {
    fetchSingleUserBookFromSupabase,
    updateUserBookInSupabase,
} from "@/src/services/supabaseUserBooks";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import { Book, BookStatus, ProgressMode } from "@/src/types/book";
import { getBookStatusLabel } from "@/src/utils/bookStatus";

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

export default function BookDetailScreen() {
    const theme = useAppTheme();
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
                        (foundBook.currentPage !== undefined || foundBook.totalPages !== undefined
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
            } finally {
                setIsLoading(false);
            }
        }

        loadBook();
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
            router.back();
        } catch (error) {
            console.error("Fout bij opslaan van boekdetails:", error);
        } finally {
            setIsSaving(false);
        }
    }

    const statusOptions: BookStatus[] = ["toRead", "reading", "finished", "dnf"];

    if (isLoading) {
        return (
            <SafeAreaView style={styles.safeArea} edges={["top"]}>
                <AppHeader />
                <View style={styles.screen}>
                    <Text style={styles.stateText}>Laden...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!book) {
        return (
            <SafeAreaView style={styles.safeArea} edges={["top"]}>
                <AppHeader />
                <View style={styles.screen}>
                    <View style={styles.pageHeader}>
                        <Pressable onPress={() => router.back()} style={styles.backButton}>
                            <Feather name="chevron-left" size={22} color={theme.colors.accent} />
                        </Pressable>

                        <Text style={styles.pageTitle}>{t("bookDetail.title")}</Text>
                    </View>

                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>{t("bookDetail.notFoundTitle")}</Text>
                        <Text style={styles.sectionText}>{t("bookDetail.notFoundText")}</Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <AppHeader />

            <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
                <View style={styles.pageHeader}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <Feather name="chevron-left" size={22} color={theme.colors.accent} />
                    </Pressable>

                    <Text style={styles.pageTitle}>{t("bookDetail.title")}</Text>
                </View>

                <View style={styles.sectionCard}>
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

                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>{t("bookDetail.status")}</Text>

                    <View style={styles.chipRow}>
                        {statusOptions.map((option) => {
                            const isActive = status === option;

                            return (
                                <Pressable
                                    key={option}
                                    onPress={() => setStatus(option)}
                                    style={[styles.chip, isActive && styles.chipActive]}
                                >
                                    <Text
                                        style={[styles.chipText, isActive && styles.chipTextActive]}
                                    >
                                        {getBookStatusLabel(option)}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>

                {status === "reading" ? (
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>{t("bookDetail.progress")}</Text>

                        <Text style={styles.fieldLabel}>{t("bookDetail.progressType")}</Text>

                        <View style={styles.modeRow}>
                            <Pressable
                                onPress={() => setProgressMode("percentage")}
                                style={[
                                    styles.modeChip,
                                    progressMode === "percentage" && styles.modeChipActive,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.modeChipText,
                                        progressMode === "percentage" && styles.modeChipTextActive,
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
                                        progressMode === "pages" && styles.modeChipTextActive,
                                    ]}
                                >
                                    {t("bookDetail.pages")}
                                </Text>
                            </Pressable>
                        </View>

                        {progressMode === "percentage" ? (
                            <View style={styles.progressBlock}>
                                <Text style={styles.progressValue}>{Math.round(progress)}%</Text>

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
                                    <Text style={styles.fieldLabel}>{t("bookDetail.currentPage")}</Text>
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
                                    <Text style={styles.fieldLabel}>{t("bookDetail.totalPages")}</Text>
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

                {(status === "finished" || status === "dnf") ? (
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>{t("bookDetail.reviewTitle")}</Text>

                        {status === "dnf" ? (
                            <View style={styles.inputGroup}>
                                <Text style={styles.fieldLabel}>{t("bookDetail.dnfReason")}</Text>
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
                            <Text style={styles.fieldLabel}>{t("bookDetail.reviewTitle")}</Text>
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

                <Pressable
                    style={styles.saveButton}
                    onPress={handleSave}
                    disabled={isSaving}
                >
                    <Text style={styles.saveButtonText}>
                        {isSaving ? "..." : t("bookDetail.save")}
                    </Text>
                </Pressable>
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
            gap: theme.spacing.lg,
        },
        pageHeader: {
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
        pageTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        stateText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            padding: theme.spacing.lg,
        },
        sectionCard: {
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.lg,
            padding: theme.spacing.lg,
            gap: theme.spacing.md,
        },
        sectionTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        sectionText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
        },
        bookTopRow: {
            flexDirection: "row",
            gap: theme.spacing.lg,
            alignItems: "center",
        },
        coverImage: {
            width: 90,
            height: 130,
            borderRadius: 14,
            backgroundColor: theme.colors.accentSoft,
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
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 12,
            paddingVertical: 10,
        },
        chipActive: {
            backgroundColor: theme.colors.accentSoft,
            borderColor: theme.colors.accentSoft,
        },
        chipText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
        },
        chipTextActive: {
            color: theme.colors.accent,
            fontWeight: theme.typography.fontWeight.semibold,
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
            backgroundColor: theme.colors.card,
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
            backgroundColor: theme.colors.card,
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
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
        },
        saveButton: {
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.pill,
            paddingVertical: 14,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: theme.spacing.lg,
        },
        saveButtonText: {
            color: "#FFFFFF",
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
    });
}