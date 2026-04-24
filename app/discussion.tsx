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
import { AppHeader } from "@/src/components/AppHeader";
import {
    clearDiscussionRepliesForQuestionInSupabase,
    createDiscussionQuestionInSupabase,
    createDiscussionReplyInSupabase,
    fetchCurrentUserClubRole,
    fetchDiscussionQuestionsForClub,
    fetchDiscussionRepliesForQuestion,
    type DiscussionQuestion,
    type DiscussionReply, updateDiscussionReplyInSupabase, deleteDiscussionReplyInSupabase,
    deleteDiscussionQuestionInSupabase, updateDiscussionQuestionInSupabase,
} from "@/src/services/supabaseClub";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import { useFocusEffect } from "@react-navigation/native";
import { getCurrentSupabaseUserId } from "@/src/services/supabaseUserBooks";
import LottieView from 'lottie-react-native';
import {subscribeToRefresh, triggerRefresh} from "@/src/utils/refreshEvents";
import {createPageStyles} from "@/src/styles/pageStyles";
import {t} from "@/src/i18n";
import {ScreenTopBar} from "@/src/components/ScreenTopBar";

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

    const loadDiscussion = useCallback(async (showLoader = false) => {
        try {
            if (showLoader) {
                setIsLoading(true);
            } else {
                setIsRefreshing(true);
            }

            const [questionData, role, userId] = await Promise.all([
                fetchDiscussionQuestionsForClub({
                    clubId: clubId ?? "",
                    bookId: null,
                }),
                fetchCurrentUserClubRole({
                    clubId: clubId ?? "",
                }),
                getCurrentSupabaseUserId(),
            ]);

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
            Alert.alert("Error", "Something went wrong while loading the discussion.");
        } finally {
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

    async function handleAddQuestion() {
        try {
            if (!newQuestion.trim()) {
                Alert.alert("Add a question", "Please enter a question first.");
                return;
            }

            setIsSavingQuestion(true);

            await createDiscussionQuestionInSupabase({
                clubId: clubId ?? "",
                bookId: null,
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
    function toggleReplies(questionId: string) {
        setExpandedQuestions((current) => ({
            ...current,
            [questionId]: !current[questionId],
        }));
    }
    async function handleAddReply(questionId: string) {
        const draft = replyDrafts[questionId]?.trim() ?? "";

        if (!draft) {
            Alert.alert("Add a reply", "Please enter a reply first.");
            return;
        }

        try {
            setSavingReplyForQuestionId(questionId);

            await createDiscussionReplyInSupabase({
                questionId,
                clubId: clubId ?? "",
                reply: draft,
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

    function handleDeleteQuestion(questionId: string) {
        Alert.alert(
            "Delete question",
            "Are you sure you want to delete this question? All replies will also be removed.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
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
                                    : "Something went wrong while deleting the question.";
                            Alert.alert("Delete question error", message);
                        } finally {
                            setDeletingQuestionId(null);
                        }
                    },
                },
            ]
        );
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

    function handleDeleteReply(replyId: string) {
        Alert.alert(
            "Delete reply",
            "Are you sure you want to delete this reply?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setDeletingReplyId(replyId);

                            await deleteDiscussionReplyInSupabase({
                                replyId,
                            });

                            await loadDiscussion();
                        } catch (error) {
                            const message =
                                error instanceof Error
                                    ? error.message
                                    : "Something went wrong while deleting the reply.";
                            Alert.alert("Delete reply error", message);
                        } finally {
                            setDeletingReplyId(null);
                        }
                    },
                },
            ]
        );
    }
    function handleClearReplies(questionId: string) {
        Alert.alert(
            "Clear replies",
            "Are you sure you want to remove all replies for this question?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setClearingRepliesForQuestionId(questionId);

                            await clearDiscussionRepliesForQuestionInSupabase({
                                questionId,
                            });

                            await loadDiscussion();
                        } catch (error) {
                            const message =
                                error instanceof Error
                                    ? error.message
                                    : "Something went wrong while clearing replies.";
                            Alert.alert("Clear replies error", message);
                        } finally {
                            setClearingRepliesForQuestionId(null);
                        }
                    },
                },
            ]
        );
    }
    const screenContent = (
        <View style={styles.screen}>
            <View style={styles.header}>
                <View style={styles.titleRow}>


                </View>

                <Text style={pageStyles.pageSubtitle}>{t("discussion.subtitle")}</Text>
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
                    <Text style={styles.emptyTitle}>No questions yet</Text>
                    <Text style={styles.emptyText}>
                        Add your first discussion question to get the conversation started.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={questions}
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
                                                <Text style={styles.questionText}>{item.question}</Text>
                                                <Text style={styles.questionMeta}>
                                                    Added {formatQuestionDate(item.createdAt)}
                                                </Text>

                                                {item.createdBy === currentUserId || clubRole === "owner" ? (
                                                    <View style={styles.replyActionsRow}>
                                                        {item.createdBy === currentUserId ? (
                                                            <Pressable
                                                                style={styles.replyGhostButton}
                                                                onPress={() => handleStartEditQuestion(item)}
                                                            >
                                                                <Text style={styles.replyGhostButtonText}>Edit</Text>
                                                            </Pressable>
                                                        ) : null}

                                                        <Pressable
                                                            style={styles.replyGhostButton}
                                                            onPress={() => handleDeleteQuestion(item.id)}
                                                            disabled={deletingQuestionId === item.id}
                                                        >
                                                            <Text style={styles.replyGhostButtonText}>
                                                                {deletingQuestionId === item.id ? "Deleting..." : "Delete"}
                                                            </Text>
                                                        </Pressable>
                                                    </View>
                                                ) : null}
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
                                                    const authorLabel =
                                                        reply.createdBy && reply.createdBy === currentUserId
                                                            ? t("discussion.you")
                                                            : reply.authorName;

                                                    return (
                                                        <View key={reply.id} style={styles.replyCard}>
                                                            <Text style={styles.replyAuthor}>{authorLabel}</Text>

                                                            {editingReplyId === reply.id ? (
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

                                                                    {reply.createdBy === currentUserId || clubRole === "owner" ? (
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
                                            style={[styles.replyButton, isSavingReply && styles.primaryButtonDisabled]}
                                            onPress={() => handleAddReply(item.id)}
                                            disabled={isSavingReply}
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
            )}

            <Modal
                visible={isQuestionModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsQuestionModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalCard}>
                            <Text style={styles.modalTitle}>New discussion question</Text>

                            <TextInput
                                value={newQuestion}
                                onChangeText={setNewQuestion}
                                placeholder="For example: What did you think of the ending?"
                                placeholderTextColor={theme.colors.textMuted}
                                style={[styles.input, styles.textArea]}
                                multiline
                                textAlignVertical="top"
                            />

                            <View style={styles.modalActions}>
                                <Pressable
                                    style={styles.modalSecondaryButton}
                                    onPress={() => {
                                        setIsQuestionModalVisible(false);
                                        setNewQuestion("");
                                    }}
                                >
                                    <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
                                </Pressable>

                                <Pressable
                                    style={[styles.primaryButton, isSavingQuestion && styles.primaryButtonDisabled]}
                                    onPress={handleAddQuestion}
                                    disabled={isSavingQuestion}
                                >
                                    <Text style={styles.primaryButtonText}>
                                        {isSavingQuestion ? "Adding..." : "Add question"}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
            <Pressable
                style={styles.fabButton}
                onPress={() => setIsQuestionModalVisible(true)}
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
    });
}