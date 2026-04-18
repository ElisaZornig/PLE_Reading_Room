import { Feather } from "@expo/vector-icons";
import {router, useFocusEffect, useLocalSearchParams} from "expo-router";
import {useCallback, useEffect, useState} from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Progress from "react-native-progress";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import LottieView from "lottie-react-native";

import { AppHeader } from "@/src/components/AppHeader";
import { BookCover } from "@/src/components/BookCover";
import { t } from "@/src/i18n";
import {
    fetchClubOverviewFromSupabase,
    type ClubOverview,
    type ClubMemberProgress,
    fetchClubMemberProgress,
    leaveClubInSupabase, fetchDiscussionQuestionsForClub,
} from "@/src/services/supabaseClub";
import { createPageStyles } from "@/src/styles/pageStyles";
import {AppTheme, darkTheme} from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import { showAppAlert, showAppConfirm } from "@/src/utils/appAlert";
import {subscribeToRefresh} from "@/src/utils/refreshEvents";

export default function ClubScreen() {
    const theme = useAppTheme();
    const pageStyles = createPageStyles(theme);
    const styles = createStyles(theme);

    const [club, setClub] = useState<ClubOverview | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [memberProgress, setMemberProgress] = useState<ClubMemberProgress[]>([]);
    const [isProgressExpanded, setIsProgressExpanded] = useState(false);
    const [isLeavingClub, setIsLeavingClub] = useState(false);
    const [isManageExpanded, setIsManageExpanded] = useState(false);
    const [activeQuestionCount, setActiveQuestionCount] = useState(0);
    const params = useLocalSearchParams<{ refresh?: string }>();
    async function handleCopyInviteCode() {
        if (!club?.inviteCode) return;

        try {
            await Clipboard.setStringAsync(club.inviteCode);
            showAppAlert(
                t("club.copyInviteCodeSuccessTitle"),
                t("club.copyInviteCodeSuccessMessage")
            );
        } catch {
            showAppAlert(
                t("club.copyInviteCodeErrorTitle"),
                t("club.copyInviteCodeErrorMessage")
            );
        }
    }

    async function confirmLeaveClub() {
        if (!club) return;

        try {
            setIsLeavingClub(true);

            const result = await leaveClubInSupabase(club.id);

            const message =
                result.action === "deleted"
                    ? t("club.leaveDeletedMessage")
                    : result.action === "transferred"
                        ? t("club.leaveTransferredMessage")
                        : t("club.leaveSuccessMessage");

            showAppAlert(t("club.leaveSuccessTitle"), message);

            setIsProgressExpanded(false);
            await loadClub();
        } catch (error) {
            const message =
                error instanceof Error ? error.message : t("club.leaveErrorFallback");

            showAppAlert(t("club.leaveErrorTitle"), message);
        } finally {
            setIsLeavingClub(false);
        }
    }

    async function handleLeaveClub() {
        if (!club || isLeavingClub) return;

        const message =
            club.currentUserRole === "owner"
                ? club.memberCount > 1
                    ? t("club.leaveOwnerTransferMessage")
                    : t("club.leaveOwnerDeleteMessage")
                : t("club.leaveMemberMessage");

        const confirmed = await showAppConfirm({
            title: t("club.leaveTitle"),
            message,
            confirmText: t("club.leaveConfirm"),
            cancelText: t("common.cancel"),
        });

        if (!confirmed) return;

        await confirmLeaveClub();
    }

    const loadClub = useCallback(async (showLoader = false) => {
        try {
            if (showLoader) {
                setIsLoading(true);
            }

            const clubData = await fetchClubOverviewFromSupabase();
            setClub(clubData);

            if (clubData) {
                const [progressData, discussionQuestions] = await Promise.all([
                    fetchClubMemberProgress({
                        clubId: clubData.id,
                        currentBookId: clubData.currentBook?.id ?? null,
                    }),
                    fetchDiscussionQuestionsForClub({
                        clubId: clubData.id,
                        bookId: null,
                    }),
                ]);

                setMemberProgress(progressData);
                setActiveQuestionCount(discussionQuestions.length);
            } else {
                setMemberProgress([]);
                setActiveQuestionCount(0);
            }
        } catch (error) {
            console.error("Error loading club data:", error);
            setClub(null);
            setMemberProgress([]);
            setActiveQuestionCount(0);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadClub(true);

        const unsubscribe = subscribeToRefresh("club", () => {
            void loadClub(false);
        });

        return unsubscribe;
    }, [loadClub]);

    function formatMemberStatus(status: string | null, progress: number) {
        if (status === "finished") {
            return t("club.memberStatusFinished");
        }

        if (status === "reading") {
            return t("club.memberStatusReading");
        }

        if (status === "toRead") {
            return t("club.memberStatusToRead");
        }

        if (progress > 0) {
            return t("club.memberStatusReading");
        }

        return t("club.memberStatusToRead");
    }

    function getInitials(name: string) {
        const parts = name.trim().split(/\s+/).filter(Boolean);

        if (parts.length === 0) return "?";
        if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();

        return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
    }

    if (isLoading) {
        return (
            <SafeAreaView style={pageStyles.safeArea} edges={["top"]}>
                <AppHeader />
                <View style={styles.stateWrapper}>
                    <LottieView
                        source={require("@/assets/animations/loading-book.json")}
                        autoPlay
                        loop
                        style={styles.loadingAnimation}
                    />
                    <Text style={pageStyles.emptyText}>{t("club.loading")}</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!club) {
        return (
            <SafeAreaView style={pageStyles.safeArea} edges={["top"]}>
                <AppHeader />
                <View style={pageStyles.screen}>
                    <ScrollView contentContainerStyle={styles.content}>
                        <View style={pageStyles.pageHeader}>
                            <Text style={pageStyles.pageTitle}>{t("club.pageTitle")}</Text>
                        </View>

                        <Text style={pageStyles.pageSubtitle}>{t("club.pageSubtitle")}</Text>

                        <View style={pageStyles.sectionCard}>
                            <Text style={pageStyles.title}>{t("club.noClubTitle")}</Text>
                            <Text style={pageStyles.emptyText}>{t("club.noClubText")}</Text>

                            <Pressable
                                style={pageStyles.secondaryButton}
                                onPress={() => router.push("/create-club")}
                            >
                                <Text style={pageStyles.secondaryButtonText}>
                                    {t("club.createClub")}
                                </Text>
                            </Pressable>

                            <Pressable
                                style={pageStyles.secondaryButton}
                                onPress={() => router.push("/join-club")}
                            >
                                <Text style={pageStyles.secondaryButtonText}>
                                    {t("club.joinClub")}
                                </Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                </View>
            </SafeAreaView>
        );
    }

    const daysUntilMeeting = getDaysUntil(club.nextMeeting?.meetingDate);
    const owner = memberProgress.find((member) => member.role === "owner");
    return (
        <SafeAreaView style={pageStyles.safeArea} edges={["top"]}>
            <AppHeader />

            <ScrollView
                style={pageStyles.screen}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={pageStyles.pageHeader}>
                    <Text style={pageStyles.pageTitle}>{club.name}</Text>
                </View>

                {/*<Text style={pageStyles.pageSubtitle}>{t("club.pageSubtitle")}</Text>*/}

                <View style={styles.statsRow}>

                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{club.averageProgress}%</Text>
                        <Text style={styles.statLabel}>{t("club.read")}</Text>
                    </View>

                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{daysUntilMeeting ?? "-"}</Text>
                        <Text style={styles.statLabel}>{t("club.days")}</Text>
                    </View>
                </View>

                <View style={pageStyles.sectionCard}>
                    <Text style={pageStyles.sectionLabel}>{t("club.currentBook")}</Text>

                    {club.currentBook ? (
                        <>
                            <View style={styles.bookRow}>
                                <BookCover
                                    title={club.currentBook.title}
                                    cover={club.currentBook.cover}
                                    small
                                />

                                <View style={styles.bookInfo}>
                                    <Text style={styles.bookTitle}>{club.currentBook.title}</Text>
                                    <Text style={styles.bookAuthor}>{club.currentBook.author}</Text>
                                </View>
                            </View>

                            <Pressable
                                style={pageStyles.secondaryButton}
                                onPress={() =>
                                    router.push({
                                        pathname: "/choose-next-book",
                                        params: { clubId: club.id },
                                    })
                                }
                            >
                                <Text style={pageStyles.secondaryButtonText}>
                                    {t("club.changeCurrentBook")}
                                </Text>
                            </Pressable>
                        </>
                    ) : (
                        <>
                            <Text style={pageStyles.emptyText}>
                                {t("club.noCurrentClubBook")}
                            </Text>

                            <Pressable
                                style={pageStyles.secondaryButton}
                                onPress={() =>
                                    router.push({
                                        pathname: "/set-current-book",
                                        params: { clubId: club.id },
                                    })
                                }
                            >
                                <Text style={pageStyles.secondaryButtonText}>
                                    {t("club.setCurrentBook")}
                                </Text>
                            </Pressable>
                        </>
                    )}
                </View>

                <Pressable
                    style={styles.linkCard}
                    onPress={() =>
                        router.push({
                            pathname: "/recommendations",
                            params: { clubId: club.id },
                        })
                    }
                >
                    <View style={styles.linkTextWrap}>
                        <Text style={pageStyles.sectionLabel}>{t("club.nextBook")}</Text>
                        <Text style={styles.linkSubtitle}>
                            {t("club.nextBookSubtitle")}
                        </Text>
                    </View>

                    <Feather name="chevron-right" size={20} color={theme.colors.accent} />
                </Pressable>

                <View style={pageStyles.sectionCard}>
                    <Text style={pageStyles.sectionLabel}>{t("club.nextMeeting")}</Text>

                    {club.nextMeeting ? (
                        <>
                            <View style={styles.meetingRow}>
                                <View style={styles.meetingIconWrap}>
                                    <Feather name="calendar" size={18} color={theme.colors.accent} />
                                </View>

                                <View style={styles.meetingInfo}>
                                    <Text style={styles.meetingDate}>
                                        {formatMeetingLabel(club.nextMeeting.meetingDate)}
                                    </Text>

                                    {!!club.nextMeeting.location && (
                                        <Text style={styles.meetingLocation}>
                                            {club.nextMeeting.location}
                                        </Text>
                                    )}
                                </View>
                            </View>

                            <Pressable
                                style={pageStyles.secondaryButton}
                                onPress={() =>
                                    router.push({
                                        pathname: "/plan-meeting",
                                        params: { clubId: club.id },
                                    })
                                }
                            >
                                <Text style={pageStyles.secondaryButtonText}>
                                    {t("club.planMeeting")}
                                </Text>
                            </Pressable>
                        </>
                    ) : (
                        <>
                            <Text style={pageStyles.emptyText}>
                                {t("club.noMeetingPlanned")}
                            </Text>

                            <Pressable
                                style={pageStyles.secondaryButton}
                                onPress={() =>
                                    router.push({
                                        pathname: "/plan-meeting",
                                        params: { clubId: club.id },
                                    })
                                }
                            >
                                <Text style={pageStyles.secondaryButtonText}>
                                    {t("club.planMeeting")}
                                </Text>
                            </Pressable>
                        </>
                    )}
                </View>

                <Pressable
                    style={styles.linkCard}
                    onPress={() =>
                        router.push({
                            pathname: "/discussion",
                            params: { clubId: club.id },
                        })
                    }
                >
                    <View style={styles.linkTextWrap}>
                        <Text style={pageStyles.sectionLabel}>{t("club.discussion")}</Text>
                        <Text style={styles.linkSubtitle}>
                            {t("club.activeQuestions", { count: activeQuestionCount })}
                        </Text>
                        <Text style={styles.linkSubtitle}>{t("club.shareThoughts")}</Text>
                    </View>

                    <Feather name="chevron-right" size={20} color={theme.colors.accent} />
                </Pressable>

                <View style={pageStyles.sectionCard}>
                    <Pressable
                        style={styles.accordionHeader}
                        onPress={() => setIsProgressExpanded((current) => !current)}
                    >
                        <View style={styles.accordionHeaderText}>
                            <Text style={pageStyles.sectionLabel}>{t("club.progress")}</Text>
                            <Text style={styles.linkSubtitle}>
                                {club.averageProgress}% {t("club.averageProgressLabel")} ·{" "}
                                {memberProgress.length}{" "}
                                {memberProgress.length === 1
                                    ? t("club.member")
                                    : t("club.members")}
                            </Text>
                        </View>

                        <View style={styles.accordionRight}>
                            <View style={styles.avatarStack}>
                                {memberProgress.slice(0, 4).map((member, index) => (
                                    <View
                                        key={member.userId}
                                        style={[
                                            styles.memberAvatarSmall,
                                            {
                                                marginLeft: index === 0 ? 0 : -10,
                                                zIndex: 10 - index,
                                            },
                                        ]}
                                    >
                                        <Text style={styles.memberAvatarSmallText}>
                                            {getInitials(member.displayName)}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            <Feather
                                name={isProgressExpanded ? "chevron-up" : "chevron-down"}
                                size={20}
                                color={theme.colors.accent}
                            />
                        </View>
                    </Pressable>

                    <View style={styles.progressWrap}>
                        <Progress.Bar
                            progress={club.averageProgress / 100}
                            width={null}
                            height={6}
                            borderWidth={0}
                            color={theme.colors.accent}
                            unfilledColor={theme.colors.border}
                            style={styles.progressBar}
                        />
                    </View>

                    {isProgressExpanded ? (
                        <View style={styles.memberList}>
                            {memberProgress.length === 0 ? (
                                <Text style={pageStyles.emptyText}>{t("club.noMembersYet")}</Text>
                            ) : (
                                memberProgress.map((member) => (
                                    <View key={member.userId} style={styles.memberRow}>
                                        <View style={styles.memberTopRow}>
                                            <View style={styles.memberIdentity}>
                                                {member.avatarUrl ? (
                                                    <Image
                                                        source={{ uri: member.avatarUrl }}
                                                        style={styles.memberAvatar}
                                                    />
                                                ) : (
                                                    <View style={styles.memberAvatarFallback}>
                                                        <Text style={styles.memberAvatarFallbackText}>
                                                            {getInitials(member.displayName)}
                                                        </Text>
                                                    </View>
                                                )}

                                                <View style={styles.memberTextWrap}>
                                                    <View style={styles.memberNameWrap}>
                                                        <Text style={styles.memberName}>
                                                            {member.displayName}
                                                        </Text>

                                                        {member.role === "owner" ? (
                                                            <View style={styles.roleBadge}>
                                                                <Text style={styles.roleBadgeText}>
                                                                    {t("club.owner")}
                                                                </Text>
                                                            </View>
                                                        ) : null}
                                                    </View>

                                                    <Text style={styles.memberStatus}>
                                                        {formatMemberStatus(
                                                            member.status,
                                                            member.progress
                                                        )}
                                                    </Text>
                                                </View>
                                            </View>

                                            <Text style={styles.memberProgressText}>
                                                {member.progress}%
                                            </Text>
                                        </View>

                                        <Progress.Bar
                                            progress={member.progress / 100}
                                            width={null}
                                            height={6}
                                            borderWidth={0}
                                            color={theme.colors.accent}
                                            unfilledColor={theme.colors.border}
                                            style={styles.memberProgressBar}
                                        />
                                    </View>
                                ))
                            )}
                        </View>
                    ) : null}
                </View>

                <View style={pageStyles.sectionCard}>
                    <Pressable
                        style={styles.accordionHeader}
                        onPress={() => setIsManageExpanded((current) => !current)}
                    >
                        <View style={styles.accordionHeaderText}>
                            <Text style={pageStyles.sectionLabel}>{t("club.manageClub")}</Text>
                            <Text style={styles.linkSubtitle}>
                                {club.currentUserRole === "owner"
                                    ? t("club.manageClubOwnerText")
                                    : t("club.manageClubMemberText")}
                            </Text>
                        </View>

                        <Feather
                            name={isManageExpanded ? "chevron-up" : "chevron-down"}
                            size={20}
                            color={theme.colors.accent}
                        />
                    </Pressable>

                    {isManageExpanded ? (
                        <View style={styles.manageContent}>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>{t("club.ownerLabel")}</Text>
                                <Text style={styles.infoValue}>
                                    {owner?.displayName ?? t("club.ownerUnknown")}
                                </Text>
                            </View>

                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>{t("club.memberCountLabel")}</Text>
                                <Text style={styles.infoValue}>
                                    {club.memberCount} {club.memberCount === 1 ? t("club.member") : t("club.members")}
                                </Text>
                            </View>

                            <Pressable
                                style={styles.inviteRow}
                                onPress={handleCopyInviteCode}
                                disabled={!club.inviteCode}
                            >
                                <View style={styles.inviteTextWrap}>
                                    <Text style={styles.inviteLabel}>{t("club.inviteCode")}</Text>
                                    <Text style={styles.inviteCode}>{club.inviteCode ?? "-"}</Text>
                                </View>

                                <View style={styles.inviteAction}>
                                    <Text style={styles.inviteActionText}>{t("club.copyCode")}</Text>
                                    <Feather name="copy" size={16} color={theme.colors.accent} />
                                </View>
                            </Pressable>

                            <Pressable
                                style={[styles.dangerButton, isLeavingClub && styles.disabledButton]}
                                onPress={handleLeaveClub}
                                disabled={isLeavingClub}
                            >
                                <Text style={styles.dangerButtonText}>
                                    {isLeavingClub ? t("club.leaving") : t("club.leaveClub")}
                                </Text>
                            </Pressable>
                        </View>
                    ) : null}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function getDaysUntil(isoDate?: string) {
    if (!isoDate) return null;

    const today = new Date();
    const meetingDate = new Date(isoDate);
    const differenceInMs = meetingDate.getTime() - today.getTime();

    return Math.max(0, Math.ceil(differenceInMs / (1000 * 60 * 60 * 24)));
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
    const isDark = theme === darkTheme;

    return StyleSheet.create({
        stateWrapper: {
            flex: 1,
            paddingHorizontal: theme.spacing.lg,
            justifyContent: "center",
            alignItems: "center",
        },
        loadingAnimation: {
            width: 200,
            height: 200,
        },
        content: {
            padding: theme.spacing.lg,
            gap: theme.spacing.md,
            paddingBottom: theme.spacing.xl,
        },
        statsRow: {
            flexDirection: "row",
            gap: theme.spacing.sm,
        },
        statCard: {
            flex: 1,
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            paddingVertical: theme.spacing.md,
            paddingHorizontal: theme.spacing.sm,
            alignItems: "center",
        },
        statValue: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
            marginBottom: 4,
        },
        statLabel: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
        },
        bookRow: {
            flexDirection: "row",
            gap: theme.spacing.md,
            alignItems: "flex-start",
        },
        bookInfo: {
            flex: 1,
            gap: 4,
        },
        bookTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        bookAuthor: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
        },
        progressWrap: {
            marginTop: theme.spacing.sm,
            gap: theme.spacing.xs,
        },
        progressBar: {
            width: "100%",
        },
        meetingRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.md,
        },
        meetingIconWrap: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.colors.accentSoft,
            alignItems: "center",
            justifyContent: "center",
        },
        meetingInfo: {
            flex: 1,
            gap: 2,
        },
        meetingDate: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.md,
            fontWeight: theme.typography.fontWeight.medium,
        },
        meetingLocation: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
        },
        linkCard: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: theme.spacing.md,
        },
        linkTextWrap: {
            flex: 1,
            gap: 1,
        },
        linkSubtitle: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
        },
        accordionHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: theme.spacing.md,
        },
        accordionHeaderText: {
            flex: 1,
        },
        accordionRight: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
        },
        avatarStack: {
            flexDirection: "row",
            alignItems: "center",
        },
        memberAvatarSmall: {
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: theme.colors.accentSoft,
            borderWidth: 2,
            borderColor: theme.colors.card,
            alignItems: "center",
            justifyContent: "center",
        },
        memberAvatarSmallText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        memberList: {
            gap: theme.spacing.md,
        },
        memberRow: {
            gap: theme.spacing.sm,
        },
        memberTopRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: theme.spacing.md,
        },
        memberIdentity: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            flex: 1,
        },
        memberAvatar: {
            width: 40,
            height: 40,
            borderRadius: 20,
        },
        memberAvatarFallback: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.colors.accentSoft,
            alignItems: "center",
            justifyContent: "center",
        },
        memberAvatarFallbackText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        memberTextWrap: {
            flex: 1,
            gap: 2,
        },
        memberNameWrap: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            flexWrap: "wrap",
        },
        memberName: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
        },
        roleBadge: {
            backgroundColor: theme.colors.accentSoft,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 10,
            paddingVertical: 4,
        },
        roleBadgeText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        memberStatus: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
        },
        memberProgressBar: {
            width: "100%",
        },
        memberProgressText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
            minWidth: 32,
            textAlign: "right",
        },
        disabledButton: {
            opacity: 0.6,
        },
        inviteRow: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: theme.spacing.md,
        },
        inviteTextWrap: {
            flex: 1,
            gap: 2,
        },
        inviteLabel: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
            textTransform: "uppercase",
            letterSpacing: 0.4,
        },
        inviteCode: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.md,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        inviteAction: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
        },
        inviteActionText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
        },
        dangerButton: {
            backgroundColor: theme.colors.dangerSoft,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.dangerBorder,
            paddingVertical: 12,
            alignItems: "center",
            justifyContent: "center",
        },

        dangerButtonText: {
            color: theme.colors.danger,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
        },
        manageContent: {
            gap: theme.spacing.md,
        },

        infoRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: theme.spacing.md,
        },

        infoLabel: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
        },

        infoValue: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
        },
    });
}