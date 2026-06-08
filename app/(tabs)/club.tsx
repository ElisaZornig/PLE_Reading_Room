import { Feather } from "@expo/vector-icons";
import {router, useLocalSearchParams} from "expo-router";
import {useCallback, useEffect, useState} from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Progress from "react-native-progress";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import LottieView from "lottie-react-native";
import { BookCover } from "@/src/components/BookCover";
import { t } from "@/src/i18n";
import {
    fetchClubOverviewFromSupabase,
    type ClubOverview,
    type ClubMemberProgress,
    fetchClubMemberProgress,
    leaveClubInSupabase, fetchDiscussionQuestionsForClub, updateClubCommentVisibilityModeInSupabase,
    CommentVisibilityMode,
} from "@/src/services/supabaseClub";
import { createPageStyles } from "@/src/styles/pageStyles";
import {AppTheme, darkTheme} from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import { showAppAlert, showAppConfirm } from "@/src/utils/appAlert";
import {subscribeToRefresh} from "@/src/utils/refreshEvents";
import {ProfileButton} from "@/src/components/ProfileButton";
import {AvatarBubble} from "@/src/components/AvatarBubble";
import {COMMENT_VISIBILITY_OPTIONS} from "@/src/constants/visibilityOptions";
import {BrandLoader} from "@/src/components/BrandLoader";
import {supabase} from "@/src/services/supabase";

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
    const [isSavingCommentVisibility, setIsSavingCommentVisibility] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    async function handleUpdateCommentVisibility(mode: CommentVisibilityMode) {
        if (!club || club.currentUserRole !== "owner" || isSavingCommentVisibility) {
            return;
        }

        try {
            setIsSavingCommentVisibility(true);

            await updateClubCommentVisibilityModeInSupabase({
                clubId: club.id,
                mode,
            });

            setClub((currentClub) =>
                currentClub
                    ? {
                        ...currentClub,
                        commentVisibilityMode: mode,
                    }
                    : currentClub
            );
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : t("club.commentVisibilitySaveErrorMessage");

            showAppAlert(t("club.commentVisibilitySaveErrorTitle"), message);
        } finally {
            setIsSavingCommentVisibility(false);
        }
    }
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
            const {
                data: { user },
            } = await supabase.auth.getUser();

            setCurrentUserId(user?.id ?? null);

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

    function formatLastUpdated(isoDate?: string | null) {
        if (!isoDate) {
            return t("club.lastUpdatedNever");
        }

        const updatedDate = new Date(isoDate);
        const today = new Date();

        const updatedDay = new Date(
            updatedDate.getFullYear(),
            updatedDate.getMonth(),
            updatedDate.getDate()
        );

        const todayDay = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
        );

        const differenceInDays = Math.round(
            (todayDay.getTime() - updatedDay.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (differenceInDays === 0) {
            return t("club.lastUpdatedToday");
        }

        if (differenceInDays === 1) {
            return t("club.lastUpdatedYesterday");
        }

        if (differenceInDays < 7) {
            return t("club.lastUpdatedDaysAgo", { count: differenceInDays });
        }

        return t("club.lastUpdatedOn", {
            date: new Intl.DateTimeFormat(undefined, {
                day: "numeric",
                month: "short",
            }).format(updatedDate),
        });
    }


    if (isLoading) {
        return <BrandLoader text={t("club.loading")} />
    }

    if (!club) {
        return (
            <SafeAreaView style={pageStyles.safeArea} edges={["top"]}>
                <View style={pageStyles.screen}>
                    <ScrollView contentContainerStyle={styles.clubContent}
                    >
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

    const currentUserProgress = currentUserId
        ? memberProgress.find((member) => member.userId === currentUserId)
        : null;

    const ownProgress = currentUserProgress?.progress ?? 0;

    const selectedCommentVisibilityOption =
        COMMENT_VISIBILITY_OPTIONS.find(
            (option) => option.value === club.commentVisibilityMode
        ) ?? COMMENT_VISIBILITY_OPTIONS[1];

    function goToClubMeeting() {
        router.push({
            pathname: "/club-meeting",
            params: { clubId: club?.id },
        });
    }

    return (
        <SafeAreaView style={pageStyles.safeArea} edges={["top"]}>
            <ScrollView
                style={pageStyles.screen}
                contentContainerStyle={styles.clubContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.topRow}>
                    <View style={styles.topText}>
                        <Text style={pageStyles.pageTitle}>{club.name}</Text>
                        <Text style={styles.clubSubtitle}>{t("club.subtitle")}</Text>
                    </View>

                    <ProfileButton />
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <View style={styles.statLabelRow}>
                            <Feather name="trending-up" size={14} color={theme.colors.accent} />
                            <Text style={styles.statLabel}>{t("club.clubProgress")}</Text>
                        </View>
                        <Text style={styles.statValue}>{club.averageProgress}%</Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={styles.statLabelRow}>
                            <Feather name="clock" size={14} color={theme.colors.accent} />
                            <Text style={styles.statLabel}>{t("club.daysUntilMeeting")}</Text>
                        </View>
                        <Text style={styles.statValue}>{daysUntilMeeting ?? "-"}</Text>
                    </View>
                </View>

                <Pressable
                    style={styles.currentBookCard}
                    onPress={() => {
                        if (club.currentBook) {
                            router.push({
                                pathname: "/book/[id]",
                                params: { id: club.currentBook.id },
                            });
                            return;
                        }

                        router.push({
                            pathname: "/set-current-book",
                            params: { clubId: club.id },
                        });
                    }}
                >
                    <Text style={pageStyles.sectionLabel}>{t("club.currentBook")}</Text>

                    {club.currentBook ? (
                        <>
                            <View style={styles.currentBookRow}>
                                <BookCover
                                    title={club.currentBook.title}
                                    cover={club.currentBook.cover}
                                    small
                                />

                                <View style={styles.currentBookInfo}>
                                    <Text style={styles.bookTitle} numberOfLines={2}>
                                        {club.currentBook.title}
                                    </Text>
                                    <Text style={styles.bookAuthor} numberOfLines={1}>
                                        {club.currentBook.author}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.ownProgressBlock}>
                                <View style={styles.ownProgressHeader}>
                                    <Text style={styles.ownProgressLabel}>
                                        {t("club.yourProgress")}
                                    </Text>

                                    <Text style={styles.progressPercentage}>
                                        {ownProgress}%
                                    </Text>
                                </View>

                                <Progress.Bar
                                    progress={ownProgress / 100}
                                    width={null}
                                    height={5}
                                    borderWidth={0}
                                    color={theme.colors.accent}
                                    unfilledColor={theme.colors.border}
                                    style={styles.clubProgressBar}
                                />
                            </View>

                            <Text style={styles.tapHint}>{t("club.tapToUpdateYourProgress")}</Text>
                        </>
                    ) : (
                        <View style={styles.emptyCurrentBook}>
                            <Text style={styles.linkSubtitle}>{t("club.noCurrentClubBook")}</Text>
                            <Text style={styles.tapHint}>{t("club.setCurrentBook")}</Text>
                        </View>
                    )}
                </Pressable>

                <Pressable
                    style={pageStyles.sectionCard}
                    onPress={() =>
                        router.push({
                            pathname: "/choose-next-book",
                            params: { clubId: club.id },
                        })
                    }
                >
                    <Text style={pageStyles.sectionLabel}>{t("club.chooseNextClubBook")}</Text>
                    <View style={styles.chooseNextContent}>
                        <View style={styles.chooseNextIconWrap}>
                            <Feather name="star" size={20} color={theme.colors.accent} />
                        </View>

                        <View style={styles.chooseNextTextWrap}>
                            <Text style={styles.chooseNextSubtitle}>
                                {t("club.chooseNextClubBookSubtitle")}
                            </Text>
                        </View>
                    </View>

                    <Pressable
                        style={styles.primaryCardButton}
                        onPress={() =>
                            router.push({
                                pathname: "/choose-next-book",
                                params: { clubId: club.id },
                            })
                        }
                    >
                        <Text style={styles.primaryCardButtonText}>
                            {t("club.startChoosing")}
                        </Text>
                    </Pressable>
                </Pressable>

                <Pressable
                    style={[pageStyles.sectionCard, styles.meetingClickableCard]}
                    onPress={() =>
                        router.push({
                            pathname: "/club-meeting",
                            params: { clubId: club.id },
                        })
                    }
                >
                    <View style={styles.meetingCardContent}>
                        <Text style={pageStyles.sectionLabel}>{t("club.nextMeeting")}</Text>

                        {club.nextMeeting ? (
                            <>
                                <View style={styles.meetingRow}>
                                    <View style={styles.meetingIconWrap}>
                                        <Feather
                                            name="calendar"
                                            size={18}
                                            color={theme.colors.accent}
                                        />
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

                                {!!club.nextMeeting.notes?.trim() && (
                                    <View style={styles.meetingNoteBox}>
                                        <Feather
                                            name="file-text"
                                            size={14}
                                            color={theme.colors.accent}
                                        />

                                        <Text style={styles.meetingNoteText}>
                                            {club.nextMeeting.notes.trim()}
                                        </Text>
                                    </View>
                                )}
                            </>
                        ) : (
                            <Text style={pageStyles.emptyText}>
                                {t("club.noMeetingPlanned")}
                            </Text>
                        )}
                    </View>

                    <View style={styles.meetingChevron} pointerEvents="none">
                        <Feather
                            name="chevron-right"
                            size={20}
                            color={theme.colors.accent}
                        />
                    </View>
                </Pressable>

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
                                        style={{
                                            marginLeft: index === 0 ? 0 : -10,
                                            zIndex: 10 - index,
                                        }}
                                    >
                                        <AvatarBubble
                                            avatarId={member.avatarId}
                                            backgroundColor={member.avatarBackgroundColor}
                                            name={member.displayName}
                                            size={28}
                                        />
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
                                                <AvatarBubble
                                                    avatarId={member.avatarId}
                                                    backgroundColor={member.avatarBackgroundColor}
                                                    name={member.displayName}
                                                    size={40}
                                                />

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
                                                        {formatMemberStatus(member.status, member.progress)} ·{" "}
                                                        {formatLastUpdated(member.lastUpdatedAt)}
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

                            <View style={styles.commentVisibilitySection}>
                                {club.currentUserRole === "owner" ? (
                                    <>
                                        <Text style={styles.infoLabel}>
                                            {t("club.commentVisibilityTitle")}
                                        </Text>

                                        <View style={styles.visibilityToggleRow}>
                                            {COMMENT_VISIBILITY_OPTIONS.map((option) => {
                                                const isSelected = club.commentVisibilityMode === option.value;

                                                return (
                                                    <Pressable
                                                        key={option.value}
                                                        style={[
                                                            styles.visibilityToggleOption,
                                                            isSelected && styles.visibilityToggleOptionSelected,
                                                            isSavingCommentVisibility && styles.disabledButton,
                                                        ]}
                                                        onPress={() => handleUpdateCommentVisibility(option.value)}
                                                        disabled={isSavingCommentVisibility}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.visibilityToggleText,
                                                                isSelected && styles.visibilityToggleTextSelected,
                                                            ]}
                                                        >
                                                            {t(option.labelKey)}
                                                        </Text>
                                                    </Pressable>
                                                );
                                            })}
                                        </View>

                                        <Text style={styles.linkSubtitle}>
                                            {t(selectedCommentVisibilityOption.descriptionKey)}
                                        </Text>
                                    </>
                                ) : (
                                    <>
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>
                                                {t("club.commentVisibilityTitle")}
                                            </Text>

                                            <Text style={styles.infoValue}>
                                                {t(selectedCommentVisibilityOption.labelKey)}
                                            </Text>
                                        </View>

                                        <Text style={styles.linkSubtitle}>
                                            {t(selectedCommentVisibilityOption.descriptionKey)}
                                        </Text>
                                    </>
                                )}
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
        meetingClickableCard: {
            position: "relative",
            paddingRight: theme.spacing.xl + 18,
        },
        ownProgressBlock: {
            gap: theme.spacing.xs,
        },

        ownProgressHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: theme.spacing.sm,
        },

        ownProgressLabel: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.medium,
        },

        meetingCardContent: {
            gap: theme.spacing.md,
        },

        meetingChevron: {
            position: "absolute",
            right: theme.spacing.md,
            top: 0,
            bottom: 0,
            justifyContent: "center",
            alignItems: "center",
        },
        stateWrapper: {
            flex: 1,
            paddingHorizontal: theme.spacing.lg,
            justifyContent: "center",
            alignItems: "center",
        },
        topRow: {
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: theme.spacing.md,
            marginBottom: theme.spacing.md,
        },
        topText: {
            flex: 1,
        },
        clubContent: {
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.md,
            paddingBottom: 130,
            gap: theme.spacing.lg,
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
        clubSubtitle: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            marginTop: 4,
        },
        currentBookCard: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.xl,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.lg,
            gap: theme.spacing.md,
        },

        cardTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.md,
            fontWeight: theme.typography.fontWeight.semibold,
        },

        currentBookRow: {
            flexDirection: "row",
            gap: theme.spacing.md,
            alignItems: "center",
        },

        currentBookInfo: {
            flex: 1,
            gap: 6,
        },

        clubProgressWrap: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
        },

        clubProgressBar: {
            flex: 1,
        },

        progressPercentage: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
            minWidth: 34,
            textAlign: "right",
        },

        tapHint: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
        },

        emptyCurrentBook: {
            gap: theme.spacing.xs,
        },

        chooseNextCard: {
            backgroundColor: theme.colors.background,
            borderRadius: theme.radius.xl,
            borderWidth: 1,
            borderColor: theme.colors.accentSoft,
            padding: theme.spacing.lg,
            gap: theme.spacing.lg,
            overflow: "hidden",
        },

        chooseNextContent: {
            flexDirection: "row",
            alignItems: "flex-start",
            gap: theme.spacing.md,
        },

        chooseNextIconWrap: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.colors.accentSoft,
            alignItems: "center",
            justifyContent: "center",
        },

        chooseNextTextWrap: {
            flex: 1,
            gap: 6,
        },

        chooseNextSubtitle: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 21,
        },

        primaryCardButton: {
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.xl,
            paddingVertical: 13,
            alignItems: "center",
            justifyContent: "center",
        },

        primaryCardButtonText: {
            color: '#FFFDFC',
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
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
        statLabelRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginBottom: theme.spacing.sm,
        },
        commentVisibilitySection: {
            gap: theme.spacing.sm,
        },

        visibilityToggleRow: {
            flexDirection: "row",
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: 4,
            gap: 4,
        },

        visibilityToggleOption: {
            flex: 1,
            borderRadius: theme.radius.pill,
            paddingVertical: 9,
            paddingHorizontal: 8,
            alignItems: "center",
            justifyContent: "center",
        },

        visibilityToggleOptionSelected: {
            backgroundColor: theme.colors.accent,
        },

        visibilityToggleText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.medium,
            textAlign: "center",
        },

        visibilityToggleTextSelected: {
            color: "#FFFFFF",
        },
        meetingNoteBox: {
            flexDirection: "row",
            alignItems: "flex-start",
            gap: theme.spacing.xs,
            marginTop: theme.spacing.sm,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.sm,
        },

        meetingNoteText: {
            flex: 1,
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
        },

    });
}