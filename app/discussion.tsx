import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {useCallback, useEffect, useMemo, useState} from "react";
import {
    Alert,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    clearDiscussionRepliesForQuestionInSupabase,
    createDiscussionQuestionInSupabase,
    createDiscussionReplyInSupabase,
    fetchClubMemberProgress,
    fetchClubOverviewFromSupabase,
    fetchCurrentUserClubRole,
    fetchDiscussionQuestionsForClub,
    fetchDiscussionRepliesForQuestion,
    type DiscussionQuestion,
    type DiscussionReply,
    updateDiscussionReplyInSupabase,
    deleteDiscussionReplyInSupabase,
    deleteDiscussionQuestionInSupabase,
    updateDiscussionQuestionInSupabase, CommentVisibilityMode,
} from "@/src/services/supabaseClub";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import { getCurrentSupabaseUserId } from "@/src/services/supabaseUserBooks";
import LottieView from 'lottie-react-native';
import {subscribeToRefresh, triggerRefresh} from "@/src/utils/refreshEvents";
import {createPageStyles} from "@/src/styles/pageStyles";
import {t} from "@/src/i18n";
import {ScreenTopBar} from "@/src/components/ScreenTopBar";
import {showAppAlert, showAppConfirm} from "@/src/utils/appAlert";
import {DISCUSSION_QUESTION_PRESETS, DiscussionQuestionPresetPackId} from "@/src/data/discussionQuestionPreset";
import {getPresetQuestionsToAdd} from "@/src/utils/discussionPresetQuestions";

type QuestionSortOrder = "oldestFirst" | "newestFirst";
type QuestionModalMode = "custom" | "presets";



