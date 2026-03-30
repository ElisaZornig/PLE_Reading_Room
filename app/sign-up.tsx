import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/services/supabase";
import { AppTheme } from "../src/theme/theme";
import { useAppTheme } from "../src/theme/useAppTheme";

export default function SignUpScreen() {
    const theme = useAppTheme();
    const styles = createStyles(theme);

    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    async function handleSignUp() {
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
                Alert.alert("Signup error", error.message);
                return;
            }

            router.replace("/");
        } catch (error) {
            Alert.alert("Signup error", "Er ging iets mis.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <View style={styles.screen}>
                <Text style={styles.title}>Account aanmaken</Text>

                <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Naam"
                    placeholderTextColor={theme.colors.textMuted}
                    style={styles.input}
                />

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
                    onPress={handleSignUp}
                    disabled={isLoading}
                >
                    <Text style={styles.primaryButtonText}>
                        {isLoading ? "Bezig..." : "Account aanmaken"}
                    </Text>
                </Pressable>

                <Pressable
                    style={styles.linkButton}
                    onPress={() => router.replace("/auth")}
                >
                    <Text style={styles.linkText}>Heb je al een account? Inloggen</Text>
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