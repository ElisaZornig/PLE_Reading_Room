import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenTopBar } from "@/src/components/ScreenTopBar";
import { t } from "@/src/i18n";
import {
    fetchClubOverviewFromSupabase,
    type ClubOverview,
} from "@/src/services/supabaseClub";
import {
    createMeetingPoll,
    fetchActiveMeetingPoll,
    type MeetingPoll,
} from "@/src/services/supabaseMeetingPolls";
import { createPageStyles } from "@/src/styles/pageStyles";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import { showAppAlert } from "@/src/utils/appAlert";

export default function ClubMeetingScreen() {
    const theme = useAppTheme();
    const pageStyles = createPageStyles(theme);
    const styles = createStyles(theme);

    const params = useLocalSearchParams<{ clubId?: string }>();
    const clubId = Array.isArray(params.clubId) ? params.clubId[0] : params.clubId;

    const [club, setClub] = useState<ClubOverview | null>(null);
    const [activePoll, setActivePoll] = useState<MeetingPoll | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isStartingPoll, setIsStartingPoll] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    async function handleRefresh() {
        if (isRefreshing) return;

        try {
            setIsRefreshing(true);
            await loadMeetingState(false);
        } finally {
            setIsRefreshing(false);
        }
    }

    async function loadMeetingState(showLoader = true) {
        try {
            if (showLoader) {
                setIsLoading(true);
            }

            const clubData = await fetchClubOverviewFromSupabase();
            setClub(clubData);

            if (clubId) {
                const poll = await fetchActiveMeetingPoll(clubId);
                setActivePoll(poll);
            }
        } catch (error) {
            console.log("Error loading meeting state:", error);
            showAppAlert(
                t("common.error"),
                t("clubMeeting.loadError")
            );
        } finally {
            if (showLoader) {
                setIsLoading(false);
            }
        }
    }

    useEffect(() => {
        void loadMeetingState(true);
    }, [clubId]);
    async function handleStartPoll() {
        if (!clubId || isStartingPoll) return;

        try {
            setIsStartingPoll(true);

            const poll = await createMeetingPoll({
                clubId,
                title: t("clubMeeting.defaultPollTitle"),
            });

            router.push({
                pathname: "/meeting-poll",
                params: {
                    clubId,
                    pollId: poll.id,
                },
            });
        } catch (error) {
            console.log("Error starting meeting poll:", error);
            showAppAlert(
                t("clubMeeting.pollStartErrorTitle"),
                t("clubMeeting.pollStartErrorText")
            );
        } finally {
            setIsStartingPoll(false);
        }
    }

    function goToDirectMeeting() {
        if (!clubId) return;

        router.push({
            pathname: "/plan-meeting",
            params: { clubId },
        });
    }

    function goToExistingPoll() {
        if (!clubId || !activePoll) return;

        router.push({
            pathname: "/meeting-poll",
            params: {
                clubId,
                pollId: activePoll.id,
            },
        });
    }

    return (
        <SafeAreaView style={pageStyles.safeArea} edges={["top"]}>
            <ScreenTopBar
                title={t("clubMeeting.title")}
                right={
                    <Pressable
                        style={[
                            styles.refreshButton,
                            isRefreshing && styles.refreshButtonDisabled,
                        ]}
                        onPress={handleRefresh}
                        disabled={isRefreshing}
                    >
                        <Feather
                            name="refresh-cw"
                            size={16}
                            color={isRefreshing ? theme.colors.textMuted : theme.colors.accent}
                        />
                    </Pressable>
                }
            />
            <View style={[pageStyles.screen, styles.content]}>
                {isLoading ? (
                    <View style={styles.stateCard}>
                        <Text style={styles.helperText}>
                            {t("clubMeeting.loading")}
                        </Text>
                    </View>
                ) : (
                    <>
                        {club?.nextMeeting ? (
                            <View style={styles.infoCard}>
                                <View style={styles.iconWrap}>
                                    <Feather
                                        name="calendar"
                                        size={20}
                                        color={theme.colors.accent}
                                    />
                                </View>

                                <View style={styles.infoText}>
                                    <Text style={styles.cardTitle}>
                                        {t("clubMeeting.currentMeetingTitle")}
                                    </Text>

                                    <Text style={styles.cardSubtitle}>
                                        {formatMeetingLabel(club.nextMeeting.meetingDate)}
                                    </Text>

                                    {club.nextMeeting.location ? (
                                        <Text style={styles.cardSubtitle}>
                                            {club.nextMeeting.location}
                                        </Text>
                                    ) : null}
                                </View>
                            </View>
                        ) : null}

                        {activePoll ? (
                            <Pressable
                                style={[styles.optionCard, styles.activePollCard]}
                                onPress={goToExistingPoll}
                            >
                                <View style={styles.optionIcon}>
                                    <Feather
                                        name="users"
                                        size={20}
                                        color={theme.colors.accent}
                                    />
                                </View>

                                <View style={styles.optionText}>

                                    <Text style={styles.cardTitle}>
                                        {t("clubMeeting.continuePollTitle")}
                                    </Text>
                                    <Text style={styles.cardSubtitle}>
                                        {t("clubMeeting.continuePollText")}
                                    </Text>
                                </View>

                                <Feather
                                    name="chevron-right"
                                    size={20}
                                    color={theme.colors.accent}
                                />
                            </Pressable>
                        ) : null}

                        <Pressable
                            style={styles.optionCard}
                            onPress={goToDirectMeeting}
                        >
                            <View style={styles.optionIcon}>
                                <Feather
                                    name="edit-3"
                                    size={20}
                                    color={theme.colors.accent}
                                />
                            </View>

                            <View style={styles.optionText}>
                                <Text style={styles.cardTitle}>
                                    {club?.nextMeeting
                                        ? t("clubMeeting.editMeetingTitle")
                                        : t("clubMeeting.directMeetingTitle")}
                                </Text>
                                <Text style={styles.cardSubtitle}>
                                    {club?.nextMeeting
                                        ? t("clubMeeting.editMeetingText")
                                        : t("clubMeeting.directMeetingText")}
                                </Text>
                            </View>

                            <Feather
                                name="chevron-right"
                                size={20}
                                color={theme.colors.accent}
                            />
                        </Pressable>
                        {!activePoll ? (
                            <Pressable
                                style={[
                                    styles.optionCard,
                                    activePoll && styles.disabledCard,
                                    isStartingPoll && styles.disabledCard,
                                ]}
                                onPress={activePoll ? goToExistingPoll : handleStartPoll}
                                disabled={isStartingPoll}
                            >
                                <View style={styles.optionIcon}>
                                    <Feather
                                        name="calendar"
                                        size={20}
                                        color={theme.colors.accent}
                                    />
                                </View>

                                <View style={styles.optionText}>
                                    <Text style={styles.cardTitle}>
                                        {activePoll
                                            ? t("clubMeeting.continuePollTitle")
                                            : t("clubMeeting.pollMeetingTitle")}
                                    </Text>
                                    <Text style={styles.cardSubtitle}>
                                        {activePoll
                                            ? t("clubMeeting.continuePollText")
                                            : t("clubMeeting.pollMeetingText")}
                                    </Text>
                                </View>

                                <Feather
                                    name="chevron-right"
                                    size={20}
                                    color={theme.colors.accent}
                                />
                            </Pressable>
                        ) : null}


                        <Text style={styles.footerText}>
                            {t("clubMeeting.ownerConfirmText")}
                        </Text>
                    </>
                )}
            </View>
        </SafeAreaView>
    );
}

