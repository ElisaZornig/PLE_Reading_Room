import { Feather } from "@expo/vector-icons";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BookCover } from "@/src/components/BookCover";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { getStoredBooks } from "@/src/services/bookStorage";
import { Book } from "@/src/types/book";import { t } from "@/src/i18n";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import * as Progress from 'react-native-progress';
import {AppHeader} from "@/src/components/AppHeader";
import { router } from "expo-router";
import { useRef } from "react";
import {fetchUserBooksFromSupabase} from "@/src/services/supabaseUserBooks";


export default function HomeScreen() {
    const [books, setBooks] = useState<Book[]>([]);
    const theme = useAppTheme();
    const styles = createStyles(theme);

    const booksSortedByUpdated = [...books].sort((a, b) => {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bTime - aTime;
    });

    const currentBook = booksSortedByUpdated.find(
        (book) => book.status === "reading"
    );

    const listBooks = booksSortedByUpdated
        .filter((book) => book.id !== currentBook?.id)
        .slice(0, 3);

    const clubBook = booksSortedByUpdated.find(
        (book) => book.id !== currentBook?.id
    );
    const listCardScale = useRef(new Animated.Value(1)).current;

    const animateIn = () => {
        Animated.spring(listCardScale, {
            toValue: 0.97,
            useNativeDriver: true,
        }).start();
    };

    const animateOut = () => {
        Animated.spring(listCardScale, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    };
    async function loadBooks() {
        try {
            const supabaseBooks = await fetchUserBooksFromSupabase();
            setBooks(supabaseBooks);
        } catch (error) {
            console.error("Fout bij ophalen van home boeken uit Supabase:", error);
            setBooks([]);
        }
    }

    useFocusEffect(
        useCallback(() => {
            loadBooks();
        }, [])
    );
    return (
        <SafeAreaView
            style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
            edges={["top"]}
        >
            <AppHeader />

            <ScrollView
                style={styles.screen}
                contentContainerStyle={styles.content}
            >

                    <Text style={styles.title}>{t("home.welcome", { name: "Elisa" })}</Text>
                    <Text style={styles.subtitle}>{t("home.subtitle")}</Text>

                    {currentBook && (
                        <View style={styles.bookRow}>
                            <View style={styles.bookInfo}>
                                <Text style={styles.label}>{t("home.currentlyReading")}</Text>
                                <Text style={styles.bookTitle}>{currentBook.title}</Text>
                                <Text style={styles.bookMeta}>{currentBook.author}</Text>
                                <Text style={styles.bookMeta}>
                                    {currentBook.progress}% • {t("home.page")} {currentBook.currentPage} {t("home.pageOf")}{" "}
                                    {currentBook.totalPages}
                                </Text>
                                <Progress.Bar
                                    progress={(currentBook.progress ?? 0) / 100}
                                    width={230}
                                    borderColor={theme.colors.surface}
                                    unfilledColor={theme.colors.border}
                                    color={theme.colors.accent}
                                />
                            </View>

                            <BookCover title={currentBook.title} cover={currentBook.cover} />
                        </View>
                    )}
                {clubBook && (
                    <View style={styles.bookRow}>
                        <View style={styles.bookInfo}>
                            <Text style={styles.label}>{t("home.clubSection")}</Text>
                            <Text style={styles.bookTitle}>{clubBook.title}</Text>
                            <Text style={styles.bookMeta}>{clubBook.author}</Text>
                            <Text style={styles.bookMeta}>
                                {t("home.nextMeeting")}: vrijdag 26 april
                            </Text>
                            <View style={styles.avatarRow}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>E</Text>
                                </View>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>S</Text>
                                </View>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>M</Text>
                                </View>
                                <View style={styles.avatarMore}>
                                    <Text style={styles.avatarMoreText}>+3</Text>
                                </View>
                            </View>
                            {/*<Pressable style={styles.smallButton}>*/}
                            {/*    <Text style={styles.smallButtonText}>Bekijk club</Text>*/}
                            {/*</Pressable>*/}
                        </View>

                        <BookCover title={clubBook.title} cover={clubBook.cover} />
                    </View>
                )}
                <Pressable
                    onPress={() => router.push("/books")}
                    onPressIn={animateIn}
                    onPressOut={animateOut}
                >
                    <Animated.View
                        style={[
                            styles.listCard,
                            {
                                transform: [{ scale: listCardScale }],
                            },
                        ]}
                    >
                        <View style={styles.listHeader}>
                            <Text style={styles.label}>{t("home.booksOnList")}</Text>

                            <View style={styles.arrowButton}>
                                <Feather
                                    name="chevron-right"
                                    size={theme.spacing.xl}
                                    color={theme.colors.accent}
                                />
                            </View>
                        </View>

                        <View style={styles.listRow}>
                            {listBooks.map((book) => (
                                <BookCover
                                    key={book.id}
                                    title={book.title}
                                    cover={book.cover}
                                />
                            ))}
                        </View>
                    </Animated.View>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        safeArea: {
            flex: 1,
        },
        screen: {
            flex: 1,
            backgroundColor: theme.colors.background,
            display: "flex",
        },
        content: {
            padding: theme.spacing.lg,
        },
        topBar: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: theme.colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            marginHorizontal: -theme.spacing.lg,
            marginTop: -theme.spacing.lg,
            marginBottom: theme.spacing.lg,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: 14,
        },
        brandRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
        },
        logoBox: {
            width: 42,
            height: 42,
            borderRadius: 10,
            backgroundColor: theme.colors.accent,
            alignItems: "center",
            justifyContent: "center",
        },
        brand: {
            color: theme.colors.text,
            fontSize: 18,
            fontWeight: "500",
        },
        profileButton: {
            width: 40,
            height: 40,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: theme.colors.text,
            alignItems: "center",
            justifyContent: "center",
        },
        card: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.lg,
        },
        title: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.bold,
            marginBottom: 4,
        },
        subtitle: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            marginBottom: theme.spacing.lg,
        },
        bookRow: {
            flexDirection: "row",
            gap: theme.spacing.md,
            alignItems: "center",
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.md,
        },
        bookInfo: {
            flex: 1,
        },
        label: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.md,
            marginBottom: 4,
        },
        bookTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
            marginBottom: 4,
        },
        bookMeta: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            marginBottom: 8,
        },
        smallButton: {
            marginTop: theme.spacing.sm,
            alignSelf: "flex-start",
            backgroundColor: theme.colors.accentSoft,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 12,
            paddingVertical: 8,
        },
        smallButtonText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        avatarText: {
            color: theme.colors.accent,
            fontSize: 11,
            fontWeight: "700",
        },
        avatarMore: {
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: theme.colors.accent,
            alignItems: "center",
            justifyContent: "center",
            marginLeft: 6,
        },
        avatarMoreText: {
            color: "#FFFFFF",
            fontSize: 11,
            fontWeight: "700",
        },
        avatarRow: {
            flexDirection: "row",
            alignItems: "center",
            marginTop: theme.spacing.xs,
        },
        avatar: {
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: theme.colors.accentSoft,
            borderWidth: 1,
            borderColor: theme.colors.border,
            alignItems: "center",
            justifyContent: "center",
            marginRight: -6,
        },
        listCard: {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
        },
        listRow: {
            flexDirection: "row",
            gap: theme.spacing.sm,
            marginTop: theme.spacing.sm,
        },
        listHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
        },
        arrowButton: {
            width: 28,
            height: 28,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
        },
    });

}