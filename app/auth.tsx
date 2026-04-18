import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/src/services/supabase";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import { showAppAlert } from "@/src/utils/appAlert";
import { t } from "@/src/i18n";

type FormErrors = {
    email?: string;
    password?: string;
};

export default function AuthScreen() {
    const theme = useAppTheme();
    const styles = createStyles(theme);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState<FormErrors>({});
    const [isLoading, setIsLoading] = useState(false);

    function validateForm() {
        const newErrors: FormErrors = {};
        const trimmedEmail = email.trim();

        if (!trimmedEmail) {
            newErrors.email = t("auth.errors.emailRequired");
        } else if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
            newErrors.email = t("auth.errors.emailInvalid");
        }

        if (!password.trim()) {
            newErrors.password = t("auth.errors.passwordRequired");
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    async function handleSignIn() {
        if (isLoading) return;
        if (!validateForm()) return;

        try {
            setIsLoading(true);

            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (error) {
                const message =
                    error.message.toLowerCase().includes("invalid login credentials")
                        ? t("auth.errors.signInFailedCredentials")
                        : t("auth.errors.signInFailedGeneric");

                showAppAlert(t("auth.errors.signInFailedTitle"), message);
                return;
            }

            router.replace("/");
        } catch {
            showAppAlert(
                t("auth.errors.signInFailedTitle"),
                t("auth.errors.signInFailedGeneric")
            );
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <View style={styles.screen}>
                <Text style={styles.title}>{t("auth.signInTitle")}</Text>
                <Text style={styles.subtitle}>{t("auth.signInSubtitle")}</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t("auth.emailLabel")}</Text>
                    <TextInput
                        value={email}
                        onChangeText={(value) => {
                            setEmail(value);
                            if (errors.email) {
                                setErrors((prev) => ({ ...prev, email: undefined }));
                            }
                        }}
                        placeholder={t("auth.emailPlaceholder")}
                        placeholderTextColor={theme.colors.textMuted}
                        style={[styles.input, errors.email ? styles.inputError : undefined]}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                    />
                    {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t("auth.passwordLabel")}</Text>
                    <TextInput
                        value={password}
                        onChangeText={(value) => {
                            setPassword(value);
                            if (errors.password) {
                                setErrors((prev) => ({ ...prev, password: undefined }));
                            }
                        }}
                        placeholder={t("auth.passwordPlaceholder")}
                        placeholderTextColor={theme.colors.textMuted}
                        style={[styles.input, errors.password ? styles.inputError : undefined]}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {errors.password ? (
                        <Text style={styles.errorText}>{errors.password}</Text>
                    ) : null}
                </View>

                <Pressable
                    style={[styles.primaryButton, isLoading ? styles.primaryButtonDisabled : undefined]}
                    onPress={handleSignIn}
                    disabled={isLoading}
                >
                    <Text style={styles.primaryButtonText}>
                        {isLoading ? t("auth.signInLoading") : t("auth.signInButton")}
                    </Text>
                </Pressable>

                <Pressable
                    style={styles.linkButton}
                    onPress={() => router.push("/sign-up")}
                    disabled={isLoading}
                >
                    <Text style={styles.linkText}>{t("auth.noAccount")}</Text>
                </Pressable>
            </View>
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
            padding: theme.spacing.lg,
            gap: theme.spacing.md,
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
            marginBottom: theme.spacing.sm,
        },
        inputGroup: {
            gap: 6,
        },
        label: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
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
        inputError: {
            borderColor: "#D64545",
        },
        errorText: {
            color: "#D64545",
            fontSize: theme.typography.fontSize.xs,
        },
        primaryButton: {
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.pill,
            paddingVertical: 14,
            alignItems: "center",
            marginTop: theme.spacing.sm,
        },
        primaryButtonDisabled: {
            opacity: 0.6,
        },
        primaryButtonText: {
            color: "#FFFFFF",
            fontWeight: theme.typography.fontWeight.semibold,
            fontSize: theme.typography.fontSize.sm,
        },
        linkButton: {
            alignItems: "center",
            paddingVertical: 8,
        },
        linkText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
        },
    });
}