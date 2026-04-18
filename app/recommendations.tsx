import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    FlatList,
    Image,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LottieView from "lottie-react-native";

import { AppHeader } from "@/src/components/AppHeader";
import { t } from "@/src/i18n";
import {
    addRecommendationToClubShortlist,
    generateClubRecommendations,
    type ClubRecommendation,
} from "@/src/services/clubRecommendations";
import {
    type ClubShortlistItem,
    fetchClubShortlist,
    removeBookFromClubShortlist,
} from "@/src/services/supabaseClubShortlist";
import { createPageStyles } from "@/src/styles/pageStyles";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import { subscribeToRefresh } from "@/src/utils/refreshEvents";

type RecommendationSessionCache = {
    hasLoaded: boolean;
    recommendations: ClubRecommendation[];
    seenWorkIds: string[];
    shortlistItems: ClubShortlistItem[];
    shortlistCount: number;
};

const recommendationCacheByClub: Record<string, RecommendationSessionCache> = {};

function getRecommendationCache(clubId: string): RecommendationSessionCache {
    if (!recommendationCacheByClub[clubId]) {
        recommendationCacheByClub[clubId] = {
            hasLoaded: false,
            recommendations: [],
            seenWorkIds: [],
            shortlistItems: [],
            shortlistCount: 0,
        };
    }

    return recommendationCacheByClub[clubId];
}