function formatMeetingLabel(isoDate: string) {
    const date = new Date(isoDate);

    return new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        refreshButton: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.border,
            alignItems: "center",
            justifyContent: "center",
        },

        refreshButtonDisabled: {
            opacity: 0.6,
        },
        activePollCard: {
            borderColor: theme.colors.accent,
            backgroundColor: theme.colors.accentSoft,
        },

        pollStatusBadge: {
            alignSelf: "flex-start",
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.border,
            paddingHorizontal: 9,
            paddingVertical: 4,
            marginBottom: 4,
        },

        pollStatusBadgeText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        content: {
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.md,
            gap: theme.spacing.md,
        },
        stateCard: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
        },
        infoCard: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            flexDirection: "row",
            alignItems: "flex-start",
            gap: theme.spacing.md,
        },
        iconWrap: {
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: theme.colors.accentSoft,
            alignItems: "center",
            justifyContent: "center",
        },
        infoText: {
            flex: 1,
            gap: 3,
        },
        optionCard: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.md,
        },
        disabledCard: {
            opacity: 0.6,
        },
        optionIcon: {
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: theme.colors.accentSoft,
            alignItems: "center",
            justifyContent: "center",
        },
        optionText: {
            flex: 1,
            gap: 3,
        },
        cardTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.md,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        cardSubtitle: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
        },
        helperText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
        },
        footerText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
            lineHeight: 18,
            textAlign: "center",
            paddingHorizontal: theme.spacing.md,
        },
    });
}