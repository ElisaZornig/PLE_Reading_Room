import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/src/services/supabase";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";

export default function AuthScreen() {
    const theme = useAppTheme();
    const styles = createStyles(theme);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    async function handleSignIn() {
        try {
            setIsLoading(true);

            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (error) {
                Alert.alert("Login error", error.message);
                return;
            }

            router.replace("/");
        } catch (error) {
            Alert.alert("Login error", "Er ging iets mis.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <View style={styles.screen}>
                <Text style={styles.title}>Inloggen</Text>

                <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email"
                    placeholderTextColor={theme.colors.textMuted}
                    style={styles.input}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />

                <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Wachtwoord"
                    placeholderTextColor={theme.colors.textMuted}
                    style={styles.input}
                    secureTextEntry
                />

                <Pressable
                    style={styles.primaryButton}
                    onPress={handleSignIn}
                    disabled={isLoading}
                >
                    <Text style={styles.primaryButtonText}>
                        {isLoading ? "Bezig..." : "Inloggen"}
                    </Text>
                </Pressable>

                <Pressable
                    style={styles.linkButton}
                    onPress={() => router.push("/sign-up")}
                >
                    <Text style={styles.linkText}>Nog geen account? Account aanmaken</Text>
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
            marginBottom: theme.spacing.md,
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
        primaryButton: {
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.pill,
            paddingVertical: 14,
            alignItems: "center",
            marginTop: theme.spacing.sm,
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