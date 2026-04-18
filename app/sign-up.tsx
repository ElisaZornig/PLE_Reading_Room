import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/services/supabase";
import { t } from "../src/i18n";
import { showAppAlert } from "../src/utils/appAlert";
import { AppTheme } from "../src/theme/theme";
import { useAppTheme } from "../src/theme/useAppTheme";

type FormErrors = {
    displayName?: string;
    email?: string;
    password?: string;
};

export default function SignUpScreen() {
    const theme = useAppTheme();
    const styles = createStyles(theme);

    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState<FormErrors>({});
    const [isLoading, setIsLoading] = useState(false);

    function validateForm() {
        const newErrors: FormErrors = {};
        const trimmedName = displayName.trim();
        const trimmedEmail = email.trim();

        if (!trimmedName) {
            newErrors.displayName = t("auth.signUp.errors.nameRequired");
        }

        if (!trimmedEmail) {
            newErrors.email = t("auth.signUp.errors.emailRequired");
        } else if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
            newErrors.email = t("auth.signUp.errors.emailInvalid");
        }

        if (!password.trim()) {
            newErrors.password = t("auth.signUp.errors.passwordRequired");
        } else if (password.length < 6) {
            newErrors.password = t("auth.signUp.errors.passwordTooShort");
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    async function handleSignUp() {
        if (isLoading) return;
        if (!validateForm()) return;

        try {
            setIsLoading(true);

            const { error } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    data: {
                        display_name: displayName.trim(),
                    },
                },
            });

            if (error) {
                let message = t("auth.signUp.errors.generic");

                if (error.message.toLowerCase().includes("already registered")) {
                    message = t("auth.signUp.errors.emailInUse");
                }

                showAppAlert(t("auth.signUp.errors.title"), message);
                return;
            }

            showAppAlert(
                t("auth.signUp.success.title"),
                t("auth.signUp.success.message")
            );

            router.replace("/auth");
        } catch {
            showAppAlert(
                t("auth.signUp.errors.title"),
                t("auth.signUp.errors.generic")
            );
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <View style={styles.screen}>
                <Text style={styles.title}>{t("auth.signUp.title")}</Text>
                <Text style={styles.subtitle}>{t("auth.signUp.subtitle")}</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t("auth.signUp.nameLabel")}</Text>
                    <TextInput
                        value={displayName}
                        onChangeText={(value) => {
                            setDisplayName(value);
                            if (errors.displayName) {
                                setErrors((prev) => ({ ...prev, displayName: undefined }));
                            }
                        }}
                        placeholder={t("auth.signUp.namePlaceholder")}
                        placeholderTextColor={theme.colors.textMuted}
                        style={[
                            styles.input,
                            errors.displayName ? styles.inputError : undefined,
                        ]}
                        autoCapitalize="words"
                    />
                    {errors.displayName ? (
                        <Text style={styles.errorText}>{errors.displayName}</Text>
                    ) : null}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t("auth.signUp.emailLabel")}</Text>
                    <TextInput
                        value={email}
                        onChangeText={(value) => {
                            setEmail(value);
                            if (errors.email) {
                                setErrors((prev) => ({ ...prev, email: undefined }));
                            }
                        }}
                        placeholder={t("auth.signUp.emailPlaceholder")}
                        placeholderTextColor={theme.colors.textMuted}
                        style={[
                            styles.input,
                            errors.email ? styles.inputError : undefined,
                        ]}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        autoComplete="email"
                        textContentType="emailAddress"
                    />
                    {errors.email ? (
                        <Text style={styles.errorText}>{errors.email}</Text>
                    ) : null}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t("auth.signUp.passwordLabel")}</Text>
                    <TextInput
                        value={password}
                        onChangeText={(value) => {
                            setPassword(value);
                            if (errors.password) {
                                setErrors((prev) => ({ ...prev, password: undefined }));
                            }
                        }}
                        placeholder={t("auth.signUp.passwordPlaceholder")}
                        placeholderTextColor={theme.colors.textMuted}
                        style={[
                            styles.input,
                            errors.password ? styles.inputError : undefined,
                        ]}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="password-new"
                        textContentType="newPassword"
                    />
                    {errors.password ? (
                        <Text style={styles.errorText}>{errors.password}</Text>
                    ) : null}
                </View>

                <Pressable
                    style={[
                        styles.primaryButton,
                        isLoading ? styles.primaryButtonDisabled : undefined,
                    ]}
                    onPress={handleSignUp}
                    disabled={isLoading}
                >
                    <Text style={styles.primaryButtonText}>
                        {isLoading
                            ? t("auth.signUp.loading")
                            : t("auth.signUp.button")}
                    </Text>
                </Pressable>

                <Pressable
                    style={styles.linkButton}
                    onPress={() => router.replace("/auth")}
                    disabled={isLoading}
                >
                    <Text style={styles.linkText}>{t("auth.signUp.backToLogin")}</Text>
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