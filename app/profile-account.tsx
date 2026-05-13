import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { t } from "@/src/i18n";
import { supabase } from "@/src/services/supabase";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import { showAppAlert } from "@/src/utils/appAlert";

export default function ProfileAccountScreen() {
    const theme = useAppTheme();
    const styles = createStyles(theme);

    const [userId, setUserId] = useState<string | null>(null);
    const [currentEmail, setCurrentEmail] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");

    const [loading, setLoading] = useState(true);
    const [savingName, setSavingName] = useState(false);
    const [savingEmail, setSavingEmail] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    async function fetchAccount() {
        setLoading(true);

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            router.replace("/auth");
            return;
        }

        setUserId(user.id);
        setCurrentEmail(user.email ?? "");
        setNewEmail(user.email ?? "");

        const { data, error } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", user.id)
            .single();

        if (!error && data) {
            setDisplayName(data.display_name ?? "");
        }

        setLoading(false);
    }

    async function updateDisplayName() {
        if (!userId) return;

        setSavingName(true);

        const { error } = await supabase
            .from("profiles")
            .update({ display_name: displayName.trim() })
            .eq("id", userId);

        setSavingName(false);

        if (error) {
            showAppAlert(t("profileAccount.errorTitle"), error.message);
            return;
        }

        showAppAlert(
            t("profileAccount.savedTitle"),
            t("profileAccount.savedNameMessage")
        );
    }

    async function updateEmail() {
        const trimmedEmail = newEmail.trim();

        if (!trimmedEmail || trimmedEmail === currentEmail) return;

        setSavingEmail(true);

        const { error } = await supabase.auth.updateUser({
            email: trimmedEmail,
        });

        setSavingEmail(false);

        if (error) {
            showAppAlert(t("profileAccount.errorTitle"), error.message);
            return;
        }

        showAppAlert(
            t("profileAccount.savedTitle"),
            t("profileAccount.savedEmailMessage")
        );

        setCurrentEmail(trimmedEmail);
    }

    async function updatePassword() {
        if (newPassword.length < 6) {
            showAppAlert(
                t("profileAccount.errorTitle"),
                t("profileAccount.passwordTooShort")
            );
            return;
        }

        setSavingPassword(true);

        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        setSavingPassword(false);

        if (error) {
            showAppAlert(t("profileAccount.errorTitle"), error.message);
            return;
        }

        setNewPassword("");

        showAppAlert(
            t("profileAccount.savedTitle"),
            t("profileAccount.savedPasswordMessage")
        );
    }

    useEffect(() => {
        void fetchAccount();
    }, []);

    if (loading) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>{t("profileAccount.loading")}</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <ScrollView
                style={styles.screen}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.topRow}>
                    <Pressable style={styles.iconButton} onPress={() => router.back()}>
                        <Feather name="arrow-left" size={20} color={theme.colors.text} />
                    </Pressable>

                    <Text style={styles.pageTitle}>{t("profileAccount.title")}</Text>

                    <View style={styles.iconButtonPlaceholder} />
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>
                        {t("profileAccount.displayName")}
                    </Text>

                    <Text style={styles.label}>{t("profileAccount.displayName")}</Text>

                    <TextInput
                        value={displayName}
                        onChangeText={setDisplayName}
                        placeholder={t("profileAccount.displayNamePlaceholder")}
                        placeholderTextColor={theme.colors.textMuted}
                        autoCapitalize="words"
                        style={styles.input}
                    />

                    <Pressable
                        style={[styles.actionButton, savingName && styles.buttonDisabled]}
                        onPress={updateDisplayName}
                        disabled={savingName}
                    >
                        <Text style={styles.actionButtonText}>
                            {savingName
                                ? t("profileAccount.saving")
                                : t("profileAccount.saveName")}
                        </Text>
                    </Pressable>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>
                        {t("profileAccount.changeEmail")}
                    </Text>

                    <Text style={styles.label}>{t("profileAccount.email")}</Text>

                    <TextInput
                        value={newEmail}
                        onChangeText={setNewEmail}
                        placeholder={t("profileAccount.emailPlaceholder")}
                        placeholderTextColor={theme.colors.textMuted}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={styles.input}
                    />

                    <Text style={styles.helpText}>{t("profileAccount.emailInfo")}</Text>

                    <Pressable
                        style={[styles.actionButton, savingEmail && styles.buttonDisabled]}
                        onPress={updateEmail}
                        disabled={savingEmail}
                    >
                        <Text style={styles.actionButtonText}>
                            {savingEmail
                                ? t("profileAccount.saving")
                                : t("profileAccount.changeEmail")}
                        </Text>
                    </Pressable>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>
                        {t("profileAccount.changePassword")}
                    </Text>

                    <Text style={styles.label}>{t("profileAccount.password")}</Text>

                    <TextInput
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder={t("profileAccount.passwordPlaceholder")}
                        placeholderTextColor={theme.colors.textMuted}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={styles.input}
                    />

                    <Text style={styles.helpText}>
                        {t("profileAccount.passwordInfo")}
                    </Text>

                    <Pressable
                        style={[
                            styles.actionButton,
                            savingPassword && styles.buttonDisabled,
                        ]}
                        onPress={updatePassword}
                        disabled={savingPassword}
                    >
                        <Text style={styles.actionButtonText}>
                            {savingPassword
                                ? t("profileAccount.saving")
                                : t("profileAccount.changePassword")}
                        </Text>
                    </Pressable>
                </View>
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
        label: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
            marginBottom: theme.spacing.sm,
        },
        input: {
            minHeight: 48,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            paddingHorizontal: theme.spacing.md,
            fontSize: theme.typography.fontSize.md,
            marginBottom: theme.spacing.md,
        },
        helpText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: theme.typography.lineHeight.sm,
            marginBottom: theme.spacing.md,
        },
        actionButton: {
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.pill,
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 12,
        },
        buttonDisabled: {
            opacity: 0.6,
        },
        actionButtonText: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
    });
}