import { router } from "expo-router";
import { useState } from "react";
import {
    Alert, Keyboard,
    KeyboardAvoidingView, Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createClubInSupabase } from "@/src/services/supabaseClub";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import {AppHeader} from "@/src/components/AppHeader";
import {Feather} from "@expo/vector-icons";

export default function CreateClubScreen() {
    const theme = useAppTheme();
    const styles = createStyles(theme);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    async function handleCreateClub() {
        try {
            setIsLoading(true);

            const club = await createClubInSupabase({
                name,
                description,
            });

            Alert.alert(
                "Club created",
                `Invite code: ${club.inviteCode ?? "-"}`
            );

            router.replace("/club");
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Something went wrong while creating the club.";
            Alert.alert("Create club error", message);
        } finally {
            setIsLoading(false);
        }
    }
    const screenContent =  (
    <View style={styles.screen}>
        <View style={styles.header}>
            <View style={styles.titleRow}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Feather name="chevron-left" size={24} color={theme.colors.accent} />
                </Pressable>

                <Text style={styles.title}>Create a club</Text>
            </View>

            <Text style={styles.subtitle}>
                Start your book club and invite others later.
            </Text>
        </View>

        <View style={styles.form}>
            <View style={styles.fieldGroup}>
                <Text style={styles.label}>Club name</Text>
                <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="For example: The Reading Room"
                    placeholderTextColor={theme.colors.textMuted}
                    style={styles.input}
                />
            </View>

            <View style={styles.fieldGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Optional"
                    placeholderTextColor={theme.colors.textMuted}
                    style={[styles.input, styles.textArea]}
                    multiline
                    textAlignVertical="top"
                />
            </View>
        </View>

        <Pressable
            style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
            onPress={handleCreateClub}
            disabled={isLoading}
        >
            <Text style={styles.primaryButtonText}>
                {isLoading ? "Creating..." : "Create club"}
            </Text>
        </Pressable>
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
            backgroundColor: theme.colors.background,
            padding: theme.spacing.lg,
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
        backText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
        },
        header: {
            marginBottom: theme.spacing.xl,
            gap: theme.spacing.sm,
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
        form: {
            gap: theme.spacing.lg,
        },
        fieldGroup: {
            gap: theme.spacing.sm,
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
        textArea: {
            minHeight: 120,
        },
        primaryButton: {
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.pill,
            paddingVertical: 14,
            alignItems: "center",
            marginTop: theme.spacing.xl,
        },
        primaryButtonDisabled: {
            opacity: 0.7,
        },
        primaryButtonText: {
            color: "#FFFFFF",
            fontWeight: theme.typography.fontWeight.semibold,
            fontSize: theme.typography.fontSize.sm,
        },
    });
}