export default function DiscussionScreen() {
    const theme = useAppTheme();
    const styles = createStyles(theme);
    const params = useLocalSearchParams();
    const pageStyles = createPageStyles(theme);

    const clubId = useMemo(() => {
        const value = params.clubId;
        return Array.isArray(value) ? value[0] : value;
    }, [params.clubId]);

    const [questions, setQuestions] = useState<DiscussionQuestion[]>([]);
    const [repliesByQuestion, setRepliesByQuestion] = useState<Record<string, DiscussionReply[]>>({});
    const [newQuestion, setNewQuestion] = useState("");
    const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
    const [clubRole, setClubRole] = useState<"owner" | "member" | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isQuestionModalVisible, setIsQuestionModalVisible] = useState(false);
    const [isSavingQuestion, setIsSavingQuestion] = useState(false);
    const [savingReplyForQuestionId, setSavingReplyForQuestionId] = useState<string | null>(null);
    const [clearingRepliesForQuestionId, setClearingRepliesForQuestionId] = useState<string | null>(null);
    const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
    const [editingReplyText, setEditingReplyText] = useState("");
    const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null);
    const [savingEditedReplyId, setSavingEditedReplyId] = useState<string | null>(null);
    const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
    const [editingQuestionText, setEditingQuestionText] = useState("");
    const [savingEditedQuestionId, setSavingEditedQuestionId] = useState<string | null>(null);
    const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});
    const [currentUserProgress, setCurrentUserProgress] = useState(0);
    const [currentBookId, setCurrentBookId] = useState<string | null>(null);
    const [questionSortOrder, setQuestionSortOrder] =
        useState<QuestionSortOrder>("oldestFirst");
    const [commentVisibilityMode, setCommentVisibilityMode] =
        useState<CommentVisibilityMode>("sameProgress");
    const [questionModalMode, setQuestionModalMode] =
        useState<QuestionModalMode>("custom");

    const [selectedPresetPackId, setSelectedPresetPackId] =
        useState<DiscussionQuestionPresetPackId>("starter");

    const [selectedPresetQuestionIds, setSelectedPresetQuestionIds] =
        useState<Record<string, boolean>>({});

    const [nextMeetingDate, setNextMeetingDate] = useState<string | null>(null);

    const loadDiscussion = useCallback(async (showLoader = false) => {
        try {
            if (showLoader) {
                setIsLoading(true);
            } else {
                setIsRefreshing(true);
            }

            const [clubData, role, userId] = await Promise.all([
                fetchClubOverviewFromSupabase(),
                fetchCurrentUserClubRole({
                    clubId: clubId ?? "",
                }),
                getCurrentSupabaseUserId(),
            ]);

            setCommentVisibilityMode(clubData?.commentVisibilityMode ?? "sameProgress");
            setNextMeetingDate(clubData?.nextMeeting?.meetingDate ?? null);

            const currentBookId = clubData?.currentBook?.id ?? null;
            setCurrentBookId(currentBookId);

            const [questionData, progressData] = await Promise.all([
                fetchDiscussionQuestionsForClub({
                    clubId: clubId ?? "",
                }),
                currentBookId
                    ? fetchClubMemberProgress({
                        clubId: clubId ?? "",
                        currentBookId,
                    })
                    : Promise.resolve([]),
            ]);

            const currentUserProgressItem = progressData.find(
                (member) => member.userId === userId
            );

            setCurrentUserProgress(currentUserProgressItem?.progress ?? 0);

            setQuestions(questionData);
            setClubRole(role);
            setCurrentUserId(userId);

            const repliesEntries = await Promise.all(
                questionData.map(async (question) => {
                    const replies = await fetchDiscussionRepliesForQuestion({
                        questionId: question.id,
                    });

                    return [question.id, replies] as const;
                })
            );

            setRepliesByQuestion(Object.fromEntries(repliesEntries));
        } catch (error) {
            console.error("Error loading discussion:", error);
            showAppAlert(
                t("discussion.loadErrorTitle"),
                t("discussion.loadErrorMessage")
            );        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [clubId]);

    useEffect(() => {
        void loadDiscussion(true);

        const unsubscribe = subscribeToRefresh("discussion", () => {
            void loadDiscussion(false);
        });

        return unsubscribe;
    }, [loadDiscussion]);

    function dismissKeyboardEverywhere() {
        Keyboard.dismiss();

        if (Platform.OS === "web") {
            const activeElement = document.activeElement;
            if (activeElement instanceof HTMLElement) {
                activeElement.blur();
            }
        }
    }

    function isMeetingDayOrLater(isoDate: string | null) {
        if (!isoDate) return false;

        const today = new Date();
        const meetingDate = new Date(isoDate);

        today.setHours(0, 0, 0, 0);
        meetingDate.setHours(0, 0, 0, 0);

        return today.getTime() >= meetingDate.getTime();
    }

    function canViewDiscussionReply({
                                        isOwnReply,
                                        replyProgress,
                                    }: {
        isOwnReply: boolean;
        replyProgress: number;
    }) {
        if (isOwnReply) {
            return true;
        }

        switch (commentVisibilityMode) {
            case "always":
                return true;

            case "meetingDay":
                return isMeetingDayOrLater(nextMeetingDate);

            case "sameProgress":
            default:
                return currentUserProgress >= replyProgress;
        }
    }

    async function handleAddQuestion() {
        try {
            if (!newQuestion.trim()) {
                Alert.alert("Add a question", "Please enter a question first.");
                return;
            }

            setIsSavingQuestion(true);

            await createDiscussionQuestionInSupabase({
                clubId: clubId ?? "",
                question: newQuestion,
            });

            setNewQuestion("");
            setIsQuestionModalVisible(false);
            await loadDiscussion();
            triggerRefresh("club");
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Something went wrong while adding the question.";
            Alert.alert("Add question error", message);
        } finally {
            setIsSavingQuestion(false);
        }
    }

    function resetQuestionModal() {
        setIsQuestionModalVisible(false);
        setNewQuestion("");
        setQuestionModalMode("custom");
        setSelectedPresetPackId("starter");
        setSelectedPresetQuestionIds({});
    }

    function openQuestionModal(mode: QuestionModalMode = "custom") {
        setQuestionModalMode(mode);

        if (mode === "presets") {
            const starterPack = DISCUSSION_QUESTION_PRESETS.find(
                (presetPack) => presetPack.id === "starter"
            );

            setSelectedPresetPackId("starter");
            setSelectedPresetQuestionIds(
                Object.fromEntries(
                    starterPack?.questions.map((question) => [question.id, true]) ?? []
                )
            );
        } else {
            setSelectedPresetQuestionIds({});
        }

        setIsQuestionModalVisible(true);
    }

    function togglePresetQuestion(questionId: string) {
        setSelectedPresetQuestionIds((current) => ({
            ...current,
            [questionId]: !current[questionId],
        }));
    }

    async function handleAddPresetQuestions() {
        const selectedQuestionTexts = selectedPresetQuestions.map((question) =>
            t(question.textKey)
        );

        const questionsToAdd = getPresetQuestionsToAdd({
            selectedQuestions: selectedQuestionTexts,
            existingQuestions: questions.map((question) => question.question),
        });

        if (selectedQuestionTexts.length === 0) {
            showAppAlert(
                t("discussion.noPresetSelectedTitle"),
                t("discussion.noPresetSelectedMessage")
            );
            return;
        }

        if (questionsToAdd.length === 0) {
            showAppAlert(
                t("discussion.noNewPresetQuestionsTitle"),
                t("discussion.noNewPresetQuestionsMessage")
            );
            return;
        }

        try {
            setIsSavingQuestion(true);

            await Promise.all(
                questionsToAdd.map((question) =>
                    createDiscussionQuestionInSupabase({
                        clubId: clubId ?? "",
                        question,
                    })
                )
            );

            resetQuestionModal();
            await loadDiscussion();
            triggerRefresh("club");
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : t("discussion.addPresetQuestionsErrorMessage");

            showAppAlert(t("discussion.addPresetQuestionsErrorTitle"), message);
        } finally {
            setIsSavingQuestion(false);
        }
    }
    function toggleReplies(questionId: string) {
        setExpandedQuestions((current) => ({
            ...current,
            [questionId]: !current[questionId],
        }));
    }
    async function handleAddReply(questionId: string) {
        const draft = replyDrafts[questionId]?.trim() ?? "";

        if (!draft) {
            showAppAlert(
                t("discussion.emptyReplyTitle"),
                t("discussion.emptyReplyMessage")
            );
            return;
        }

        try {
            setSavingReplyForQuestionId(questionId);

            await createDiscussionReplyInSupabase({
                questionId,
                clubId: clubId ?? "",
                reply: draft,
                progressAtReply: currentUserProgress,
            });

            setReplyDrafts((current) => ({
                ...current,
                [questionId]: "",
            }));

            await loadDiscussion();
            triggerRefresh("club");
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Something went wrong while adding the reply.";
            Alert.alert("Add reply error", message);
        } finally {
            setSavingReplyForQuestionId(null);
        }
    }
    function handleStartEditQuestion(question: DiscussionQuestion) {
        setEditingQuestionId(question.id);
        setEditingQuestionText(question.question);
    }

    function handleCancelEditQuestion() {
        setEditingQuestionId(null);
        setEditingQuestionText("");
    }

    async function handleSaveEditedQuestion() {
        if (!editingQuestionId) {
            return;
        }

        try {
            if (!editingQuestionText.trim()) {
                Alert.alert("Edit question", "Please enter a question first.");
                return;
            }

            setSavingEditedQuestionId(editingQuestionId);

            await updateDiscussionQuestionInSupabase({
                questionId: editingQuestionId,
                question: editingQuestionText,
            });

            setEditingQuestionId(null);
            setEditingQuestionText("");
            await loadDiscussion();
            triggerRefresh("club");
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Something went wrong while saving the question.";
            Alert.alert("Edit question error", message);
        } finally {
            setSavingEditedQuestionId(null);
        }
    }

    function getHiddenReplyContent(replyProgress: number) {
        if (commentVisibilityMode === "meetingDay") {
            if (!nextMeetingDate) {
                return {
                    title: t("discussion.hiddenReplyNoMeetingTitle"),
                    text: t("discussion.hiddenReplyNoMeetingText"),
                };
            }

            return {
                title: t("discussion.hiddenReplyMeetingDayTitle"),
                text: t("discussion.hiddenReplyMeetingDayText"),
            };
        }

        return {
            title: t("discussion.hiddenReplyProgressTitle"),
            text: t("discussion.hiddenReplyProgressText", {
                progress: replyProgress,
            }),
        };
    }

    async function handleDeleteQuestion(questionId: string) {
        const confirmed = await showAppConfirm({
            title: t("discussion.deleteQuestionTitle"),
            message: t("discussion.deleteQuestionMessage"),
            confirmText: t("common.delete"),
            cancelText: t("common.cancel"),
        });

        if (!confirmed) return;

        try {
            setDeletingQuestionId(questionId);

            await deleteDiscussionQuestionInSupabase({
                questionId,
            });

            await loadDiscussion();
            triggerRefresh("club");
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : t("discussion.deleteQuestionErrorMessage");

            showAppAlert(t("discussion.deleteQuestionErrorTitle"), message);
        } finally {
            setDeletingQuestionId(null);
        }
    }

    async function handleDeleteAllQuestions() {
        const confirmed = await showAppConfirm({
            title: "Alle vragen wissen?",
            message: "Weet je zeker dat je alle discussievragen en reacties wilt verwijderen?",
            confirmText: "Wis alles",
            cancelText: t("common.cancel"),
        });

        if (!confirmed) return;

        try {
            setIsRefreshing(true);

            await Promise.all(
                questions.map((question) =>
                    deleteDiscussionQuestionInSupabase({
                        questionId: question.id,
                    })
                )
            );

            await loadDiscussion();
            triggerRefresh("club");
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Er ging iets mis tijdens het wissen van alle vragen.";

            showAppAlert("Wissen mislukt", message);
        } finally {
            setIsRefreshing(false);
        }
    }
    function handleStartEditReply(reply: DiscussionReply) {
        setEditingReplyId(reply.id);
        setEditingReplyText(reply.reply);
    }

    function handleCancelEditReply() {
        setEditingReplyId(null);
        setEditingReplyText("");
    }

    async function handleSaveEditedReply() {
        if (!editingReplyId) {
            return;
        }

        try {
            if (!editingReplyText.trim()) {
                Alert.alert("Edit reply", "Please enter a reply first.");
                return;
            }

            setSavingEditedReplyId(editingReplyId);

            await updateDiscussionReplyInSupabase({
                replyId: editingReplyId,
                reply: editingReplyText,
            });

            setEditingReplyId(null);
            setEditingReplyText("");
            await loadDiscussion();
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Something went wrong while saving the reply.";
            Alert.alert("Edit reply error", message);
        } finally {
            setSavingEditedReplyId(null);
        }
    }

    async function handleDeleteReply(replyId: string) {
        const confirmed = await showAppConfirm({
            title: t("discussion.deleteReplyTitle"),
            message: t("discussion.deleteReplyMessage"),
            confirmText: t("common.delete"),
            cancelText: t("common.cancel"),
        });

        if (!confirmed) return;

        try {
            setDeletingReplyId(replyId);

            await deleteDiscussionReplyInSupabase({
                replyId,
            });

            await loadDiscussion();
            triggerRefresh("club");
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : t("discussion.deleteReplyErrorMessage");

            showAppAlert(t("discussion.deleteReplyErrorTitle"), message);
        } finally {
            setDeletingReplyId(null);
        }
    }
    async function handleClearReplies(questionId: string) {
        const confirmed = await showAppConfirm({
            title: t("discussion.clearRepliesTitle"),
            message: t("discussion.clearRepliesMessage"),
            confirmText: t("discussion.clearRepliesConfirm"),
            cancelText: t("common.cancel"),
        });

        if (!confirmed) return;

        try {
            setClearingRepliesForQuestionId(questionId);

            await clearDiscussionRepliesForQuestionInSupabase({
                questionId,
            });

            await loadDiscussion();
            triggerRefresh("club");
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : t("discussion.clearRepliesErrorMessage");

            showAppAlert(t("discussion.clearRepliesErrorTitle"), message);
        } finally {
            setClearingRepliesForQuestionId(null);
        }
    }
    const sortedQuestions = useMemo(() => {
        return [...questions].sort((firstQuestion, secondQuestion) => {
            const firstDate = new Date(firstQuestion.createdAt).getTime();
            const secondDate = new Date(secondQuestion.createdAt).getTime();

            if (questionSortOrder === "oldestFirst") {
                return firstDate - secondDate;
            }

            return secondDate - firstDate;
        });
    }, [questions, questionSortOrder]);

    const selectedPresetPack = useMemo(() => {
        return (
            DISCUSSION_QUESTION_PRESETS.find(
                (presetPack) => presetPack.id === selectedPresetPackId
            ) ?? DISCUSSION_QUESTION_PRESETS[0]
        );
    }, [selectedPresetPackId]);

    const selectedPresetQuestions = selectedPresetPack.questions.filter(
        (question) => selectedPresetQuestionIds[question.id]
    );

    const questionModalContent = (
        <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>
                    {t("discussion.newQuestionTitle")}
                </Text>

                <View style={styles.questionModeRow}>
                    <Pressable
                        style={[
                            styles.questionModeButton,
                            questionModalMode === "custom" && styles.questionModeButtonActive,
                        ]}
                        onPress={() => setQuestionModalMode("custom")}
                    >
                        <Text
                            style={[
                                styles.questionModeButtonText,
                                questionModalMode === "custom" &&
                                styles.questionModeButtonTextActive,
                            ]}
                        >
                            {t("discussion.writeYourself")}
                        </Text>
                    </Pressable>

                    <Pressable
                        style={[
                            styles.questionModeButton,
                            questionModalMode === "presets" && styles.questionModeButtonActive,
                        ]}
                        onPress={() => setQuestionModalMode("presets")}
                    >
                        <Text
                            style={[
                                styles.questionModeButtonText,
                                questionModalMode === "presets" &&
                                styles.questionModeButtonTextActive,
                            ]}
                        >
                            {t("discussion.usePresets")}
                        </Text>
                    </Pressable>
                </View>

                {questionModalMode === "custom" ? (
                    <TextInput
                        value={newQuestion}
                        onChangeText={setNewQuestion}
                        placeholder={t("discussion.newQuestionPlaceholder")}
                        placeholderTextColor={theme.colors.textMuted}
                        style={[styles.input, styles.textArea]}
                        multiline
                        textAlignVertical="top"
                    />
                ) : (
                    <View style={styles.presetsWrap}>
                        <View style={styles.presetPackRow}>
                            {DISCUSSION_QUESTION_PRESETS.map((presetPack) => {
                                const isSelected = presetPack.id === selectedPresetPackId;

                                return (
                                    <Pressable
                                        key={presetPack.id}
                                        style={[
                                            styles.presetPackButton,
                                            isSelected && styles.presetPackButtonActive,
                                        ]}
                                        onPress={() => setSelectedPresetPackId(presetPack.id)}
                                    >
                                        <Text
                                            style={[
                                                styles.presetPackButtonText,
                                                isSelected && styles.presetPackButtonTextActive,
                                            ]}
                                        >
                                            {t(presetPack.titleKey)}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        <Text style={styles.presetDescription}>
                            {t(selectedPresetPack.descriptionKey)}
                        </Text>

                        <View style={styles.presetQuestionsList}>
                            {selectedPresetPack.questions.map((question) => {
                                const isSelected = Boolean(
                                    selectedPresetQuestionIds[question.id]
                                );

                                return (
                                    <Pressable
                                        key={question.id}
                                        style={[
                                            styles.presetQuestionButton,
                                            isSelected && styles.presetQuestionButtonSelected,
                                        ]}
                                        onPress={() => togglePresetQuestion(question.id)}
                                    >
                                        <Feather
                                            name={isSelected ? "check-circle" : "circle"}
                                            size={18}
                                            color={
                                                isSelected
                                                    ? theme.colors.accent
                                                    : theme.colors.textMuted
                                            }
                                        />

                                        <Text style={styles.presetQuestionText}>
                                            {t(question.textKey)}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>
                )}

                <View style={styles.modalActions}>
                    <Pressable
                        style={styles.modalSecondaryButton}
                        onPress={resetQuestionModal}
                    >
                        <Text style={styles.modalSecondaryButtonText}>
                            {t("common.cancel")}
                        </Text>
                    </Pressable>

                    <Pressable
                        style={[
                            styles.primaryButton,
                            isSavingQuestion && styles.primaryButtonDisabled,
                        ]}
                        onPress={
                            questionModalMode === "custom"
                                ? handleAddQuestion
                                : handleAddPresetQuestions
                        }
                        disabled={isSavingQuestion}
                    >
                        <Text style={styles.primaryButtonText}>
                            {isSavingQuestion
                                ? t("discussion.addingQuestion")
                                : questionModalMode === "custom"
                                    ? t("discussion.addQuestion")
                                    : t("discussion.addSelectedQuestions", {
                                        count: selectedPresetQuestions.length,
                                    })}
                        </Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );


    const questionSortControl =
        questions.length > 1 ? (
            <View style={styles.questionSortRow}>
                <Pressable
                    style={styles.questionSortButton}
                    onPress={() =>
                        setQuestionSortOrder((currentOrder) =>
                            currentOrder === "oldestFirst"
                                ? "newestFirst"
                                : "oldestFirst"
                        )
                    }
                >
                    <Feather
                        name={
                            questionSortOrder === "oldestFirst"
                                ? "arrow-down"
                                : "arrow-up"
                        }
                        size={16}
                        color={theme.colors.accent}
                    />

                    <Text style={styles.questionSortButtonText}>
                        {questionSortOrder === "oldestFirst"
                            ? t("discussion.oldestFirst")
                            : t("discussion.newestFirst")}
                    </Text>
                </Pressable>
                {clubRole === "owner" ? (
                    <Pressable
                        style={styles.clearAllButton}
                        onPress={handleDeleteAllQuestions}
                    >
                        <Feather name="trash-2" size={15} color={theme.colors.textMuted} />
                        <Text style={styles.clearAllButtonText}>Wis alles</Text>
                    </Pressable>
                ) : null}
            </View>
        ) : null;

    const screenContent = (
        <View style={styles.screen}>
                <View style={styles.titleRow}>


                </View>


            {isLoading ? (
                <View style={styles.stateWrapper}>
                    <LottieView
                        source={require('@/assets/animations/loading-book.json')}
                        autoPlay
                        loop
                        style={{ width: 200, height: 200 }}
                    />
                </View>
            ) : questions.length === 0 ? (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>{t("discussion.noQuestionsTitle")}</Text>
                    <Text style={styles.emptyText}>
                        {t("discussion.noQuestionsText")}
                    </Text>

                    <View style={styles.emptyActionsRow}>
                        <Pressable
                            style={styles.primaryButton}
                            onPress={() => openQuestionModal("presets")}
                        >
                            <Text style={styles.primaryButtonText}>
                                {t("discussion.useStarterQuestions")}
                            </Text>
                        </Pressable>

                        <Pressable
                            style={styles.modalSecondaryButton}
                            onPress={() => openQuestionModal("custom")}
                        >
                            <Text style={styles.modalSecondaryButtonText}>
                                {t("discussion.writeYourself")}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            ) : (
                <>
                {questionSortControl}

                <FlatList
                    data={sortedQuestions}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item, index }) => {
                        const replies = repliesByQuestion[item.id] ?? [];
                        const replyDraft = replyDrafts[item.id] ?? "";
                        const isSavingReply = savingReplyForQuestionId === item.id;
                        const isClearingReplies = clearingRepliesForQuestionId === item.id;
                        const isRepliesExpanded = Boolean(expandedQuestions[item.id]);
                        const isReplyDraftEmpty = replyDraft.trim().length === 0;

                        return (
                            <View style={styles.questionCard}>
                                <View style={styles.questionTopRow}>
                                    <View style={styles.questionNumber}>
                                        <Text style={styles.questionNumberText}>{index + 1}</Text>
                                    </View>

                                    <View style={styles.questionContent}>
                                        {editingQuestionId === item.id ? (
                                            <>
                                                <TextInput
                                                    value={editingQuestionText}
                                                    onChangeText={setEditingQuestionText}
                                                    placeholder="Edit your question"
                                                    placeholderTextColor={theme.colors.textMuted}
                                                    style={[styles.input, styles.textArea]}
                                                    multiline
                                                    textAlignVertical="top"
                                                />

                                                <View style={styles.replyActionsRow}>
                                                    <Pressable
                                                        style={styles.replyGhostButton}
                                                        onPress={handleCancelEditQuestion}
                                                    >
                                                        <Text style={styles.replyGhostButtonText}>Cancel</Text>
                                                    </Pressable>

                                                    <Pressable
                                                        style={[
                                                            styles.replySmallButton,
                                                            savingEditedQuestionId === item.id && styles.primaryButtonDisabled,
                                                        ]}
                                                        onPress={handleSaveEditedQuestion}
                                                        disabled={savingEditedQuestionId === item.id}
                                                    >
                                                        <Text style={styles.replySmallButtonText}>
                                                            {savingEditedQuestionId === item.id ? "Saving..." : "Save"}
                                                        </Text>
                                                    </Pressable>
                                                </View>
                                            </>
                                        ) : (
                                            <>
                                                <View style={styles.questionHeaderRow}>
                                                    <Text style={styles.questionText}>{item.question}</Text>

                                                    {(item.createdBy === currentUserId || clubRole === "owner") ? (
                                                        <View style={styles.questionIconActions}>
                                                            {item.createdBy === currentUserId ? (
                                                                <Pressable
                                                                    style={styles.questionIconButton}
                                                                    onPress={() => handleStartEditQuestion(item)}
                                                                >
                                                                    <Feather name="edit-2" size={15} color={theme.colors.textMuted} />
                                                                </Pressable>
                                                            ) : null}

                                                            <Pressable
                                                                style={styles.questionIconButton}
                                                                onPress={() => handleDeleteQuestion(item.id)}
                                                                disabled={deletingQuestionId === item.id}
                                                            >
                                                                <Feather name="trash-2" size={15} color={theme.colors.textMuted} />
                                                            </Pressable>
                                                        </View>
                                                    ) : null}
                                                </View>

                                                <Text style={styles.questionMeta}>
                                                    {t("discussion.questionAddedOn", {
                                                        date: formatQuestionDate(item.createdAt),
                                                    })}
                                                </Text>
                                            </>
                                        )}
                                    </View>
                                </View>
                                <View style={styles.repliesBlock}>
                                    <Pressable
                                        style={styles.repliesToggle}
                                        onPress={() => toggleReplies(item.id)}
                                    >
                                        <Text style={styles.repliesToggleText}>
                                            {t("discussion.repliesCount", { count: replies.length })}
                                        </Text>

                                        <Feather
                                            name={isRepliesExpanded ? "chevron-up" : "chevron-down"}
                                            size={18}
                                            color={theme.colors.accent}
                                        />
                                    </Pressable>

                                    {isRepliesExpanded ? (
                                        replies.length > 0 ? (
                                            <View style={styles.repliesSection}>
                                                {replies.map((reply) => {
                                                    const isOwnReply = reply.createdBy === currentUserId;
                                                    const replyProgress = reply.progressAtReply ?? 0;
                                                    const canViewReply = canViewDiscussionReply({
                                                        isOwnReply,
                                                        replyProgress,
                                                    });
                                                    const authorLabel =
                                                        isOwnReply
                                                            ? t("discussion.you")
                                                            : reply.authorName;

                                                    return (
                                                        <View key={reply.id} style={styles.replyCard}>
                                                            <Text style={styles.replyAuthor}>{authorLabel}</Text>
                                                            {canViewReply ? (
                                                                editingReplyId === reply.id ? (
                                                                    <>
                                                                        <TextInput
                                                                            value={editingReplyText}
                                                                            onChangeText={setEditingReplyText}
                                                                            placeholder={t("discussion.editReplyPlaceholder")}
                                                                            placeholderTextColor={theme.colors.textMuted}
                                                                            style={[styles.input, styles.replyEditInput]}
                                                                            multiline
                                                                            textAlignVertical="top"
                                                                        />

                                                                        <View style={styles.replyActionsRow}>
                                                                            <Pressable
                                                                                style={styles.replyGhostButton}
                                                                                onPress={handleCancelEditReply}
                                                                            >
                                                                                <Text style={styles.replyGhostButtonText}>
                                                                                    {t("common.cancel")}
                                                                                </Text>
                                                                            </Pressable>

                                                                            <Pressable
                                                                                style={[
                                                                                    styles.replySmallButton,
                                                                                    savingEditedReplyId === reply.id &&
                                                                                    styles.primaryButtonDisabled,
                                                                                ]}
                                                                                onPress={handleSaveEditedReply}
                                                                                disabled={savingEditedReplyId === reply.id}
                                                                            >
                                                                                <Text style={styles.replySmallButtonText}>
                                                                                    {savingEditedReplyId === reply.id
                                                                                        ? t("discussion.saving")
                                                                                        : t("common.save")}
                                                                                </Text>
                                                                            </Pressable>
                                                                        </View>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Text style={styles.replyText}>{reply.reply}</Text>
                                                                        <Text style={styles.replyMeta}>
                                                                            {t("discussion.addedOn", {
                                                                                date: formatQuestionDate(reply.createdAt),
                                                                            })}
                                                                        </Text>

                                                                        {(reply.createdBy === currentUserId || clubRole === "owner") ? (
                                                                            <View style={styles.replyActionsRow}>
                                                                                {reply.createdBy === currentUserId ? (
                                                                                    <Pressable
                                                                                        style={styles.replyGhostButton}
                                                                                        onPress={() => handleStartEditReply(reply)}
                                                                                    >
                                                                                        <Text style={styles.replyGhostButtonText}>
                                                                                            {t("common.edit")}
                                                                                        </Text>
                                                                                    </Pressable>
                                                                                ) : null}

                                                                                <Pressable
                                                                                    style={styles.replyGhostButton}
                                                                                    onPress={() => handleDeleteReply(reply.id)}
                                                                                    disabled={deletingReplyId === reply.id}
                                                                                >
                                                                                    <Text style={styles.replyGhostButtonText}>
                                                                                        {deletingReplyId === reply.id
                                                                                            ? t("discussion.deleting")
                                                                                            : t("common.delete")}
                                                                                    </Text>
                                                                                </Pressable>
                                                                            </View>
                                                                        ) : null}
                                                                    </>
                                                                )
                                                            ) : (
                                                                <View style={styles.hiddenReplyCard}>
                                                                    <Feather name="lock" size={16} color={theme.colors.accent} />

                                                                    <View style={styles.hiddenReplyTextWrap}>
                                                                        {(() => {
                                                                            const hiddenReplyContent = getHiddenReplyContent(replyProgress);

                                                                            return (
                                                                                <>
                                                                                    <Text style={styles.hiddenReplyTitle}>
                                                                                        {hiddenReplyContent.title}
                                                                                    </Text>
                                                                                    <Text style={styles.hiddenReplyText}>
                                                                                        {hiddenReplyContent.text}
                                                                                    </Text>
                                                                                </>
                                                                            );
                                                                        })()}
                                                                    </View>
                                                                </View>
                                                            )}
                                                        </View>
                                                    );
                                                })}

                                                {clubRole === "owner" ? (
                                                    <Pressable
                                                        style={styles.secondaryButton}
                                                        onPress={() => handleClearReplies(item.id)}
                                                        disabled={isClearingReplies}
                                                    >
                                                        <Text style={styles.secondaryButtonText}>
                                                            {isClearingReplies
                                                                ? t("discussion.clearingReplies")
                                                                : t("discussion.clearReplies")}
                                                        </Text>
                                                    </Pressable>
                                                ) : null}
                                            </View>
                                        ) : (
                                            <Text style={styles.emptyText}>{t("discussion.noRepliesYet")}</Text>
                                        )
                                    ) : null}

                                    <View style={styles.replyComposer}>
                                        <TextInput
                                            value={replyDraft}
                                            onChangeText={(value) =>
                                                setReplyDrafts((current) => ({
                                                    ...current,
                                                    [item.id]: value,
                                                }))
                                            }
                                            placeholder={t("discussion.writeReply")}
                                            placeholderTextColor={theme.colors.textMuted}
                                            style={styles.replyInput}
                                        />

                                        <Pressable
                                            style={[
                                                styles.replyButton,
                                                (isSavingReply || isReplyDraftEmpty) && styles.primaryButtonDisabled,
                                            ]}
                                            onPress={() => handleAddReply(item.id)}
                                            disabled={isSavingReply || isReplyDraftEmpty}
                                        >
                                            <Text style={styles.replyButtonText}>
                                                {isSavingReply ? t("discussion.savingShort") : t("discussion.reply")}
                                            </Text>
                                        </Pressable>
                                    </View>
                                </View>
                            </View>
                        );
                    }}
                />
                </>
            )}

            <Modal
                visible={isQuestionModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsQuestionModalVisible(false)}
            >
                {Platform.OS === "web" ? (
                    questionModalContent
                ) : (
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                        {questionModalContent}
                    </TouchableWithoutFeedback>
                )}
            </Modal>
            <Pressable
                style={styles.fabButton}
                onPress={() => openQuestionModal("custom")}
            >
                <Feather name="plus" size={22} color="#FFFFFF" />
            </Pressable>
        </View>
    )

    return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <ScreenTopBar title={t("discussion.title")}
                          right = {<Pressable
                style={[styles.refreshButton, isRefreshing && styles.refreshButtonDisabled]}
                onPress={() => void loadDiscussion(false)}
                disabled={isRefreshing}
            >
                <Feather name="refresh-cw" size={18} color={theme.colors.accent} />
            </Pressable>}
            />
            <KeyboardAvoidingView
                style={styles.safeArea}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                {Platform.OS === "web" ? (
                    screenContent
                ) : (
                    <TouchableWithoutFeedback
                        onPress={dismissKeyboardEverywhere}
                        accessible={false}
                    >
                        {screenContent}
                    </TouchableWithoutFeedback>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

function formatQuestionDate(isoDate: string) {
    const date = new Date(isoDate);

    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
    }).format(date);
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        questionModeRow: {
            flexDirection: "row",
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: 4,
            gap: 4,
        },

        questionModeButton: {
            flex: 1,
            borderRadius: theme.radius.pill,
            paddingVertical: 9,
            alignItems: "center",
            justifyContent: "center",
        },

        questionModeButtonActive: {
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.border,
        },

        questionModeButtonText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
        },

        questionModeButtonTextActive: {
            color: theme.colors.accent,
        },

        presetsWrap: {
            gap: theme.spacing.sm,
        },

        presetPackRow: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: theme.spacing.xs,
        },

        presetPackButton: {
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
            paddingHorizontal: 12,
            paddingVertical: 8,
        },

        presetPackButtonActive: {
            backgroundColor: theme.colors.accentSoft,
            borderColor: theme.colors.accent,
        },

        presetPackButtonText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.medium,
        },

        presetPackButtonTextActive: {
            color: theme.colors.accent,
        },

        presetDescription: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
            lineHeight: 18,
        },

        presetQuestionsList: {
            gap: theme.spacing.xs,
        },

        presetQuestionButton: {
            flexDirection: "row",
            alignItems: "flex-start",
            gap: theme.spacing.sm,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
            padding: theme.spacing.sm,
        },

        presetQuestionButtonSelected: {
            backgroundColor: theme.colors.accentSoft,
            borderColor: theme.colors.accent,
        },

        presetQuestionText: {
            flex: 1,
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
        },

        emptyActionsRow: {
            gap: theme.spacing.sm,
            marginTop: theme.spacing.sm,
        },
        hiddenReplyCard: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            backgroundColor: theme.colors.accentSoft,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.sm,
        },

        hiddenReplyTextWrap: {
            flex: 1,
            gap: 2,
        },

        hiddenReplyTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },

        hiddenReplyText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
            lineHeight: 18,
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
        titleRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.xs,
        },
        backButton: {
            width: 32,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
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
            minHeight: 100,
        },
        primaryButton: {
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.pill,
            paddingVertical: 14,
            paddingHorizontal: 18,
            alignItems: "center",
            justifyContent: "center",
        },
        primaryButtonDisabled: {
            opacity: 0.7,
        },
        primaryButtonText: {
            color: "#FFFFFF",
            fontWeight: theme.typography.fontWeight.semibold,
            fontSize: theme.typography.fontSize.sm,
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
            paddingBottom: 80,
        },
        questionCard: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            gap: theme.spacing.md,
        },
        questionTopRow: {
            flexDirection: "row",
            gap: theme.spacing.md,
            alignItems: "flex-start",
        },
        questionNumber: {
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: theme.colors.accentSoft,
            alignItems: "center",
            justifyContent: "center",
            marginTop: 2,
        },
        questionNumberText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        questionContent: {
            flex: 1,
            gap: 6,
        },
        questionText: {
            flex: 1,
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.md,
            lineHeight: 22,
        },
        questionMeta: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
        },
        repliesSection: {
            gap: theme.spacing.sm,
        },
        repliesTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        replyCard: {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.sm,
            gap: 4,
        },
        replyAuthor: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        replyText: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
        },
        replyMeta: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
        },
        secondaryButton: {
            alignSelf: "flex-start",
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.border,
            paddingHorizontal: 14,
            paddingVertical: 10,
        },
        secondaryButtonText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
        },
        replyComposer: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
        },
        replyInput: {
            flex: 1,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
        },
        replyButton: {
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 16,
            paddingVertical: 12,
            alignItems: "center",
            justifyContent: "center",
        },
        replyButtonText: {
            color: "#FFFFFF",
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.25)",
            justifyContent: "center",
            padding: theme.spacing.lg,
        },
        modalCard: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            gap: theme.spacing.md,
        },
        modalTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        modalActions: {
            flexDirection: "row",
            justifyContent: "flex-end",
            gap: theme.spacing.sm,
        },
        modalSecondaryButton: {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.border,
            paddingHorizontal: 16,
            paddingVertical: 12,
            alignItems: "center",
            justifyContent: "center",
        },
        modalSecondaryButtonText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
        },
        replyEditInput: {
            minHeight: 80,
        },

        replyActionsRow: {
            flexDirection: "row",
            gap: theme.spacing.sm,
            marginTop: theme.spacing.xs,
        },

        replyGhostButton: {
            backgroundColor: theme.colors.background,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.border,
            paddingHorizontal: 12,
            paddingVertical: 8,
        },

        replyGhostButtonText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.medium,
        },

        replySmallButton: {
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 14,
            paddingVertical: 8,
            alignItems: "center",
            justifyContent: "center",
        },

        replySmallButtonText: {
            color: "#FFFFFF",
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        headerSpacer: {
            flex: 1,
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
        fabButton: {
            position: "absolute",
            right: theme.spacing.lg,
            bottom: theme.spacing.xl,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: theme.colors.accent,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
        },
        repliesBlock: {
            gap: theme.spacing.sm,
        },

        repliesToggle: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            paddingTop: theme.spacing.xs,
        },

        repliesToggleText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
        },
        questionSortRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: theme.spacing.sm,
            marginBottom: theme.spacing.md,
        },
        questionSortLabel: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
        },
        questionSortButton: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.xs,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.border,
            paddingHorizontal: 12,
            paddingVertical: 8,
        },
        questionSortButtonText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
        },
        questionHeaderRow: {
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: theme.spacing.sm,
        },

        questionIconActions: {
            flexDirection: "row",
            gap: theme.spacing.xs,
        },

        questionIconButton: {
            width: 30,
            height: 30,
            borderRadius: 15,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
        },
        clearAllButton: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.border,
            paddingHorizontal: 10,
            paddingVertical: 8,
        },

        clearAllButtonText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.medium,
        },
    });
}