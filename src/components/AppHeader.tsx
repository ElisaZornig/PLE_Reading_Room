import { Feather } from "@expo/vector-icons";
import { Alert, Platform, StyleSheet, Text, View, Pressable } from "react-native";
import { AppTheme } from "../theme/theme";
import { useAppTheme } from "../theme/useAppTheme";
import { router } from "expo-router";
import { supabase } from "@/src/services/supabase";

export function AppHeader() {
    const theme = useAppTheme();
    const styles = createStyles(theme);

    async function handleProfilePress() {
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
            router.push("/auth");
            return;
        }

        if (Platform.OS === "web") {
            const confirmed = window.confirm("Weet je zeker dat je wilt uitloggen?");
            if (confirmed) {
                await supabase.auth.signOut();
                router.replace("/auth");
            }
            return;
        }

        Alert.alert("Account", "Wat wil je doen?", [
            {
                text: "Annuleren",
                style: "cancel",
            },
            {
                text: "Uitloggen",
                style: "destructive",
                onPress: async () => {
                    await supabase.auth.signOut();
                    router.replace("/auth");
                },
            },
        ]);
    }

    return (
        <View style={styles.topBar}>
            <View style={styles.brandRow}>
                <Pressable style={styles.logoBox} onPress={() => router.push("/")}>
                    <Feather name="book-open" size={20} color="#FFFFFF" />
                </Pressable>
            </View>

            <Pressable
                style={styles.profileButton}
                onPress={handleProfilePress}
            >
                <Feather name="user" size={20} color={theme.colors.text} />
            </Pressable>
        </View>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        topBar: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: theme.colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: 14,
        },
        brandRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
        },
        logoBox: {
            width: 42,
            height: 42,
            borderRadius: 10,
            backgroundColor: theme.colors.accent,
            alignItems: "center",
            justifyContent: "center",
        },
        brand: {
            color: theme.colors.text,
            fontSize: 18,
            fontWeight: "500",
        },
        profileButton: {
            width: 40,
            height: 40,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: theme.colors.text,
            alignItems: "center",
            justifyContent: "center",
        },
    });
}