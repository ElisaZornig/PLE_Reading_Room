import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getAvatarById } from "@/src/constants/avatars";
import { t } from "@/src/i18n";
import { supabase } from "@/src/services/supabase";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import {
    ThemePreference,
    useAppThemeContext,
} from "@/src/theme/AppThemeProvider";

type Profile = {
    id: string;
    display_name: string | null;
    avatar_id: string | null;
    avatar_background_color: string | null;
    favorite_genres: string[] | null;
    preferred_languages: string[] | null;
    app_theme: ThemePreference | "light" | "dark" | null;
};

export default function ProfileScreen() {
    const theme = useAppTheme();
    const styles = createStyles(theme);

    const [profile, setProfile] = useState<Profile | null>(null);
    const [email, setEmail] = useState("");
    const [clubCount, setClubCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const { setThemePreference } = useAppThemeContext();
    function getAppearanceLabel(appTheme: Profile["app_theme"]) {
        if (appTheme === "green") {
            return t("profile.green");
        }

        if (appTheme === "yellow") {
            return t("profile.yellow");
        }

        return t("profile.system");
    }

    async function fetchProfile() {
        setLoading(true);

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            router.replace("/auth");
            return;
        }

        setEmail(user.email ?? "");

        const { data, error } = await supabase
            .from("profiles")
            .select(
                "id, display_name, avatar_id, avatar_background_color, favorite_genres, preferred_languages, app_theme"
            )
            .eq("id", user.id)
            .single();

        if (!error && data) {
            setProfile(data);
        }

        const { count } = await supabase
            .from("book_club_members")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id);

        setClubCount(count ?? 0);
        setLoading(false);
    }

    async function handleLogout() {
        await supabase.auth.signOut();
        await setThemePreference("system");
        router.replace("/auth");
    }

    useFocusEffect(
        useCallback(() => {
            void fetchProfile();
        }, [])
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>{t("profile.loading")}</Text>
            </SafeAreaView>
        );
    }

    const selectedAvatar = getAvatarById(profile?.avatar_id);
    const avatarBackground =
        profile?.avatar_background_color || theme.colors.accentSoft;

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

                    <Text style={styles.pageTitle}>{t("profile.title")}</Text>

                    <View style={styles.iconButtonPlaceholder} />
                </View>

                <View style={styles.headerCard}>
                    <View style={styles.avatarArea}>
                        <View
                            style={[
                                styles.avatarCircle,
                                { backgroundColor: profile?.avatar_background_color || theme.colors.accentSoft },
                            ]}
                        >
                            <Image source={selectedAvatar.image} style={styles.avatarImage} />
                        </View>

                        <Pressable
                            style={styles.editAvatarButton}
                            onPress={() => router.push("/profile-avatar")}
                        >
                            <Feather name="edit-2" size={16} color={theme.colors.text} />
                        </Pressable>
                    </View>

                    <Text style={styles.name}>
                        {profile?.display_name?.trim() || t("profile.defaultName")}
                    </Text>

                    <Text style={styles.subtitle}>{t("profile.subtitle")}</Text>
                </View>
                <Pressable
                    style={styles.card}
                    onPress={() => router.push("/profile-preferences")}
                >
                    <View style={styles.cardHeaderRow}>
                        <Text style={styles.sectionTitle}>{t("profile.readingProfile")}</Text>

                        <View style={styles.smallEditButton}>
                            <Feather name="edit-2" size={15} color={theme.colors.textMuted} />
                        </View>
                    </View>

                    <Text style={styles.hintText}>{t("profile.recommendationHint")}</Text>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>{t("profile.favoriteGenres")}</Text>
                        <Text style={styles.infoValue}>
                            {profile?.favorite_genres?.length
                                ? profile.favorite_genres.join(", ")
                                : t("profile.notSetYet")}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>{t("profile.preferredLanguages")}</Text>
                        <Text style={styles.infoValue}>
                            {profile?.preferred_languages?.length
                                ? profile.preferred_languages.join(", ")
                                : t("profile.notSetYet")}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>{t("profile.appearance")}</Text>
                        <Text style={styles.infoValue}>
                            {getAppearanceLabel(profile?.app_theme ?? "system")}
                        </Text>
                    </View>
                </Pressable>

                <Pressable
                    style={styles.card}
                    onPress={() => router.push("/profile-account")}
                >
                    <View style={styles.cardHeaderRow}>
                        <Text style={styles.sectionTitle}>{t("profile.account")}</Text>

                        <View style={styles.smallEditButton}>
                            <Feather name="edit-2" size={15} color={theme.colors.textMuted} />
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>{t("profile.name")}</Text>
                        <Text style={styles.infoValue}>
                            {profile?.display_name?.trim() || t("profile.defaultName")}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>{t("profile.email")}</Text>
                        <Text style={styles.infoValue} numberOfLines={1}>
                            {email}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>{t("profile.password")}</Text>
                        <Text style={styles.infoValue}>{t("profile.passwordHidden")}</Text>
                    </View>

                    <Pressable style={styles.logoutButton} onPress={handleLogout}>
                        <Feather name="log-out" size={18} color={theme.colors.danger} />
                        <Text style={styles.logoutText}>{t("profile.logout")}</Text>
                    </Pressable>
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
        cardHeaderRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: theme.spacing.md,
        },

        smallEditButton: {
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
        },

        accountSummary: {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.md,
        },

        infoRowLast: {
            marginBottom: 0,
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
        headerCard: {
            alignItems: "center",
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.xl,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.xl,
            marginBottom: theme.spacing.lg,
        },
        avatarArea: {
            position: "relative",
            marginBottom: theme.spacing.md,
        },
        avatarCircle: {
            width: 124,
            height: 124,
            borderRadius: 62,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
        },
        avatarImage: {
            width: 92,
            height: 92,
            resizeMode: "contain",
        },
        editAvatarButton: {
            position: "absolute",
            right: -2,
            bottom: 4,
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
        },
        nameRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
        },
        name: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        editNameButton: {
            width: 30,
            height: 30,
            borderRadius: 15,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
        },
        subtitle: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            marginTop: 4,
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
        },
        hintText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: theme.typography.lineHeight.sm,
            marginBottom: theme.spacing.lg,
        },
        infoRow: {
            marginBottom: theme.spacing.md,
        },
        infoLabel: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            marginBottom: 2,
        },
        infoValue: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.md,
            fontWeight: theme.typography.fontWeight.medium,
        },
        statBox: {
            alignSelf: "flex-start",
            minWidth: 96,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.lg,
            alignItems: "center",
        },
        statNumber: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.xxl,
            fontWeight: theme.typography.fontWeight.bold,
        },
        statLabel: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            marginTop: 2,
        },
        accountRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.md,
        },
        accountTextWrap: {
            flex: 1,
            marginRight: theme.spacing.md,
        },
        accountTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.md,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        accountSubtitle: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            marginTop: 2,
        },
        logoutButton: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: theme.spacing.sm,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.danger,
            paddingVertical: 12,
        },
        logoutText: {
            color: theme.colors.danger,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
    });
}