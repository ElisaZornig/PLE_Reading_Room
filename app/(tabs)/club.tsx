import { Feather } from '@expo/vector-icons';
import {router, useFocusEffect} from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Progress from 'react-native-progress';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/src/components/AppHeader';
import { BookCover } from '@/src/components/BookCover';
import { t } from '@/src/i18n';
import { fetchClubOverviewFromSupabase, type ClubOverview } from '@/src/services/supabaseClub';
import { AppTheme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';

export default function ClubScreen() {
    const theme = useAppTheme();
    const styles = createStyles(theme);

    const [club, setClub] = useState<ClubOverview | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    function showPlaceholder(title: string) {
        Alert.alert(title, 'This is the next screen we can build after this page.');
    }

    async function loadClub() {
        try {
            const clubData = await fetchClubOverviewFromSupabase();
            setClub(clubData);
        } catch (error) {
            console.error('Error loading club data:', error);
            setClub(null);
        } finally {
            setIsLoading(false);
        }
    }

    useFocusEffect(
        useCallback(() => {
            setIsLoading(true);
            loadClub();
        }, [])
    );

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
                <AppHeader />
                <View style={styles.stateWrapper}>
                    <Text style={styles.stateText}>Club loading...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!club) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
                <AppHeader />
                <View style={styles.screen}>
                    <View style={styles.content}>
                        <View style={styles.emptyCard}>
                            <Text style={styles.pageTitle}>Your club</Text>
                            <Text style={styles.emptyText}>
                                You are not in a book club yet. The next step can be a create or join flow.
                            </Text>
                            <Pressable style={styles.secondaryButton} onPress={() => router.push('/create-club')}>
                                <Text style={styles.secondaryButtonText}>+ Create a club</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    const daysUntilMeeting = getDaysUntil(club.nextMeeting?.meetingDate);

    return (
        <SafeAreaView
            style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
            edges={['top']}
        >
            <AppHeader />

            <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
                <View style={styles.pageHeader}>
                    <Text style={styles.pageTitle}>{club.name}</Text>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{club.memberCount}</Text>
                        <Text style={styles.statLabel}>{t('club.members')}</Text>
                    </View>

                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{club.averageProgress}%</Text>
                        <Text style={styles.statLabel}>{t('club.read')}</Text>
                    </View>

                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{daysUntilMeeting ?? '-'}</Text>
                        <Text style={styles.statLabel}>{t('club.days')}</Text>
                    </View>
                </View>

                <View style={styles.sectionCard}>
                    <Text style={styles.sectionLabel}>{t('club.currentBook')}</Text>

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
                                    <Text style={styles.bookMeta}>Current group progress: {club.averageProgress}%</Text>

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
                                </View>
                            </View>

                            <Pressable
                                style={styles.secondaryButton}
                                onPress={() =>
                                    router.push({
                                        pathname: "/set-current-book",
                                        params: { clubId: club.id },
                                    })
                                }
                            >
                                <Text style={styles.secondaryButtonText}>
                                    {club.currentBook ? "Change current book" : "+ Set current book"}
                                </Text>
                            </Pressable>
                        </>
                    ) : (
                        <>
                            <Text style={styles.emptyText}>No current club book yet.</Text>
                            <Pressable
                                style={styles.secondaryButton}
                                onPress={() =>
                                    router.push({
                                        pathname: "/set-current-book",
                                        params: { clubId: club.id },
                                    })
                                }
                            >
                                <Text style={styles.secondaryButtonText}>
                                    {club.currentBook ? "Change current book" : "+ Set current book"}
                                </Text>
                            </Pressable>
                        </>
                    )}
                </View>

                <View style={styles.sectionCard}>
                    <Text style={styles.sectionLabel}>{t('club.nextMeeting')}</Text>

                    {club.nextMeeting ? (
                        <>
                            <View style={styles.meetingRow}>
                                <View style={styles.meetingIconWrap}>
                                    <Feather name="calendar" size={18} color={theme.colors.accent} />
                                </View>

                                <View style={styles.meetingInfo}>
                                    <Text style={styles.meetingDate}>{formatMeetingLabel(club.nextMeeting.meetingDate)}</Text>
                                    {!!club.nextMeeting.location && (
                                        <Text style={styles.meetingLocation}>{club.nextMeeting.location}</Text>
                                    )}
                                </View>
                            </View>

                            <Pressable
                                style={styles.secondaryButton}
                                onPress={() =>
                                    router.push({
                                        pathname: '/plan-meeting',
                                        params: { clubId: club.id },
                                    })
                                }
                            >
                                <Text style={styles.secondaryButtonText}>+ {t('club.planMeeting')}</Text>
                            </Pressable>
                        </>
                    ) : (
                        <>
                            <Text style={styles.emptyText}>No meeting planned yet.</Text>
                            <Pressable
                                style={styles.secondaryButton}
                                onPress={() =>
                                    router.push({
                                        pathname: '/plan-meeting',
                                        params: { clubId: club.id },
                                    })
                                }
                            >
                                <Text style={styles.secondaryButtonText}>+ {t('club.planMeeting')}</Text>
                            </Pressable>
                        </>
                    )}
                </View>

                <Pressable style={styles.linkCard} onPress={() => showPlaceholder(t('club.progress'))}>
                    <View>
                        <Text style={styles.sectionLabel}>{t('club.progress')}</Text>
                        <Text style={styles.linkSubtitle}>{club.memberCount} members in this club</Text>
                    </View>

                    <Feather name="chevron-right" size={20} color={theme.colors.accent} />
                </Pressable>

                <Pressable style={styles.linkCard} onPress={() =>
                    router.push({
                        pathname: "/discussion",
                        params: {
                            clubId: club.id,
                        },
                    })
                }>
                    <View>
                        <Text style={styles.sectionLabel}>{t('club.discussion')}</Text>
                        <Text style={styles.linkSubtitle}>{t('club.activeQuestions', { count: club.activeQuestionCount })}</Text>
                        <Text style={styles.linkSubtitle}>{t('club.shareThoughts')}</Text>
                    </View>

                    <Feather name="chevron-right" size={20} color={theme.colors.accent} />
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}