export default function RecommendationsScreen() {
    const theme = useAppTheme();
    const pageStyles = createPageStyles(theme);
    const styles = createStyles(theme);
    const params = useLocalSearchParams();

    const clubId = useMemo(() => {
        const value = params.clubId;
        return Array.isArray(value) ? value[0] : value;
    }, [params.clubId]);

    const resolvedClubId = clubId ?? "";

    const [shortlistCount, setShortlistCount] = useState(0);
    const [shortlistItems, setShortlistItems] = useState<ClubShortlistItem[]>([]);
    const [recommendations, setRecommendations] = useState<ClubRecommendation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [savingWorkId, setSavingWorkId] = useState<string | null>(null);
    const [selectedRecommendation, setSelectedRecommendation] =
        useState<ClubRecommendation | null>(null);
    const [seenWorkIds, setSeenWorkIds] = useState<string[]>([]);

    const shortlistByOpenLibraryWorkId = new Map(
        shortlistItems
            .filter((item) => item.openLibraryWorkId)
            .map((item) => [item.openLibraryWorkId, item])
    );

    const updateSessionCache = useCallback(
        (partial: Partial<RecommendationSessionCache>) => {
            if (!resolvedClubId) return;

            recommendationCacheByClub[resolvedClubId] = {
                ...getRecommendationCache(resolvedClubId),
                ...partial,
            };
        },
        [resolvedClubId]
    );

    const loadShortlistState = useCallback(async () => {
        try {
            const items = await fetchClubShortlist(resolvedClubId);
            setShortlistItems(items);
            setShortlistCount(items.length);

            updateSessionCache({
                shortlistItems: items,
                shortlistCount: items.length,
            });
        } catch (error) {
            console.error("Error loading shortlist state:", error);
        }
    }, [resolvedClubId, updateSessionCache]);

    const loadInitialRecommendations = useCallback(async () => {
        if (!resolvedClubId) {
            setIsLoading(false);
            return;
        }

        const cache = getRecommendationCache(resolvedClubId);

        if (cache.hasLoaded) {
            setRecommendations(cache.recommendations);
            setSeenWorkIds(cache.seenWorkIds);
            setShortlistItems(cache.shortlistItems);
            setShortlistCount(cache.shortlistCount);
            setIsLoading(false);

            void loadShortlistState();
            return;
        }

        try {
            setIsLoading(true);

            const data = await generateClubRecommendations({
                clubId: resolvedClubId,
                limit: 5,
                excludeWorkIds: [],
            });

            const nextSeenWorkIds = [...new Set(data.map((item) => item.openLibraryWorkId))];

            setRecommendations(data);
            setSeenWorkIds(nextSeenWorkIds);

            updateSessionCache({
                hasLoaded: true,
                recommendations: data,
                seenWorkIds: nextSeenWorkIds,
            });

            await loadShortlistState();
        } catch (error) {
            console.error("Error loading recommendations:", error);
            Alert.alert(
                t("recommendations.loadErrorTitle"),
                t("recommendations.loadErrorText")
            );
        } finally {
            setIsLoading(false);
        }
    }, [resolvedClubId, loadShortlistState, updateSessionCache]);

    const refreshRecommendations = useCallback(async () => {
        if (!resolvedClubId) return;

        try {
            setIsRefreshing(true);

            const data = await generateClubRecommendations({
                clubId: resolvedClubId,
                limit: 5,
                excludeWorkIds: [],
            });

            const nextSeenWorkIds = [...new Set(data.map((item) => item.openLibraryWorkId))];

            setRecommendations(data);
            setSeenWorkIds(nextSeenWorkIds);

            updateSessionCache({
                hasLoaded: true,
                recommendations: data,
                seenWorkIds: nextSeenWorkIds,
            });

            await loadShortlistState();
        } catch (error) {
            console.error("Error refreshing recommendations:", error);
            Alert.alert(
                t("recommendations.refreshErrorTitle"),
                t("recommendations.refreshErrorText")
            );
        } finally {
            setIsRefreshing(false);
        }
    }, [resolvedClubId, loadShortlistState, updateSessionCache]);

    const loadMoreRecommendations = useCallback(async () => {
        if (!resolvedClubId) return;

        try {
            setIsLoadingMore(true);

            const data = await generateClubRecommendations({
                clubId: resolvedClubId,
                limit: 5,
                excludeWorkIds: seenWorkIds,
            });

            if (data.length === 0) {
                Alert.alert(
                    t("recommendations.noMoreTitle"),
                    t("recommendations.noMoreText")
                );
                return;
            }

            const nextSeenWorkIds = [
                ...new Set([
                    ...seenWorkIds,
                    ...data.map((item) => item.openLibraryWorkId),
                ]),
            ];

            setRecommendations(data);
            setSeenWorkIds(nextSeenWorkIds);

            updateSessionCache({
                hasLoaded: true,
                recommendations: data,
                seenWorkIds: nextSeenWorkIds,
            });

            await loadShortlistState();
        } catch (error) {
            console.error("Error loading more recommendations:", error);
            Alert.alert(
                t("recommendations.refreshErrorTitle"),
                t("recommendations.refreshErrorText")
            );
        } finally {
            setIsLoadingMore(false);
        }
    }, [resolvedClubId, seenWorkIds, loadShortlistState, updateSessionCache]);

    useEffect(() => {
        void loadInitialRecommendations();

        const unsubscribe = subscribeToRefresh("recommendations", () => {
            void refreshRecommendations();
        });

        return unsubscribe;
    }, [loadInitialRecommendations, refreshRecommendations]);

    async function handleAddToShortlist(item: ClubRecommendation) {
        try {
            setSavingWorkId(item.openLibraryWorkId);

            await addRecommendationToClubShortlist({
                clubId: resolvedClubId,
                recommendation: item,
            });
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : t("recommendations.addErrorText");
            Alert.alert(t("recommendations.addErrorTitle"), message);
        } finally {
            setSavingWorkId(null);
            await loadShortlistState();
        }
    }

    function handleRemoveFromShortlist(optionId: string) {
        if (Platform.OS === "web") {
            const confirmed = globalThis.confirm?.(
                t("recommendations.removeConfirmText")
            );

            if (confirmed) {
                void (async () => {
                    try {
                        setSavingWorkId(optionId);
                        await removeBookFromClubShortlist(optionId);
                        await loadShortlistState();
                    } catch (error) {
                        console.error("Error removing from shortlist:", error);
                        globalThis.alert?.(t("recommendations.removeErrorText"));
                    } finally {
                        setSavingWorkId(null);
                    }
                })();
            }

            return;
        }

        Alert.alert(
            t("recommendations.removeConfirmTitle"),
            t("recommendations.removeConfirmText"),
            [
                {
                    text: t("common.cancel"),
                    style: "cancel",
                },
                {
                    text: t("common.delete"),
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setSavingWorkId(optionId);
                            await removeBookFromClubShortlist(optionId);
                            await loadShortlistState();
                        } catch (error) {
                            console.error("Error removing from shortlist:", error);
                            Alert.alert(
                                t("recommendations.removeErrorTitle"),
                                t("recommendations.removeErrorText")
                            );
                        } finally {
                            setSavingWorkId(null);
                        }
                    },
                },
            ]
        );
    }

    return (
        <SafeAreaView style={pageStyles.safeArea} edges={["top"]}>
            <AppHeader />

            <View style={pageStyles.screen}>
                <View style={styles.header}>
                    <View style={styles.headerTopRow}>
                        <View style={styles.titleRow}>
                            <Pressable style={styles.backButton} onPress={() => router.back()}>
                                <Feather name="chevron-left" size={22} color={theme.colors.accent} />
                            </Pressable>

                            <View style={pageStyles.pageHeader}>
                                <Text style={pageStyles.pageTitle}>
                                    {t("recommendations.title")}
                                </Text>
                            </View>
                        </View>

                        <Pressable
                            style={[
                                styles.refreshButton,
                                isRefreshing && styles.refreshButtonDisabled,
                            ]}
                            onPress={() => void refreshRecommendations()}
                            disabled={isRefreshing}
                        >
                            <Feather name="refresh-cw" size={18} color={theme.colors.accent} />
                        </Pressable>
                    </View>

                    <Text style={pageStyles.pageSubtitle}>
                        {t("recommendations.subtitle")}
                    </Text>

                    {isRefreshing ? (
                        <Text style={styles.refreshingText}>
                            {t("recommendations.refreshing")}
                        </Text>
                    ) : null}
                </View>

                {isLoading ? (
                    <View style={styles.stateWrapper}>
                        <LottieView
                            source={require("@/assets/animations/loading-book.json")}
                            autoPlay
                            loop
                            style={{ width: 200, height: 200 }}
                        />
                    </View>
                ) : recommendations.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>
                            {t("recommendations.emptyTitle")}
                        </Text>
                        <Text style={styles.emptyText}>
                            {t("recommendations.emptyText")}
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={recommendations}
                        keyExtractor={(item) => item.openLibraryWorkId}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                        renderItem={({ item, index }) => {
                            const isSaving = savingWorkId === item.openLibraryWorkId;
                            const shortlistItem = item.openLibraryWorkId
                                ? shortlistByOpenLibraryWorkId.get(item.openLibraryWorkId)
                                : undefined;

                            const isAdded = !!shortlistItem;

                            return (
                                <Pressable
                                    style={styles.card}
                                    onPress={() => setSelectedRecommendation(item)}
                                >
                                    <View style={styles.cardTopRow}>
                                        <View style={styles.rankBadge}>
                                            <Text style={styles.rankText}>#{index + 1}</Text>
                                        </View>

                                        <Feather
                                            name="info"
                                            size={16}
                                            color={theme.colors.textMuted}
                                        />
                                    </View>

                                    <View style={styles.cardContent}>
                                        <View style={styles.bookRow}>
                                            {item.cover ? (
                                                <Image
                                                    source={{ uri: item.cover }}
                                                    style={styles.cover}
                                                />
                                            ) : (
                                                <View style={styles.coverFallback}>
                                                    <Text style={styles.coverFallbackText}>
                                                        {t("recommendations.bookFallback")}
                                                    </Text>
                                                </View>
                                            )}

                                            <View style={styles.bookInfo}>
                                                <Text style={styles.bookTitle}>{item.title}</Text>
                                                <Text style={styles.bookAuthor}>{item.author}</Text>

                                                {item.firstPublishYear ? (
                                                    <Text style={styles.bookMeta}>
                                                        {t("recommendations.firstPublished", {
                                                            year: item.firstPublishYear,
                                                        })}
                                                    </Text>
                                                ) : null}

                                                <View style={styles.genreRow}>
                                                    {item.matchedGenres.map((genre) => (
                                                        <View key={genre} style={styles.genreChip}>
                                                            <Text style={styles.genreChipText}>
                                                                {genre}
                                                            </Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        </View>

                                        <Pressable
                                            style={[
                                                styles.primaryButton,
                                                isSaving && styles.primaryButtonDisabled,
                                            ]}
                                            onPress={() =>
                                                isAdded && shortlistItem
                                                    ? handleRemoveFromShortlist(shortlistItem.optionId)
                                                    : handleAddToShortlist(item)
                                            }
                                            disabled={isSaving}
                                        >
                                            <Text style={styles.primaryButtonText}>
                                                {isAdded
                                                    ? t("recommendations.removeFromFinalPicks")
                                                    : isSaving
                                                        ? t("recommendations.adding")
                                                        : t("recommendations.saveToFinalPicks")}
                                            </Text>
                                        </Pressable>
                                    </View>
                                </Pressable>
                            );
                        }}
                        ListFooterComponent={
                            <Pressable
                                style={[
                                    styles.listFooterButton,
                                    isLoadingMore && styles.primaryButtonDisabled,
                                ]}
                                onPress={() => void loadMoreRecommendations()}
                                disabled={isLoadingMore}
                            >
                                <Text style={styles.listFooterButtonText}>
                                    {isLoadingMore
                                        ? t("recommendations.loadingMore")
                                        : t("recommendations.showFiveOthers")}
                                </Text>
                            </Pressable>
                        }
                    />
                )}

                {shortlistCount > 0 ? (
                    <Pressable
                        style={styles.finalPicksButton}
                        onPress={() =>
                            router.push({
                                pathname: "/choose-next-book",
                                params: { clubId: resolvedClubId },
                            })
                        }
                    >
                        <Text style={styles.finalPicksButtonText}>
                            {t("recommendations.viewFinalPicks", { count: shortlistCount })}
                        </Text>
                    </Pressable>
                ) : null}
            </View>

            <Modal
                visible={!!selectedRecommendation}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedRecommendation(null)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setSelectedRecommendation(null)}
                >
                    <Pressable style={styles.modalCard} onPress={() => {}}>
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.modalScrollContent}
                        >
                            {selectedRecommendation ? (
                                <>
                                    <View style={styles.modalHeader}>
                                        <Text style={styles.modalTitle}>
                                            {t("recommendations.bookDetails")}
                                        </Text>

                                        <Pressable
                                            onPress={() => setSelectedRecommendation(null)}
                                            style={styles.modalCloseButton}
                                        >
                                            <Feather
                                                name="x"
                                                size={20}
                                                color={theme.colors.textMuted}
                                            />
                                        </Pressable>
                                    </View>

                                    <View style={styles.modalBookRow}>
                                        {selectedRecommendation.cover ? (
                                            <Image
                                                source={{ uri: selectedRecommendation.cover }}
                                                style={styles.modalCover}
                                            />
                                        ) : (
                                            <View style={styles.modalCoverFallback}>
                                                <Text style={styles.coverFallbackText}>
                                                    {t("recommendations.bookFallback")}
                                                </Text>
                                            </View>
                                        )}

                                        <View style={styles.modalBookInfo}>
                                            <Text style={styles.modalBookTitle}>
                                                {selectedRecommendation.title}
                                            </Text>
                                            <Text style={styles.modalBookAuthor}>
                                                {selectedRecommendation.author}
                                            </Text>

                                            {selectedRecommendation.firstPublishYear ? (
                                                <Text style={styles.bookMeta}>
                                                    {t("recommendations.firstPublished", {
                                                        year: selectedRecommendation.firstPublishYear,
                                                    })}
                                                </Text>
                                            ) : null}
                                        </View>
                                    </View>

                                    {selectedRecommendation.description ? (
                                        <View style={styles.modalSection}>
                                            <Text style={styles.modalSectionLabel}>
                                                {t("recommendations.aboutThisBook")}
                                            </Text>
                                            <Text style={styles.modalSectionText}>
                                                {selectedRecommendation.description}
                                            </Text>
                                        </View>
                                    ) : null}

                                    <View style={styles.modalSection}>
                                        <Text style={styles.modalSectionLabel}>
                                            {t("recommendations.whyThisFits")}
                                        </Text>
                                        <Text style={styles.modalSectionText}>
                                            {selectedRecommendation.reason}
                                        </Text>
                                    </View>

                                    <View style={styles.genreRow}>
                                        {selectedRecommendation.matchedGenres.map((genre) => (
                                            <View key={genre} style={styles.genreChip}>
                                                <Text style={styles.genreChipText}>{genre}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </>
                            ) : null}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        header: {
            marginBottom: theme.spacing.lg,
            gap: theme.spacing.sm,
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.lg,
        },
        headerTopRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: theme.spacing.md,
        },
        titleRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.xs,
            flex: 1,
        },
        backButton: {
            width: 32,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
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
        refreshingText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
        },
        stateWrapper: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
        },
        emptyCard: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            gap: theme.spacing.sm,
            marginHorizontal: theme.spacing.lg,
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
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.xl,
        },
        card: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            gap: theme.spacing.md,
        },
        rankBadge: {
            alignSelf: "flex-start",
            backgroundColor: theme.colors.accentSoft,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 10,
            paddingVertical: 4,
        },
        rankText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        cardContent: {
            gap: theme.spacing.md,
        },
        bookRow: {
            flexDirection: "row",
            gap: theme.spacing.md,
            alignItems: "flex-start",
        },
        cover: {
            width: 64,
            height: 96,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.surface,
        },
        coverFallback: {
            width: 64,
            height: 96,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.surface,
            alignItems: "center",
            justifyContent: "center",
        },
        coverFallbackText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
        },
        bookInfo: {
            flex: 1,
            gap: 6,
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
        genreRow: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: theme.spacing.xs,
            marginTop: theme.spacing.xs,
        },
        genreChip: {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderWidth: 1,
            borderColor: theme.colors.border,
        },
        genreChipText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
        },
        primaryButton: {
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.pill,
            paddingVertical: 12,
            alignItems: "center",
            justifyContent: "center",
        },
        primaryButtonDisabled: {
            opacity: 0.7,
        },
        primaryButtonText: {
            color: "#FFFFFF",
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        bookMeta: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.35)",
            justifyContent: "center",
            padding: theme.spacing.lg,
        },
        modalCard: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.xl,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            gap: theme.spacing.md,
            maxHeight: "80%",
        },
        modalHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
        },
        modalTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        modalCloseButton: {
            width: 32,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
        },
        modalBookRow: {
            flexDirection: "row",
            gap: theme.spacing.md,
            alignItems: "flex-start",
        },
        modalCover: {
            width: 84,
            height: 124,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.surface,
        },
        modalCoverFallback: {
            width: 84,
            height: 124,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.surface,
            alignItems: "center",
            justifyContent: "center",
        },
        modalBookInfo: {
            flex: 1,
            gap: 6,
        },
        modalBookTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        modalBookAuthor: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
        },
        modalSection: {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.sm,
            gap: 4,
        },
        modalSectionLabel: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        modalSectionText: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
        },
        modalScrollContent: {
            gap: theme.spacing.md,
            paddingBottom: theme.spacing.sm,
        },
        cardTopRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
        },
        finalPicksButton: {
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.pill,
            paddingVertical: 14,
            alignItems: "center",
            justifyContent: "center",
            marginTop: theme.spacing.md,
            marginHorizontal: theme.spacing.lg,
            marginBottom: theme.spacing.lg,
        },
        finalPicksButtonText: {
            color: "#FFFFFF",
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        listFooterButton: {
            width: "100%",
            backgroundColor: theme.colors.accentSoft,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.border,
            paddingVertical: 14,
            alignItems: "center",
            justifyContent: "center",
            marginTop: theme.spacing.md,
        },
        listFooterButtonText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
    });
}