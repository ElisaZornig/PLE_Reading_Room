import { Feather } from "@expo/vector-icons";
import {router, useFocusEffect, useLocalSearchParams} from "expo-router";
import {useCallback, useMemo, useState} from "react";
import {Alert, Pressable, ScrollView, StyleSheet, Text, View} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ChoiceStepper } from "@/src/components/ChoiceStepper";
import { ScreenTopBar } from "@/src/components/ScreenTopBar";
import { t } from "@/src/i18n";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import {createClubSwipeSession, fetchClubSwipeState, SwipeState} from "@/src/services/supabaseSwipe";
import {showAppAlert, showAppConfirm} from "@/src/utils/appAlert";

export default function ChooseMethodScreen() {
    const theme = useAppTheme();
    const styles = createStyles(theme);
    const params = useLocalSearchParams();
    const [activeSession, setActiveSession] = useState(false);
    const [hasCompletedSwipe, setHasCompletedSwipe] = useState(false);
    const [isOwner] = useState(true);
    const [swipeState, setSwipeState] = useState<SwipeState | null>(null);
    const [isLoadingSwipeState, setIsLoadingSwipeState] = useState(true);
    const clubId = useMemo(() => {
        const value = params.clubId;
        return Array.isArray(value) ? value[0] : value;
    }, [params.clubId]);

    async function loadSwipeState() {
        if (!clubId) return;

        try {
            setIsLoadingSwipeState(true);
            const data = await fetchClubSwipeState(clubId);
            setSwipeState(data);
        } catch (error) {
            console.error("Error loading swipe state:", error);
        } finally {
            setIsLoadingSwipeState(false);
        }
    }

    useFocusEffect(
        useCallback(() => {
            void loadSwipeState();
        }, [clubId])
    );



    function getSwipeSubtitle() {
        if (isLoadingSwipeState) {
            return "Swipe ronde laden...";
        }

        if (!swipeState?.activeSessionId && !swipeState?.isOwner) {
            return "De owner moet eerst een swipe ronde openen.";
        }

        if (!swipeState?.activeSessionId && swipeState?.isOwner) {
            return "Open een swipe ronde met de huidige shortlist.";
        }

        if (swipeState?.hasCompletedSwipe) {
            return "Bekijk de huidige swipe resultaten.";
        }

        return "Swipe door de shortlist en stem samen.";
    }

    function getSwipeLabel() {
        if (isLoadingSwipeState) return "Laden";
        if (!swipeState?.activeSessionId && !swipeState?.isOwner) return "Gesloten";
        if (!swipeState?.activeSessionId && swipeState?.isOwner) return "Openen";
        if (swipeState?.hasCompletedSwipe) return "Resultaten";
        return "Swipe nu";
    }

    async function handleSwipePress() {
        if (!clubId || isLoadingSwipeState) return;

        if (!swipeState?.activeSessionId && swipeState?.isOwner) {
            const confirmed = await showAppConfirm({
                title: "Swipe ronde openen?",
                message:
                    "De huidige shortlist wordt gebruikt. Boeken die later worden toegevoegd, zitten niet automatisch in deze ronde.",
                confirmText: "Openen",
                cancelText: "Annuleren",
            });

            if (!confirmed) return;

            try {
                const session = await createClubSwipeSession(clubId);
                await loadSwipeState();

                router.push({
                    pathname: "/swipe-books",
                    params: {
                        clubId,
                        sessionId: session.id,
                    },
                });
            } catch (error) {
                showAppAlert(
                    "Swipe ronde niet geopend",
                    error instanceof Error ? error.message : "Probeer het opnieuw."
                );
            }

            return;
        }

        if (!swipeState?.activeSessionId) {
            showAppAlert(
                "Swipe ronde gesloten",
                "De owner moet eerst een swipe ronde openen."
            );
            return;
        }

        if (swipeState.hasCompletedSwipe) {
            router.push({
                pathname: "/swipe-results",
                params: {
                    clubId,
                    sessionId: swipeState.activeSessionId,
                },
            });
            return;
        }

        router.push({
            pathname: "/swipe-books",
            params: {
                clubId,
                sessionId: swipeState.activeSessionId,
            },
        });
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <ScreenTopBar title={t("chooseMethod.screenTitle")} />
            <ChoiceStepper currentStep={3} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.container}
            >


                <View style={styles.header}>
                    <Text style={styles.title}>{t("chooseMethod.title")}</Text>
                    <Text style={styles.subtitle}>{t("chooseMethod.subtitle")}</Text>
                </View>

                <View style={styles.methods}>
                    <MethodCard
                        icon="refresh-cw"
                        title={t("chooseMethod.wheelTitle")}
                        subtitle={t("chooseMethod.wheelSubtitle")}
                        label={t("chooseMethod.recommended")}
                        onPress={() =>
                            router.push({
                                pathname: "/spin-the-wheel",
                                params: { clubId: clubId ?? "" },
                            })
                        }
                        theme={theme}
                    />

                    <MethodCard
                        icon="check-circle"
                        title={t("chooseMethod.voteTitle")}
                        subtitle={t("chooseMethod.voteSubtitle")}
                        label={t("chooseMethod.later")}
                        disabled
                        theme={theme}
                    />

                    <MethodCard
                        icon="layers"
                        title={t("chooseMethod.swipeTitle")}
                        subtitle={getSwipeSubtitle()}
                        label={getSwipeLabel()}
                        onPress={handleSwipePress}
                        theme={theme}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

type MethodCardProps = {
    icon: keyof typeof Feather.glyphMap;
    title: string;
    subtitle: string;
    label?: string;
    disabled?: boolean;
    onPress?: () => void;
    theme: AppTheme;
};

function MethodCard({
                        icon,
                        title,
                        subtitle,
                        label,
                        disabled = false,
                        onPress,
                        theme,
                    }: MethodCardProps) {
    const styles = createStyles(theme);

    return (
        <Pressable
            style={[styles.methodCard, disabled && styles.methodCardDisabled]}
            onPress={onPress}
            disabled={disabled}
        >
            <View style={styles.methodIconWrap}>
                <Feather name={icon} size={22} color={theme.colors.accent} />
            </View>

            <View style={styles.methodTextWrap}>
                <View style={styles.methodTitleRow}>
                    <Text style={styles.methodTitle}>{title}</Text>

                    {label ? (
                        <View style={styles.methodLabel}>
                            <Text style={styles.methodLabelText}>{label}</Text>
                        </View>
                    ) : null}
                </View>

                <Text style={styles.methodSubtitle}>{subtitle}</Text>
            </View>

            <Feather
                name={disabled ? "lock" : "chevron-right"}
                size={18}
                color={theme.colors.textMuted}
            />
        </Pressable>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        container: {
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.lg,
            paddingBottom: theme.spacing.xxl,
        },
        stepText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            marginTop: theme.spacing.sm,
            marginBottom: theme.spacing.lg,
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
        methods: {
            gap: theme.spacing.md,
        },
        methodCard: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.md,
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
        },
        methodCardDisabled: {
            opacity: 0.65,
        },
        methodIconWrap: {
            width: 48,
            height: 48,
            borderRadius: 16,
            backgroundColor: theme.colors.accentSoft,
            alignItems: "center",
            justifyContent: "center",
        },
        methodTextWrap: {
            flex: 1,
            gap: 5,
        },
        methodTitleRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            flexWrap: "wrap",
        },
        methodTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.md,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        methodSubtitle: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
        },
        methodLabel: {
            backgroundColor: theme.colors.accentSoft,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 8,
            paddingVertical: 4,
        },
        methodLabelText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
        },
    });
}