import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    KeyboardAvoidingView,
    Modal, Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import * as Progress from "react-native-progress";
import { SafeAreaView } from "react-native-safe-area-context";

import { BookCover } from "@/src/components/BookCover";
import { AvatarBubble } from "@/src/components/AvatarBubble";
import { StarRatingDisplay } from "@/src/components/StarRatingDisplay";
import {getProfileById, isAcceptedFriend, Profile} from "@/src/services/friendsService";
import {
    FriendReadingProfile,
    ReadingBook,
    getFriendReadingProfile,
} from "@/src/services/readingProfileService";
import { createPageStyles } from "@/src/styles/pageStyles";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import {ScreenTopBar} from "@/src/components/ScreenTopBar";
import {t} from "@/src/i18n";
import {supabase} from "@/src/services/supabase";
import { addBookToUserLibrary } from "@/src/services/supabaseBooks";
import { showAppAlert } from "@/src/utils/appAlert";
import { triggerRefresh } from "@/src/utils/refreshEvents";

const COLLAPSED_PREVIEW_COUNT = 4;


export default function FriendProfileScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();

    const theme = useAppTheme();
    const pageStyles = createPageStyles(theme);
    const styles = createStyles(theme);

    const [profile, setProfile] = useState<Profile | null>(null);
    const [readingProfile, setReadingProfile] =
        useState<FriendReadingProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [canViewProfile, setCanViewProfile] = useState(false);
    const [isReadBooksExpanded, setIsReadBooksExpanded] = useState(false);

    const [isTbrExpanded, setIsTbrExpanded] = useState(false);
    const [selectedBook, setSelectedBook] = useState<ReadingBook | null>(null);
    const [isAddingBook, setIsAddingBook] = useState(false);


    async function fetchFriendProfile() {
        if (!id) return;

        try {
            setLoading(true);

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                setCanViewProfile(false);
                return;
            }

            const allowed = await isAcceptedFriend(user.id, id);

            if (!allowed) {
                setCanViewProfile(false);
                return;
            }

            setCanViewProfile(true);

            const [profileData, readingData] = await Promise.all([
                getProfileById(id),
                getFriendReadingProfile(id),
            ]);

            setProfile(profileData);
            setReadingProfile(readingData);
        } catch (error) {
            console.log("Error fetching friend profile:", error);
        } finally {
            setLoading(false);
        }
    }
    async function handleAddFriendBookToTbr(book: ReadingBook) {
        try {
            setIsAddingBook(true);

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.replace("/auth");
                return;
            }

            if (!book.id) {
                showAppAlert(
                    t("friendProfile.addErrorTitle"),
                    t("friendProfile.addErrorMessage")
                );
                return;
            }

            const { data: existingBook } = await supabase
                .from("user_books")
                .select("id")
                .eq("user_id", user.id)
                .eq("book_id", book.id)
                .maybeSingle();

            if (existingBook) {
                showAppAlert(
                    t("friendProfile.alreadyAddedTitle"),
                    t("friendProfile.alreadyAddedMessage")
                );
                return;
            }

            await addBookToUserLibrary(book.id, user.id, {
                status: "toRead",
                progress: 0,
                progressMode: "percentage",
            });

            triggerRefresh("books", "home");

            showAppAlert(
                t("friendProfile.addedTitle"),
                t("friendProfile.addedMessage")
            );

            setSelectedBook(null);
        } catch (error) {
            console.log("Error adding friend book:", error);
            showAppAlert(
                t("friendProfile.addErrorTitle"),
                t("friendProfile.addErrorMessage")
            );
        } finally {
            setIsAddingBook(false);
        }
    }

    useEffect(() => {
        fetchFriendProfile();
    }, [id]);

    const friendName = profile?.display_name ?? t("friendProfile.unknownUser");
    const currentBooks = readingProfile?.currentBooks ?? [];
    const tbr = readingProfile?.tbr ?? [];
    const readBooks = readingProfile?.readBooks ?? [];

    return (
        <SafeAreaView style={pageStyles.safeArea} edges={["top"]}>
            <ScreenTopBar
                title={t("friendProfile.title")}
                right={
                    <Pressable
                        style={[
                            styles.refreshButton,
                            loading && styles.refreshButtonDisabled,
                        ]}
                        onPress={fetchFriendProfile}
                        disabled={loading}
                    >
                        <Feather
                            name="refresh-cw"
                            size={16}
                            color={loading ? theme.colors.textMuted : theme.colors.accent}
                        />
                    </Pressable>
                }
            />

            <ScrollView
                style={pageStyles.screen}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >

                <View style={styles.profileCard}>
                    {profile ? (
                        <AvatarBubble
                            avatarId={profile.avatar_id}
                            backgroundColor={profile.avatar_background_color}
                            name={friendName}
                            size={76}
                        />
                    ) : (
                        <View style={styles.profileIconPlaceholder}>
                            <Feather
                                name="user"
                                size={28}
                                color={theme.colors.textMuted}
                            />
                        </View>
                    )}

                    <Text style={styles.profileName}>{friendName}</Text>

                    <Text style={styles.profileSubtitle}>
                        {t("friendProfile.sharedReadingInfo")}
                    </Text>
                </View>

                {loading ? (
                    <View style={styles.emptyStateCard}>
                        <Text style={styles.emptyStateText}>
                            {t("friendProfile.loading")}
                        </Text>
                    </View>
                ) : !canViewProfile ? (
                    <View style={styles.emptyStateCard}>
                        <Feather
                            name="lock"
                            size={18}
                            color={theme.colors.textMuted}
                        />
                        <Text style={styles.emptyStateText}>
                            {t("friendProfile.privateProfile")}
                        </Text>
                    </View>
                ) : (
                    <>
                        <View>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>
                                    {t("friendProfile.currentlyReading")}
                                </Text>
                                <Text style={styles.sectionCount}>{currentBooks.length}</Text>
                            </View>

                            {currentBooks.length > 0 ? (
                                currentBooks.map((book) => (
                                    <BookListCard
                                        key={book.userBookId}
                                        book={book}
                                        showProgress
                                        onPress={() => setSelectedBook(book)}
                                    />
                                ))
                            ) : (
                                <View style={styles.emptyStateCard}>
                                    <Feather
                                        name="coffee"
                                        size={18}
                                        color={theme.colors.textMuted}
                                    />
                                    <Text style={styles.emptyStateText}>
                                        {t("friendProfile.notReading")}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <CollapsibleBookSection
                            title={t("friendProfile.readBooks")}
                            books={readBooks}
                            isExpanded={isReadBooksExpanded}
                            onToggleExpanded={() => setIsReadBooksExpanded((current) => !current)}
                            emptyText={t("friendProfile.noReadBooks")}
                            emptyIcon="book-open"
                            showRating
                            onBookPress={setSelectedBook}
                        />

                        <CollapsibleBookSection
                            title={t("friendProfile.wantToRead")}
                            books={tbr}
                            isExpanded={isTbrExpanded}
                            onToggleExpanded={() => setIsTbrExpanded((current) => !current)}
                            emptyText={t("friendProfile.noTbr")}
                            emptyIcon="bookmark"
                            onBookPress={setSelectedBook}
                        />
                    </>
                )}
            </ScrollView>
            <Modal
                visible={Boolean(selectedBook)}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedBook(null)}
            >
                <KeyboardAvoidingView
                    style={styles.modalKeyboardView}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                >
                    <View style={styles.modalOverlay}>
                        <ScrollView
                            contentContainerStyle={styles.modalScrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={styles.modalCard}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>
                                        {t("friendProfile.bookDetails")}
                                    </Text>

                                    <Pressable
                                        onPress={() => setSelectedBook(null)}
                                        style={styles.modalCloseButton}
                                    >
                                        <Feather
                                            name="x"
                                            size={20}
                                            color={theme.colors.textMuted}
                                        />
                                    </Pressable>
                                </View>

                                {selectedBook ? (
                                    <>
                                        <View style={styles.selectedBookPreview}>
                                            <BookCover
                                                title={selectedBook.title}
                                                cover={selectedBook.coverUrl ?? undefined}
                                                small
                                            />

                                            <View style={styles.bookTextContent}>
                                                <Text style={styles.bookTitle}>
                                                    {selectedBook.title}
                                                </Text>

                                                {selectedBook.author ? (
                                                    <Text style={styles.bookAuthor}>
                                                        {selectedBook.author}
                                                    </Text>
                                                ) : null}

                                                {selectedBook.rating ? (
                                                    <View style={styles.ratingRow}>
                                                        <StarRatingDisplay value={selectedBook.rating} />
                                                    </View>
                                                ) : null}
                                            </View>
                                        </View>

                                        {selectedBook.review?.trim() ? (
                                            <View style={styles.modalSection}>
                                                <Text style={styles.modalSectionLabel}>
                                                    {t("friendProfile.review")}
                                                </Text>
                                                <Text style={styles.modalSectionText}>
                                                    {selectedBook.review.trim()}
                                                </Text>
                                            </View>
                                        ) : null}

                                        <View style={styles.modalButtonRow}>
                                            <Pressable
                                                style={styles.modalSecondaryButton}
                                                onPress={() => setSelectedBook(null)}
                                                disabled={isAddingBook}
                                            >
                                                <Text style={styles.modalSecondaryButtonText}>
                                                    {t("common.close")}
                                                </Text>
                                            </Pressable>

                                            <Pressable
                                                style={[
                                                    styles.modalPrimaryButton,
                                                    isAddingBook && styles.modalPrimaryButtonDisabled,
                                                ]}
                                                onPress={() => void handleAddFriendBookToTbr(selectedBook)}
                                                disabled={isAddingBook}
                                            >
                                                <Text style={styles.modalPrimaryButtonText}>
                                                    {isAddingBook
                                                        ? t("friendProfile.adding")
                                                        : t("friendProfile.addToMyTbr")}
                                                </Text>
                                            </Pressable>
                                        </View>
                                    </>
                                ) : null}
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

function CurrentBookCard({ book }: { book: ReadingBook }) {
    const theme = useAppTheme();
    const styles = createStyles(theme);

    const progress = book.progress ?? 0;

    return (
        <View style={styles.currentBookRow}>
            <BookCover
                cover={book.coverUrl ?? undefined}
                title={book.title}
            />

            <View style={styles.bookTextContent}>
                <Text style={styles.bookTitle}>{book.title}</Text>

                {book.author ? (
                    <Text style={styles.bookAuthor}>{book.author}</Text>
                ) : null}

                <View style={styles.progressRow}>
                    <Progress.Bar
                        progress={progress / 100}
                        width={null}
                        height={7}
                        color={theme.colors.accent}
                        unfilledColor={theme.colors.accentSoft}
                        borderWidth={0}
                        style={styles.progressBar}
                    />

                    <Text style={styles.progressText}>{progress}%</Text>
                </View>
            </View>
        </View>
    );
}

function CollapsibleBookSection({
                                    title,
                                    books,
                                    isExpanded,
                                    onToggleExpanded,
                                    emptyText,
                                    emptyIcon,
                                    showRating = false,
                                    onBookPress,
                                }: {
    title: string;
    books: ReadingBook[];
    isExpanded: boolean;
    onToggleExpanded: () => void;
    emptyText: string;
    emptyIcon: React.ComponentProps<typeof Feather>["name"];
    showRating?: boolean;
    onBookPress: (book: ReadingBook) => void;
}) {
    const theme = useAppTheme();
    const styles = createStyles(theme);

    const previewBooks = books.slice(0, COLLAPSED_PREVIEW_COUNT);

    return (
        <View style={styles.collapsibleBlock}>
            <Pressable
                style={({ pressed }) => [
                    styles.collapsibleHeaderCard,
                    pressed && styles.pressedCard,
                ]}
                onPress={onToggleExpanded}
            >
                <View style={styles.collapsibleHeaderText}>
                    <View style={styles.collapsibleTitleRow}>
                        <Text style={styles.sectionTitle}>{title}</Text>

                        <View style={styles.countPill}>
                            <Text style={styles.countPillText}>{books.length}</Text>
                        </View>
                    </View>

                    <Text style={styles.previewHint}>
                        {isExpanded
                            ? t("friendProfile.tapToCollapse")
                            : t("friendProfile.tapToExpand")}
                    </Text>
                </View>

                <Feather
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={theme.colors.accent}
                />
            </Pressable>

            {books.length === 0 ? (
                <View style={styles.emptyStateCard}>
                    <Feather
                        name={emptyIcon}
                        size={18}
                        color={theme.colors.textMuted}
                    />
                    <Text style={styles.emptyStateText}>{emptyText}</Text>
                </View>
            ) : isExpanded ? (
                books.map((book) => (
                    <BookListCard
                        key={book.userBookId}
                        book={book}
                        showRating={showRating}
                        onPress={() => onBookPress(book)}
                    />
                ))
            ) : (
                <Pressable
                    style={({ pressed }) => [
                        styles.previewStrip,
                        pressed && styles.pressedCard,
                    ]}
                    onPress={onToggleExpanded}
                >
                    {previewBooks.map((book) => (
                        <BookCover
                            key={book.userBookId}
                            title={book.title}
                            cover={book.coverUrl ?? undefined}
                            small
                        />
                    ))}

                    {books.length > COLLAPSED_PREVIEW_COUNT ? (
                        <View style={styles.previewMoreCard}>
                            <Text style={styles.previewMoreText}>
                                +{books.length - COLLAPSED_PREVIEW_COUNT}
                            </Text>
                        </View>
                    ) : null}
                </Pressable>
            )}
        </View>
    );
}

function BookListCard({
                          book,
                          showRating = false,
                          showProgress = false,
                          onPress,
                      }: {
    book: ReadingBook;
    showRating?: boolean;
    showProgress?: boolean;
    onPress?: () => void;
}) {
    const theme = useAppTheme();
    const styles = createStyles(theme);

    const progress = book.progress ?? 0;

    return (
        <Pressable
            style={({ pressed }) => [
                styles.listBookCard,
                pressed && onPress && styles.pressedCard,
            ]}
            onPress={onPress}
            disabled={!onPress}
        >
            <View style={styles.listBookTopRow}>
                <BookCover
                    title={book.title}
                    cover={book.coverUrl ?? undefined}
                    small
                />

                <View style={styles.bookTextContent}>
                    <Text style={styles.bookTitle}>{book.title}</Text>

                    {book.author ? (
                        <Text style={styles.bookAuthor}>{book.author}</Text>
                    ) : null}

                    {showProgress ? (
                        <View style={styles.progressRow}>
                            <Progress.Bar
                                progress={progress / 100}
                                width={null}
                                height={7}
                                color={theme.colors.accent}
                                unfilledColor={theme.colors.accentSoft}
                                borderWidth={0}
                                style={styles.progressBar}
                            />

                            <Text style={styles.progressText}>{progress}%</Text>
                        </View>
                    ) : null}

                    {showRating && book.rating ? (
                        <View style={styles.ratingRow}>
                            <StarRatingDisplay value={book.rating} />
                        </View>
                    ) : null}
                </View>
            </View>

            {showRating && book.review?.trim() ? (
                <View style={styles.reviewNoteBox}>
                    <Feather
                        name="message-square"
                        size={14}
                        color={theme.colors.accent}
                    />

                    <Text style={styles.reviewNoteText} numberOfLines={3}>
                        {book.review.trim()}
                    </Text>
                </View>
            ) : null}
            {onPress ? (
                <Text style={styles.tapForDetailsText}>
                    {t("addBook.tapForDetails")}
                </Text>
            ) : null}
        </Pressable>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        collapsibleBlock: {
            gap: theme.spacing.sm,
        },

        collapsibleHeaderCard: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            gap: theme.spacing.md,
        },

        pressedCard: {
            opacity: 0.75,
        },

        collapsibleHeaderText: {
            flex: 1,
            gap: 3,
        },

        collapsibleTitleRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
        },

        countPill: {
            minWidth: 26,
            height: 24,
            borderRadius: 12,
            backgroundColor: theme.colors.accentSoft,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 8,
        },

        countPillText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
        },

        previewHint: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
        },

        previewStrip: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
        },

        previewMoreCard: {
            width: 46,
            height: 68,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.accentSoft,
            alignItems: "center",
            justifyContent: "center",
        },

        previewMoreText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },

        tapForDetailsText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.medium,
            marginTop: theme.spacing.xs,
        },
        collapsibleSectionHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: theme.spacing.sm,
        },

        collapsedHint: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
        },

        showMoreButton: {
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.border,
            paddingVertical: 12,
            marginTop: theme.spacing.xs,
        },

        showMoreText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        listBookCard: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.sm,
            gap: theme.spacing.md,
        },

        listBookTopRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.md,
        },

        reviewNoteBox: {
            flexDirection: "row",
            alignItems: "flex-start",
            gap: theme.spacing.xs,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.sm,
        },

        reviewNoteText: {
            flex: 1,
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
        },
        content: {
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.md,
            paddingBottom: 130,
            gap: theme.spacing.lg,
        },
        headerRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        backButton: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.border,
            alignItems: "center",
            justifyContent: "center",
        },
        headerTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.md,
            fontWeight: theme.typography.fontWeight.semibold,
        },
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
        profileCard: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.lg,
            alignItems: "center",
            gap: theme.spacing.sm,
        },
        profileIconPlaceholder: {
            width: 76,
            height: 76,
            borderRadius: 38,
            backgroundColor: theme.colors.accentSoft,
            alignItems: "center",
            justifyContent: "center",
        },
        profileName: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.bold,
        },
        profileSubtitle: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
        },
        refreshButtonDisabled: {
            opacity: 0.6,
        },
        currentBookRow: {
            flexDirection: "row",
            gap: theme.spacing.md,
            alignItems: "center",
            marginBottom: theme.spacing.sm,
        },
        bookTextContent: {
            flex: 1,
            gap: 2,
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
        progressRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            marginTop: theme.spacing.sm,
        },
        progressBar: {
            flex: 1,
        },
        progressText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
            minWidth: 34,
            textAlign: "right",
        },
        sectionHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: theme.spacing.sm,
        },
        sectionTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        sectionCount: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        ratingRow: {
            marginTop: theme.spacing.xs,
        },
        emptyState: {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
        },
        emptyStateCard: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
        },
        emptyStateText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
        },
        ratingReviewSection: {
            marginTop: theme.spacing.xs,
            gap: theme.spacing.sm,
        },

        reviewBox: {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.sm,
            gap: 3,
        },

        reviewLabel: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
        },

        reviewText: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 19,
        },

        modalKeyboardView: {
            flex: 1,
        },

        modalOverlay: {
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.35)",
        },

        modalScrollContent: {
            flexGrow: 1,
            justifyContent: "center",
            padding: theme.spacing.lg,
        },

        modalCard: {
            width: "100%",
            maxWidth: 420,
            backgroundColor: theme.colors.background,
            borderRadius: theme.radius.lg,
            padding: theme.spacing.lg,
            gap: theme.spacing.md,
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

        selectedBookPreview: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.md,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
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

        modalButtonRow: {
            flexDirection: "row",
            justifyContent: "flex-end",
            gap: theme.spacing.sm,
            marginTop: theme.spacing.sm,
        },

        modalSecondaryButton: {
            borderRadius: theme.radius.pill,
            paddingHorizontal: 14,
            paddingVertical: 10,
        },

        modalSecondaryButtonText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },

        modalPrimaryButton: {
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 14,
            paddingVertical: 10,
        },

        modalPrimaryButtonDisabled: {
            opacity: 0.7,
        },

        modalPrimaryButtonText: {
            color: "#FFFFFF",
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
    });
}