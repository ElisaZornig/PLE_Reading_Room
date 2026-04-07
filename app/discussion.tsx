import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
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
    type DiscussionReply,
} from "@/src/services/supabaseClub";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import { useFocusEffect } from "@react-navigation/native";
import { getCurrentSupabaseUserId } from "@/src/services/supabaseUserBooks";

export default function DiscussionScreen() {
    const theme = useAppTheme();
    const styles = createStyles(theme);
    const params = useLocalSearchParams();

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

    async function loadDiscussion() {
        try {
            setIsLoading(true);

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
        }
    }

    useFocusEffect(
        useCallback(() => {
            loadDiscussion();
        }, [clubId])
    );

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

    return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <AppHeader />

            <KeyboardAvoidingView
                style={styles.safeArea}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                    <View style={styles.screen}>
                        <View style={styles.header}>
                            <View style={styles.titleRow}>
                                <Pressable style={styles.backButton} onPress={() => router.back()}>
                                    <Feather name="chevron-left" size={24} color={theme.colors.accent} />
                                </Pressable>

                                <Text style={styles.title}>Discussion</Text>
                            </View>

                            <Text style={styles.subtitle}>
                                Save questions and replies for your book club conversation.
                            </Text>
                        </View>

                        <Pressable
                            style={styles.openQuestionButton}
                            onPress={() => setIsQuestionModalVisible(true)}
                        >
                            <Feather name="plus" size={18} color="#FFFFFF" />
                            <Text style={styles.openQuestionButtonText}>Add question</Text>
                        </Pressable>

                        {isLoading ? (
                            <View style={styles.stateWrapper}>
                                <Text style={styles.stateText}>Loading discussion...</Text>
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

                                    return (
                                        <View style={styles.questionCard}>
                                            <View style={styles.questionTopRow}>
                                                <View style={styles.questionNumber}>
                                                    <Text style={styles.questionNumberText}>{index + 1}</Text>
                                                </View>

                                                <View style={styles.questionContent}>
                                                    <Text style={styles.questionText}>{item.question}</Text>
                                                    <Text style={styles.questionMeta}>
                                                        Added {formatQuestionDate(item.createdAt)}
                                                    </Text>
                                                </View>
                                            </View>

                                            {replies.length > 0 ? (
                                                <View style={styles.repliesSection}>
                                                    <Text style={styles.repliesTitle}>
                                                        Replies ({replies.length})
                                                    </Text>

                                                    {replies.map((reply) => {
                                                        const authorLabel =
                                                            reply.createdBy && reply.createdBy === currentUserId
                                                                ? "You"
                                                                : reply.authorName;

                                                        return (
                                                            <View key={reply.id} style={styles.replyCard}>
                                                                <Text style={styles.replyAuthor}>{authorLabel}</Text>
                                                                <Text style={styles.replyText}>{reply.reply}</Text>
                                                                <Text style={styles.replyMeta}>
                                                                    Added {formatQuestionDate(reply.createdAt)}
                                                                </Text>
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
                                                                {isClearingReplies ? "Clearing..." : "Clear replies"}
                                                            </Text>
                                                        </Pressable>
                                                    ) : null}
                                                </View>
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
                                                    placeholder="Write a reply"
                                                    placeholderTextColor={theme.colors.textMuted}
                                                    style={styles.replyInput}
                                                />

                                                <Pressable
                                                    style={[styles.replyButton, isSavingReply && styles.primaryButtonDisabled]}
                                                    onPress={() => handleAddReply(item.id)}
                                                    disabled={isSavingReply}
                                                >
                                                    <Text style={styles.replyButtonText}>
                                                        {isSavingReply ? "..." : "Reply"}
                                                    </Text>
                                                </Pressable>
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
                    </View>
                </TouchableWithoutFeedback>
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
        title: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.xxl,
            fontWeight: theme.typography.fontWeight.bold,
        },
        subtitle: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: theme.typography.lineHeight.sm,
        },
        openQuestionButton: {
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 16,
            paddingVertical: 12,
            marginBottom: theme.spacing.lg,
        },
        openQuestionButtonText: {
            color: "#FFFFFF",
            fontWeight: theme.typography.fontWeight.semibold,
            fontSize: theme.typography.fontSize.sm,
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
            paddingBottom: theme.spacing.xl,
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
    });
}