import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { t } from "@/src/i18n";
import { supabase } from "@/src/services/supabase";
import {
    ThemePreference,
    useAppThemeContext,
} from "@/src/theme/AppThemeProvider";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import { showAppAlert } from "@/src/utils/appAlert";
import {
    GENRE_OPTIONS,
    LANGUAGE_OPTIONS,
} from "@/src/constants/readingPreferences";



const THEME_OPTIONS: ThemePreference[] = ["system", "light", "dark", "green"];

type ProfilePreferences = {
    id: string;
    favorite_genres: string[] | null;
    preferred_languages: string[] | null;
    app_theme: ThemePreference | null;
};

export default function ProfilePreferencesScreen() {
    const theme = useAppTheme();
    const styles = createStyles(theme);
    const { themePreference, setThemePreference } = useAppThemeContext();

    const [profile, setProfile] = useState<ProfilePreferences | null>(null);
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
    const [selectedTheme, setSelectedTheme] =
        useState<ThemePreference>(themePreference);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    async function fetchPreferences() {
        setLoading(true);

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            router.replace("/auth");
            return;
        }

        const { data, error } = await supabase
            .from("profiles")
            .select("id, favorite_genres, preferred_languages, app_theme")
            .eq("id", user.id)
            .single();

        if (!error && data) {
            const appTheme =
                data.app_theme === "light" ||
                data.app_theme === "dark" ||
                data.app_theme === "system" ||
                data.app_theme === "green"
                    ? data.app_theme
                    : "system";

            setProfile(data as ProfilePreferences);
            setSelectedGenres(data.favorite_genres ?? []);
            setSelectedLanguages(data.preferred_languages ?? []);
            setSelectedTheme(appTheme);
        }

        setLoading(false);
    }

    function toggleGenre(genre: string) {
        setSelectedGenres((currentGenres) =>
            currentGenres.includes(genre)
                ? currentGenres.filter((item) => item !== genre)
                : [...currentGenres, genre]
        );
    }

    function toggleLanguage(language: string) {
        setSelectedLanguages((currentLanguages) =>
            currentLanguages.includes(language)
                ? currentLanguages.filter((item) => item !== language)
                : [...currentLanguages, language]
        );
    }

    async function selectTheme(themeOption: ThemePreference) {
        setSelectedTheme(themeOption);
        await setThemePreference(themeOption);
    }

    async function savePreferences() {
        if (!profile) return;

        setSaving(true);

        const { error } = await supabase
            .from("profiles")
            .update({
                favorite_genres: selectedGenres,
                preferred_languages: selectedLanguages,
                app_theme: selectedTheme,
            })
            .eq("id", profile.id);

        if (error) {
            setSaving(false);
            showAppAlert(
                t("profilePreferences.errorTitle"),
                t("profilePreferences.errorMessage")
            );
            return;
        }

        await setThemePreference(selectedTheme);

        setSaving(false);
        router.back();
    }

    useEffect(() => {
        void fetchPreferences();
    }, []);

    if (loading) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>
                    {t("profilePreferences.loading")}
                </Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <ScrollView
                style={styles.screen}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.topRow}>
                    <Pressable style={styles.iconButton} onPress={() => router.back()}>
                        <Feather name="arrow-left" size={20} color={theme.colors.text} />
                    </Pressable>

                    <Text style={styles.pageTitle}>
                        {t("profilePreferences.title")}
                    </Text>

                    <View style={styles.iconButtonPlaceholder} />
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>
                        {t("profilePreferences.favoriteGenres")}
                    </Text>

                    <View style={styles.chipGrid}>
                        {GENRE_OPTIONS.map((genre) => {
                            const isSelected = selectedGenres.includes(genre.value);

                            return (
                                <Pressable
                                    key={genre.value}
                                    onPress={() => toggleGenre(genre.value)}
                                    style={[
                                        styles.chip,
                                        isSelected && styles.chipSelected,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.chipText,
                                            isSelected && styles.chipTextSelected,
                                        ]}
                                    >
                                        {genre.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>
                        {t("profilePreferences.preferredLanguages")}
                    </Text>

                    <View style={styles.chipGrid}>
                        {LANGUAGE_OPTIONS.map((language) => {
                            const isSelected = selectedLanguages.includes(language.value);

                            return (
                                <Pressable
                                    key={language.value}
                                    onPress={() => toggleLanguage(language.value)}
                                    style={[
                                        styles.chip,
                                        isSelected && styles.chipSelected,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.chipText,
                                            isSelected && styles.chipTextSelected,
                                        ]}
                                    >
                                        {language.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>
                        {t("profilePreferences.appearance")}
                    </Text>

                    <View style={styles.optionList}>
                        {THEME_OPTIONS.map((themeOption) => {
                            const isSelected = selectedTheme === themeOption;

                            return (
                                <Pressable
                                    key={themeOption}
                                    onPress={() => void selectTheme(themeOption)}
                                    style={[
                                        styles.optionRow,
                                        isSelected && styles.optionRowSelected,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.optionText,
                                            isSelected && styles.optionTextSelected,
                                        ]}
                                    >
                                        {t(`profilePreferences.${themeOption}`)}
                                    </Text>

                                    {isSelected && (
                                        <Feather
                                            name="check"
                                            size={18}
                                            color={theme.colors.text}
                                        />
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>
                </View>

                <Pressable
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                    onPress={savePreferences}
                    disabled={saving}
                >
                    <Text style={styles.saveButtonText}>
                        {saving
                            ? t("profilePreferences.saving")
                            : t("profilePreferences.save")}
                    </Text>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
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
        },
        content: {
            padding: theme.spacing.lg,
            paddingBottom: 40,
        },
        center: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.background,
        },
        loadingText: {
            marginTop: theme.spacing.sm,
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
        },
        topRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: theme.spacing.lg,
        },
        iconButton: {
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
        },
        iconButtonPlaceholder: {
            width: 44,
            height: 44,
        },
        pageTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        card: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.lg,
            marginBottom: theme.spacing.lg,
        },
        sectionTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
            marginBottom: theme.spacing.md,
        },
        chipGrid: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: theme.spacing.sm,
        },
        chip: {
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
        },
        chipSelected: {
            borderColor: theme.colors.accent,
            backgroundColor: theme.colors.accentSoft,
        },
        chipText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
        },
        chipTextSelected: {
            color: theme.colors.text,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        optionList: {
            gap: theme.spacing.sm,
        },
        optionRow: {
            minHeight: 48,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
            paddingHorizontal: theme.spacing.md,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        optionRowSelected: {
            borderColor: theme.colors.accent,
            backgroundColor: theme.colors.accentSoft,
        },
        optionText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.md,
            fontWeight: theme.typography.fontWeight.medium,
        },
        optionTextSelected: {
            color: theme.colors.text,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        saveButton: {
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.pill,
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 14,
        },
        saveButtonDisabled: {
            opacity: 0.6,
        },
        saveButtonText: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.md,
            fontWeight: theme.typography.fontWeight.semibold,
        },
    });
}