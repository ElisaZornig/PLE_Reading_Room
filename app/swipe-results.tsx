import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BookCover } from "@/src/components/BookCover";
import { ScreenTopBar } from "@/src/components/ScreenTopBar";
import {
    fetchClubSwipeState,
    fetchSwipeResults,
    resetClubSwipeSession,
    type SwipeResult,
} from "@/src/services/supabaseSwipe";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import { showAppAlert, showAppConfirm } from "@/src/utils/appAlert";
import {t} from "@/src/i18n";
import {ChoiceStepper} from "@/src/components/ChoiceStepper";
import {setCurrentClubBookAndAddToTbr} from "@/src/services/supabaseClub";
import {triggerRefresh} from "@/src/utils/refreshEvents";

export default function SwipeResultsScreen() {
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

    const [results, setResults] = useState<SwipeResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOwner, setIsOwner] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const winner = results[0];

    async function loadResults() {
        if (!sessionId) return;

        try {
            setIsLoading(true);

            if (clubId) {
                const swipeState = await fetchClubSwipeState(clubId);
                setIsOwner(swipeState.isOwner);
            }

            const data = await fetchSwipeResults(sessionId);
            setResults(data);
        } catch (error) {
            console.error("Error loading swipe results:", error);

            showAppAlert(
                t("swipeResults.loadFailedTitle"),
                error instanceof Error ? error.message : t("swipeResults.retry")
            );
        } finally {
            setIsLoading(false);
        }
    }

    useFocusEffect(
        useCallback(() => {
            void loadResults();
        }, [sessionId])
    );

    async function refreshResults() {
        if (!sessionId || isRefreshing) return;

        try {
            setIsRefreshing(true);
            const data = await fetchSwipeResults(sessionId);
            setResults(data);

            if (clubId) {
                const swipeState = await fetchClubSwipeState(clubId);
                setIsOwner(swipeState.isOwner);
            }
        } catch (error) {
            console.error("Error refreshing swipe results:", error);

            showAppAlert(
                t("swipeResults.loadFailedTitle"),
                error instanceof Error ? error.message : t("swipeResults.retry")
            );
        } finally {
            setIsRefreshing(false);
        }
    }

    async function handleReset() {
        if (!clubId) return;

        const confirmed = await showAppConfirm({
            title: t("swipeResults.resetTitle"),
            message: t("swipeResults.resetMessage"),
            confirmText: t("swipeResults.resetConfirm"),
            cancelText: t("swipeResults.resetCancel"),
        });

        if (!confirmed) return;

        try {
            await resetClubSwipeSession(clubId);

            router.replace({
                pathname: "/club",
                params: { clubId },
            });
        } catch (error) {
            console.error("Error resetting swipe session:", error);

            showAppAlert(
                t("swipeResults.resetFailedTitle"),
                error instanceof Error ? error.message : t("swipeResults.retry")
            );
        }
    }

    async function handleMakeCurrentBook(result: SwipeResult) {
        if (!clubId) return;

        const confirmed = await showAppConfirm({
            title: t("swipeResults.makeCurrentConfirmTitle"),
            message: t("swipeResults.makeCurrentConfirmMessage"),
            confirmText: t("swipeResults.makeCurrentConfirmButton"),
            cancelText: t("swipeResults.resetCancel"),
        });

        if (!confirmed) return;

        try {
            await setCurrentClubBookAndAddToTbr({
                clubId,
                bookId: result.bookId,
            });

            triggerRefresh("club", "books", "home");

            router.replace({
                pathname: "/club",
                params: { clubId },
            });
        } catch (error) {
            console.error("Error setting current book from swipe results:", error);

            showAppAlert(
                t("swipeResults.setCurrentFailedTitle"),
                error instanceof Error ? error.message : t("swipeResults.retry")
            );
        }
    }

    function renderResult({ item, index }: { item: SwipeResult; index: number }) {
        const isWinner = index === 0;
        const likePercentage =
            item.totalVotes > 0 ? Math.round((item.likes / item.totalVotes) * 100) : 0;

        return (
            <View style={[styles.resultCard, isWinner && styles.winnerCard]}>
                <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                </View>

                <BookCover
                    title={item.title}
                    cover={item.cover}
                    width={58}
                    height={86}
                    borderRadius={10}
                />

                <View style={styles.resultContent}>
                    <View style={styles.resultTitleRow}>
                        <Text style={styles.resultTitle} numberOfLines={2}>
                            {item.title}
                        </Text>

                        {isWinner ? (
                            <View style={styles.winnerBadge}>
                                <Text style={styles.winnerBadgeText}>{t("swipeResults.topMatch")}</Text>
                            </View>
                        ) : null}
                    </View>

                    <Text style={styles.resultAuthor} numberOfLines={1}>
                        {item.author}
                    </Text>

                    <View style={styles.voteRow}>
                        <View style={styles.votePill}>
                            <Feather name="heart" size={13} color={theme.colors.success} />
                            <Text style={styles.voteText}>
                                {item.likes} {t("swipeResults.likes")}
                            </Text>


                        </View>

                        <View style={styles.votePill}>
                            <Feather name="x" size={13} color={theme.colors.danger} />
                            <Text style={styles.voteText}>
                                {item.skips} {t("swipeResults.skips")}
                            </Text>
                        </View>

                        {item.totalVotes > 0 ? (
                            <Text style={styles.percentageText}>
                                {likePercentage}% {t("swipeResults.positive")}
                            </Text>
                        ) : null}
                    </View>
                        <Pressable
                            style={styles.makeCurrentButton}
                            onPress={() => handleMakeCurrentBook(item)}
                        >
                            <Text style={styles.makeCurrentButtonText}>
                                {t("swipeResults.makeCurrentBook")}
                            </Text>
                        </Pressable>
                </View>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <ScreenTopBar
                title={t("swipeResults.screenTitle")}
                right={
                    <Pressable
                        style={[
                            styles.refreshButton,
                            isRefreshing && styles.refreshButtonDisabled,
                        ]}
                        onPress={() => void refreshResults()}
                        disabled={isRefreshing}
                    >
                        <Feather name="refresh-cw" size={18} color={theme.colors.accent} />
                    </Pressable>
                }
            />
            <ChoiceStepper currentStep={4} />
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>{t("swipeResults.title")}</Text>
                    <Text style={styles.subtitle}>{t("swipeResults.subtitle")}</Text>
                </View>

                {isOwner ? (
                    <Pressable style={styles.resetSmallButton} onPress={handleReset}>
                        <Feather
                            name="rotate-ccw"
                            size={14}
                            color={theme.colors.danger}
                        />
                        <Text style={styles.resetSmallButtonText}>
                            {t("swipeResults.resetButton")}
                        </Text>
                    </Pressable>
                ) : null}

                {isLoading ? (
                    <View style={styles.stateCard}>
                        <Text style={styles.stateTitle}>{t("swipeResults.loading")}</Text>
                    </View>
                ) : results.length === 0 ? (
                    <View style={styles.stateCard}>
                        <Text style={styles.stateTitle}>{t("swipeResults.emptyTitle")}</Text>
                        <Text style={styles.stateText}>{t("swipeResults.emptyText")}</Text>
                    </View>
                ) : (
                    <>


                        <FlatList
                            data={results}
                            keyExtractor={(item) => item.optionId}
                            renderItem={renderResult}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.listContent}
                        />
                        <Pressable
                            style={styles.homeButton}
                            onPress={() =>
                                router.replace({
                                    pathname: "/club",
                                    params: { clubId: clubId ?? "" },
                                })
                            }
                        >
                            <Text style={styles.homeButtonText}>{t("swipeResults.backToClub")}</Text>
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
        container: {
            flex: 1,
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.md,
            paddingBottom: theme.spacing.lg,
        },
        header: {
            gap: theme.spacing.xs,
            marginBottom: theme.spacing.md,
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
        winnerSummary: {
            backgroundColor: theme.colors.accentSoft,
            borderRadius: theme.radius.lg,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.md,
            borderWidth: 1,
            borderColor: theme.colors.accent,
        },
        winnerLabel: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
            marginBottom: 4,
        },
        winnerTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.bold,
        },
        winnerText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            marginTop: 4,
        },
        listContent: {
            gap: theme.spacing.sm,
            paddingBottom: theme.spacing.md,
        },
        resultCard: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.md,
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
        },
        winnerCard: {
            borderColor: theme.colors.accent,
        },
        rankBadge: {
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: theme.colors.accentSoft,
            alignItems: "center",
            justifyContent: "center",
        },
        rankText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.bold,
        },
        resultContent: {
            flex: 1,
            gap: 5,
        },
        resultTitleRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.xs,
            flexWrap: "wrap",
        },
        resultTitle: {
            flex: 1,
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.md,
            fontWeight: theme.typography.fontWeight.bold,
        },
        resultAuthor: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
        },
        winnerBadge: {
            backgroundColor: theme.colors.accentSoft,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 8,
            paddingVertical: 3,
        },
        winnerBadgeText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        voteRow: {
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
            gap: theme.spacing.xs,
            marginTop: 2,
        },
        votePill: {
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 8,
            paddingVertical: 4,
        },
        voteText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        percentageText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
        },
        resetButton: {
            borderWidth: 1,
            borderColor: theme.colors.danger,
            borderRadius: theme.radius.lg,
            paddingVertical: theme.spacing.md,
            alignItems: "center",
            marginTop: theme.spacing.sm,
        },
        resetButtonText: {
            color: theme.colors.danger,
            fontSize: theme.typography.fontSize.md,
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
        refreshButton: {
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
        },
        refreshButtonDisabled: {
            opacity: 0.6,
        },
        resetSmallButton: {
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.xs,
            marginBottom: theme.spacing.sm,
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.danger,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: 8,
        },

        resetSmallButtonText: {
            color: theme.colors.danger,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        homeButton: {
            marginTop: theme.spacing.sm,
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            paddingVertical: theme.spacing.md,
            alignItems: "center",
            justifyContent: "center",
        },

        homeButtonText: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },

        makeCurrentButton: {
            alignSelf: "flex-start",
            marginTop: theme.spacing.xs,
            backgroundColor: theme.colors.accentSoft,
            borderRadius: theme.radius.pill,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: 7,
            borderWidth: 1,
            borderColor: theme.colors.border,
        },

        makeCurrentButtonText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
        },
    });
}