function getDaysUntil(isoDate?: string) {
    if (!isoDate) {
        return null;
    }

    const today = new Date();
    const meetingDate = new Date(isoDate);
    const differenceInMs = meetingDate.getTime() - today.getTime();
    return Math.max(0, Math.ceil(differenceInMs / (1000 * 60 * 60 * 24)));
}

function formatMeetingLabel(isoDate: string) {
    const date = new Date(isoDate);

    return new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        safeArea: {
            flex: 1,
        },
        screen: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        content: {
            padding: theme.spacing.lg,
            gap: theme.spacing.md,
        },
        stateWrapper: {
            flex: 1,
            paddingHorizontal: theme.spacing.lg,
            justifyContent: 'center',
        },
        stateText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.md,
            textAlign: 'center',
        },
        emptyCard: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            gap: theme.spacing.md,
        },
        emptyText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
        },
        pageHeader: {
            marginBottom: theme.spacing.xs,
        },
        pageTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        statsRow: {
            flexDirection: 'row',
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
            alignItems: 'center',
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
        sectionCard: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            gap: theme.spacing.md,
        },
        sectionLabel: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.md,
            marginBottom: 4,
        },
        bookRow: {
            flexDirection: 'row',
            gap: theme.spacing.md,
            alignItems: 'flex-start',
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
        bookMeta: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
        },
        progressWrap: {
            marginTop: theme.spacing.sm,
            gap: theme.spacing.xs,
        },
        progressBar: {
            width: '100%',
        },
        secondaryButton: {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.border,
            paddingVertical: 12,
            alignItems: 'center',
            justifyContent: 'center',
        },
        secondaryButtonText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
        },
        meetingRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
        },
        meetingIconWrap: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.colors.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
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
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: theme.spacing.md,
        },
        linkSubtitle: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
        },
    });
}