import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
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
import { t } from "@/src/i18n";
import { joinClubByCode } from "@/src/services/supabaseClub";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";

export default function JoinClubScreen() {
    const theme = useAppTheme();
    const styles = createStyles(theme);
    const params = useLocalSearchParams<{ code?: string }>();

    const [code, setCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (typeof params.code === "string" && params.code.trim()) {
            setCode(params.code.toUpperCase());
        }
    }, [params.code]);

    async function handleJoinClub() {
        try {
            setIsLoading(true);

            const club = await joinClubByCode(code);

            Alert.alert(
                t("joinClub.successTitle"),
                t("joinClub.successMessage", { name: club.name })
            );

            router.replace("/club");
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : t("joinClub.errorFallback");

            Alert.alert(t("joinClub.errorTitle"), message);
        } finally {
            setIsLoading(false);
        }
    }

    const screenContent = (
        <View style={styles.screen}>
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Feather
                            name="chevron-left"
                            size={24}
                            color={theme.colors.accent}
                        />
                    </Pressable>

                    <Text style={styles.title}>{t("joinClub.title")}</Text>
                </View>

                <Text style={styles.subtitle}>{t("joinClub.subtitle")}</Text>
            </View>

            <View style={styles.form}>
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>{t("joinClub.codeLabel")}</Text>
                    <TextInput
                        value={code}
                        onChangeText={(value) => setCode(value.toUpperCase())}
                        placeholder={t("joinClub.codePlaceholder")}
                        placeholderTextColor={theme.colors.textMuted}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        editable={!isLoading}
                        style={styles.input}
                    />
                </View>

                <Pressable
                    style={[
                        styles.primaryButton,
                        isLoading && styles.primaryButtonDisabled,
                    ]}
                    onPress={handleJoinClub}
                    disabled={isLoading}
                >
                    <Text style={styles.primaryButtonText}>
                        {isLoading ? t("joinClub.joining") : t("joinClub.joinButton")}
                    </Text>
                </Pressable>
            </View>
        </View>
    )

    return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <AppHeader />

            <KeyboardAvoidingView
                style={styles.safeArea}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                {Platform.OS === "web" ? (
                    <View style={styles.screen}>{screenContent}</View>
                ) : (
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                        <View style={styles.screen}>{screenContent}</View>
                    </TouchableWithoutFeedback>
                )}
            </KeyboardAvoidingView>
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
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.md,
            gap: theme.spacing.lg,
        },
        header: {
            gap: theme.spacing.sm,
        },
        titleRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
        },
        backButton: {
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.surface,
        },
        title: {
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text,
        },
        subtitle: {
            fontSize: theme.typography.fontSize.md,
            color: theme.colors.textMuted,
            lineHeight: 22,
        },
        form: {
            gap: theme.spacing.md,
        },
        fieldGroup: {
            gap: theme.spacing.xs,
        },
        label: {
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.colors.text,
        },
        input: {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: 14,
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.md,
        },
        primaryButton: {
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.pill,
            paddingVertical: 14,
            alignItems: "center",
            justifyContent: "center",
        },
        primaryButtonDisabled: {
            opacity: 0.6,
        },
        primaryButtonText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.md,
            fontWeight: theme.typography.fontWeight.semibold,
        },
    });
}