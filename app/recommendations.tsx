import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    Alert,
    FlatList,
    Image, Modal, Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { AppHeader } from "@/src/components/AppHeader";
import {
    addRecommendationToClubShortlist,
    generateClubRecommendations,
    type ClubRecommendation,
} from "@/src/services/clubRecommendations";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import {
    ClubShortlistItem,
    fetchClubShortlist,
    fetchClubShortlistCount,
    removeBookFromClubShortlist
} from "@/src/services/supabaseClubShortlist";

export default function RecommendationsScreen() {
    const theme = useAppTheme();
    const styles = createStyles(theme);
    const params = useLocalSearchParams();
    const [shortlistCount, setShortlistCount] = useState(0);
    const [shortlistItems, setShortlistItems] = useState<ClubShortlistItem[]>([]);
    const [recommendations, setRecommendations] = useState<ClubRecommendation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [savingWorkId, setSavingWorkId] = useState<string | null>(null);
    const [addedWorkIds, setAddedWorkIds] = useState<string[]>([]);
    const [selectedRecommendation, setSelectedRecommendation] =
        useState<ClubRecommendation | null>(null);
    const [seenWorkIds, setSeenWorkIds] = useState<string[]>([]);

    async function loadShortlistCount() {
        try {
            const count = await fetchClubShortlistCount(clubId ?? "");
            setShortlistCount(count);
        } catch (error) {
            console.error("Error loading shortlist count:", error);
        }
    }
    async function loadShortlistState() {
        try {
            const items = await fetchClubShortlist(clubId ?? "");
            setShortlistItems(items);
            setShortlistCount(items.length);
        } catch (error) {
            console.error("Error loading shortlist state:", error);
        }
    }
    const shortlistByOpenLibraryWorkId = new Map(
        shortlistItems
            .filter((item) => item.openLibraryWorkId)
            .map((item) => [item.openLibraryWorkId, item])
    );


    const clubId = useMemo(() => {
        const value = params.clubId;
        return Array.isArray(value) ? value[0] : value;
    }, [params.clubId]);


    async function loadRecommendations(options?: { refresh?: boolean }) {
        try {
            setIsLoading(true);

            const excludeWorkIds = options?.refresh ? seenWorkIds : [];

            const data = await generateClubRecommendations({
                clubId: clubId ?? "",
                limit: 5,
                excludeWorkIds,
            });

            setRecommendations(data);
            await loadShortlistCount();
            await loadShortlistState();

            setSeenWorkIds((current) => {
                const merged = new Set([
                    ...current,
                    ...data.map((item) => item.openLibraryWorkId),
                ]);

                return [...merged];
            });
        } catch (error) {
            console.error("Error loading recommendations:", error);
            Alert.alert("Error", "Something went wrong while loading recommendations.");
        } finally {
            setIsLoading(false);
        }
    }
    useFocusEffect(
        useCallback(() => {
            loadRecommendations();
        }, [clubId])
    );

    async function handleAddToShortlist(item: ClubRecommendation) {
        try {
            setSavingWorkId(item.openLibraryWorkId);

            await addRecommendationToClubShortlist({
                clubId: clubId ?? "",
                recommendation: item,
            });

            setAddedWorkIds((current) =>
                current.includes(item.openLibraryWorkId)
                    ? current
                    : [...current, item.openLibraryWorkId]
            );
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Something went wrong while adding this book.";
            Alert.alert("Add to shortlist error", message);
        } finally {
            setSavingWorkId(null);
            await loadShortlistCount();
            await loadShortlistState();
        }
    }
    function handleRemoveFromShortlist(optionId: string) {
        if (Platform.OS === "web") {
            const confirmed = globalThis.confirm?.(
                "Do you want to remove this book from the shortlist?"
            );

            if (confirmed) {
                void (async () => {
                    try {
                        setSavingWorkId(optionId);

                        await removeBookFromClubShortlist(optionId);
                        await loadShortlistState();
                    } catch (error) {
                        console.error("Error removing from shortlist:", error);
                        globalThis.alert?.("Something went wrong while removing this book.");
                    } finally {
                        setSavingWorkId(null);
                    }
                })();
            }

            return;
        }

        Alert.alert(
            "Remove from shortlist",
            "Do you want to remove this book from the shortlist?",
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setSavingWorkId(optionId);

                            await removeBookFromClubShortlist(optionId);
                            await loadShortlistState();
                        } catch (error) {
                            console.error("Error removing from shortlist:", error);
                            Alert.alert(
                                "Remove from shortlist error",
                                "Something went wrong while removing this book."
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
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <AppHeader />

            <View style={styles.screen}>
                <View style={styles.header}>
                    <View style={styles.headerTopRow}>
                        <View style={styles.titleRow}>
                            <Pressable style={styles.backButton} onPress={() => router.back()}>
                                <Feather name="chevron-left" size={24} color={theme.colors.accent} />
                            </Pressable>

                            <Text style={styles.title}>Choose next book</Text>
                        </View>

                        <Pressable
                            style={styles.refreshButton}
                            onPress={() => loadRecommendations({ refresh: true })}
                        >
                            <Feather name="refresh-cw" size={16} color={theme.colors.accent} />
                            <Text style={styles.refreshButtonText}>Refresh</Text>
                        </Pressable>
                    </View>

                    <Text style={styles.subtitle}>
                        Start with your club’s Top 5, add favourites to the shortlist, and then make the final choice.
                    </Text>
                </View>

                {isLoading ? (
                    <View style={styles.stateWrapper}>
                        <Text style={styles.stateText}>Loading recommendations...</Text>
                    </View>
                ) : recommendations.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>No recommendations yet</Text>
                        <Text style={styles.emptyText}>
                            Add more books and genres to your members’ reading history first.
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

                                        <Feather name="info" size={16} color={theme.colors.textMuted} />
                                    </View>

                                    <View style={styles.cardContent}>
                                        <View style={styles.bookRow}>
                                            {item.cover ? (
                                                <Image source={{ uri: item.cover }} style={styles.cover} />
                                            ) : (
                                                <View style={styles.coverFallback}>
                                                    <Text style={styles.coverFallbackText}>Book</Text>
                                                </View>
                                            )}

                                            <View style={styles.bookInfo}>
                                                <Text style={styles.bookTitle}>{item.title}</Text>
                                                <Text style={styles.bookAuthor}>{item.author}</Text>

                                                {item.firstPublishYear ? (
                                                    <Text style={styles.bookMeta}>First published: {item.firstPublishYear}</Text>
                                                ) : null}

                                                <View style={styles.genreRow}>
                                                    {item.matchedGenres.map((genre) => (
                                                        <View key={genre} style={styles.genreChip}>
                                                            <Text style={styles.genreChipText}>{genre}</Text>
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
                                                    ? "Remove from shortlist"
                                                    : isSaving
                                                        ? "Adding..."
                                                        : "Add to shortlist"}
                                            </Text>
                                        </Pressable>
                                    </View>
                                </Pressable>
                            );
                        }}
                    />
                )}
                {shortlistCount > 0 ? (
                    <Pressable
                        style={styles.floatingShortlistButton}
                        onPress={() =>
                            router.push({
                                pathname: "/choose-next-book",
                                params: { clubId: clubId ?? "" },
                            })
                        }
                    >
                        <Text style={styles.floatingShortlistButtonText}>
                            View shortlist ({shortlistCount})
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
                                        <Text style={styles.modalTitle}>Book details</Text>

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
                                                <Text style={styles.coverFallbackText}>Book</Text>
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
                                                    First published: {selectedRecommendation.firstPublishYear}
                                                </Text>
                                            ) : null}
                                        </View>
                                    </View>

                                    {selectedRecommendation.description ? (
                                        <View style={styles.modalSection}>
                                            <Text style={styles.modalSectionLabel}>About this book</Text>
                                            <Text style={styles.modalSectionText}>
                                                {selectedRecommendation.description}
                                            </Text>
                                        </View>
                                    ) : null}

                                    <View style={styles.modalSection}>
                                        <Text style={styles.modalSectionLabel}>Why this fits</Text>
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

        title: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.xxl,
            fontWeight: theme.typography.fontWeight.bold,
            flexShrink: 1,
        },

        refreshButton: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: theme.colors.accentSoft,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderWidth: 1,
            borderColor: theme.colors.border,
        },

        refreshButtonText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },

        subtitle: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
            maxWidth: "92%",
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
            gap: theme.spacing.sm,
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
        reasonBox: {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.sm,
            gap: 4,
        },
        reasonLabel: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        reasonText: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
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
        bookDescription: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
        },
        tapHint: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.medium,
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
        floatingShortlistButton: {
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.pill,
            paddingVertical: 14,
            alignItems: "center",
            justifyContent: "center",
            marginTop: theme.spacing.md,
        },

        floatingShortlistButtonText: {
            color: "#FFFFFF",
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
    });
}