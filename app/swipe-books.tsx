import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {useCallback, useMemo, useRef, useState} from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Swiper from "react-native-deck-swiper";

import { BookCover } from "@/src/components/BookCover";
import { ScreenTopBar } from "@/src/components/ScreenTopBar";
import {
    fetchSwipeBooks,
    saveSwipeVote,
    type SwipeBookOption,
} from "@/src/services/supabaseSwipe";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import { showAppAlert } from "@/src/utils/appAlert";
import {t} from "@/src/i18n";
import {ChoiceStepper} from "@/src/components/ChoiceStepper";
import {spacing} from "@/src/theme/spacing";

export default function SwipeBooksScreen() {
    const theme = useAppTheme();
    const styles = createStyles(theme);
    const params = useLocalSearchParams();

    const clubId = useMemo(() => {
        const value = params.clubId;
        return Array.isArray(value) ? value[0] : value;
    }, [params.clubId]);

    const sessionId = useMemo(() => {
        const value = params.sessionId;
        return Array.isArray(value) ? value[0] : value;
    }, [params.sessionId]);

    const [books, setBooks] = useState<SwipeBookOption[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingVote, setIsSavingVote] = useState(false);
    const swiperRef = useRef<any>(null);

    const currentBook = books[currentIndex];
    const totalBooks = books.length;
    const progressText =
        totalBooks > 0
            ? `${currentIndex + 1} ${t("swipeBooks.progressOf")} ${totalBooks}`
            : "";

    async function loadSwipeBooks() {
        if (!clubId || !sessionId) {
            showAppAlert(
                t("swipeBooks.roundNotFoundTitle"),
                t("swipeBooks.roundNotFoundMessage")
            );            router.replace({
                pathname: "/club",
                params: { clubId: clubId ?? "" },
            });
            return;
        }

        try {
            setIsLoading(true);
            setCurrentIndex(0);

            const data = await fetchSwipeBooks(sessionId);
            setBooks(data);

            if (data.length === 0) {
                router.replace({
                    pathname: "/swipe-results",
                    params: { clubId, sessionId },
                });
            }
        } catch (error) {
            console.error("Error loading swipe books:", error);

            showAppAlert(
                t("swipeBooks.loadFailedTitle"),
                error instanceof Error ? error.message : t("swipeResults.retry")
            );
        } finally {
            setIsLoading(false);
        }
    }

    useFocusEffect(
        useCallback(() => {
            void loadSwipeBooks();
        }, [clubId, sessionId])
    );

    async function handleSwipeVote(cardIndex: number, vote: "like" | "skip") {
        const swipedBook = books[cardIndex];

        if (!swipedBook || !clubId || !sessionId || isSavingVote) {
            return;
        }

        const nextIndex = cardIndex + 1;

        // UI meteen doorzetten, zodat het vorige boek niet blijft hangen
        setCurrentIndex(nextIndex);

        try {
            setIsSavingVote(true);

            await saveSwipeVote({
                sessionId,
                optionId: swipedBook.optionId,
                vote,
            });

            if (nextIndex >= books.length) {
                router.replace({
                    pathname: "/swipe-results",
                    params: { clubId, sessionId },
                });
            }
        } catch (error) {
            console.error("Error saving swipe vote:", error);

            showAppAlert(
                t("swipeBooks.saveVoteFailedTitle"),
                error instanceof Error ? error.message : t("swipeResults.retry")
            );

            // Bij fout even opnieuw laden zodat de state weer klopt
            void loadSwipeBooks();
        } finally {
            setIsSavingVote(false);
        }
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <ScreenTopBar title={t("swipeBooks.screenTitle")} />
            <ChoiceStepper currentStep={3} />
            <View
                style={styles.container}
            >
                <View style={styles.header}>
                    <Text style={styles.title}>{t("swipeBooks.title")}</Text>
                    <Text style={styles.subtitle}>{t("swipeBooks.subtitle")}</Text>
                </View>

                {isLoading ? (
                    <View style={styles.stateCard}>
                        <Text style={styles.stateTitle}>{t("swipeBooks.loading")}</Text>
                    </View>
                ) : !currentBook ? (
                    <View style={styles.stateCard}>
                        <Text style={styles.stateTitle}>{t("swipeBooks.completedTitle")}</Text>
                        <Text style={styles.stateText}>{t("swipeBooks.completedText")}</Text>

                        <Pressable
                            style={styles.primaryButton}
                            onPress={() =>
                                router.replace({
                                    pathname: "/swipe-results",
                                    params: {
                                        clubId: clubId ?? "",
                                        sessionId: sessionId ?? "",
                                    },
                                })
                            }
                        >
                            <Text style={styles.primaryButtonText}>{t("swipeBooks.viewResults")}</Text>
                        </Pressable>
                    </View>
                ) : (
                    <>
                        <Text style={styles.progressText}>{progressText}</Text>

                        <View style={styles.swiperWrap}>
                            <Swiper
                                ref={swiperRef}
                                cards={books}
                                cardIndex={currentIndex}
                                renderCard={(book) => {
                                    if (!book) {
                                        return (
                                            <View style={styles.stateCard}>
                                                <Text style={styles.stateTitle}>{t("swipeBooks.noBookFound")}</Text>
                                            </View>
                                        );
                                    }

                                    return (
                                        <View style={styles.bookCard}>
                                            <View style={styles.coverShell}>
                                                <BookCover
                                                    title={book.title}
                                                    cover={book.cover}
                                                    width={110}
                                                    height={160}
                                                    borderRadius={16}
                                                />
                                            </View>

                                            <View style={styles.bookInfo}>
                                                <Text style={styles.bookTitle} numberOfLines={2}>
                                                    {book.title}
                                                </Text>

                                                <Text style={styles.bookAuthor} numberOfLines={1}>
                                                    {book.author}
                                                </Text>

                                                {/*{book.firstPublishYear ? (*/}
                                                {/*    <View style={styles.metaPill}>*/}
                                                {/*        <Text style={styles.metaPillText}>*/}
                                                {/*            {book.firstPublishYear}*/}
                                                {/*        </Text>*/}
                                                {/*    </View>*/}
                                                {/*) : null}*/}
                                            </View>

                                            <View style={styles.descriptionBox}>
                                                <Text style={styles.descriptionLabel}>{t("swipeBooks.descriptionLabel")}</Text>

                                                {book.description ? (
                                                    <Text style={styles.bookDescription} numberOfLines={3}>
                                                        {book.description}
                                                    </Text>
                                                ) : (
                                                    <Text style={styles.bookDescriptionMuted} numberOfLines={2}>
                                                        {t("swipeBooks.noDescription")}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>
                                    );
                                }}
                                onSwipedLeft={(cardIndex) => handleSwipeVote(cardIndex, "skip")}
                                onSwipedRight={(cardIndex) => handleSwipeVote(cardIndex, "like")}
                                disableTopSwipe
                                disableBottomSwipe
                                stackSize={3}
                                backgroundColor="transparent"
                                containerStyle={styles.swiperContainer}
                                cardStyle={styles.swiperCard}
                                animateOverlayLabelsOpacity
                            />
                        </View>

                        <View style={styles.actions}>
                            <Pressable
                                style={[styles.actionButton, styles.skipButton]}
                                onPress={() => swiperRef.current?.swipeLeft()}
                                disabled={isSavingVote}
                            >
                                <Feather name="x" size={22} color={theme.colors.danger} />
                                <Text style={styles.skipButtonText}>{t("swipeBooks.skip")}</Text>
                            </Pressable>

                            <Pressable
                                style={[styles.actionButton, styles.likeButton]}
                                onPress={() => swiperRef.current?.swipeRight()}
                                disabled={isSavingVote}
                            >
                                <Feather name="heart" size={22} color={theme.colors.success} />
                                <Text style={styles.likeButtonText}>{t("swipeBooks.like")}</Text>
                            </Pressable>
                        </View>
                    </>
                )}
            </View>
        </SafeAreaView>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        descriptionBox: {
            width: "100%",
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            marginTop: theme.spacing.md,
        },

        descriptionLabel: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
            marginBottom: 6,
        },

        bookDescription: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
        },

        bookDescriptionMuted: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
            opacity: 0.7,
        },

        coverShell: {
            backgroundColor: theme.colors.accentSoft,
            borderRadius: 24,
            padding: theme.spacing.sm,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.12,
            shadowRadius: 14,
            elevation: 4,
        },

        bookInfo: {
            alignItems: "center",
            gap: theme.spacing.xs,
            width: "100%",
        },

        bookTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.bold,
            textAlign: "center",
            lineHeight: 28,
        },

        bookAuthor: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.md,
            textAlign: "center",
        },

        metaPill: {
            marginTop: theme.spacing.xs,
            backgroundColor: theme.colors.accentSoft,
            borderRadius: theme.radius.pill,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: 5,
        },

        metaPillText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        swiperWrap: {
            height: 420,
            marginBottom: theme.spacing.lg,
        },
        swiperCard: {
            top: 0,
            left: 0,
            right: 0,
        },
        bookCard: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.xl,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.xl,
            alignItems: "center",
            justifyContent: "center",
            gap: theme.spacing.sm,
            minHeight: 300,
        },
        safeArea: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        container: {
            flex: 1,
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.md,
            paddingBottom: theme.spacing.lg,
        },
        header: {
            gap: theme.spacing.sm,
            marginBottom: theme.spacing.xl,
        },
        title: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.xxl,
            fontWeight: theme.typography.fontWeight.bold,
        },
        subtitle: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
        },
        progressText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
            textAlign: "center",
            marginBottom: theme.spacing.md,
        },
        coverWrap: {
            marginBottom: theme.spacing.md,
        },
        bookMeta: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
        },
        actions: {
            flexDirection: "row",
            gap: theme.spacing.md,
            marginBottom: theme.spacing.md
        },
        actionButton: {
            flex: 1,
            borderRadius: theme.radius.lg,
            paddingVertical: theme.spacing.md,
            alignItems: "center",
            justifyContent: "center",
            gap: theme.spacing.xs,
            borderWidth: 1,
        },
        skipButton: {
            backgroundColor: theme.colors.dangerSoft,
            borderColor: theme.colors.dangerBorder,
        },
        likeButton: {
            backgroundColor: theme.colors.successSoft,
            borderColor: theme.colors.success,
        },
        skipButtonText: {
            color: theme.colors.danger,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        likeButtonText: {
            color: theme.colors.success,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        stateCard: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.lg,
            alignItems: "center",
            gap: theme.spacing.sm,
        },
        stateTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.bold,
            textAlign: "center",
        },
        stateText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
            textAlign: "center",
        },
        primaryButton: {
            marginTop: theme.spacing.md,
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.lg,
            paddingVertical: theme.spacing.md,
            paddingHorizontal: theme.spacing.lg,
            alignItems: "center",
        },
        primaryButtonText: {
            color: theme.colors.card,
            fontSize: theme.typography.fontSize.md,
            fontWeight: theme.typography.fontWeight.semibold,
        },

        swiperContainer: {
            backgroundColor: "transparent",
        },

    });
}