import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { supabase } from "@/src/services/supabase";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import { showAppConfirm } from "@/src/utils/appAlert";

export function ProfileButton() {
    const theme = useAppTheme();
    const styles = createStyles(theme);

    async function handlePress() {
        const confirmed = await showAppConfirm({
            title: "Account",
            message: "Wil je uitloggen?",
            confirmText: "Uitloggen",
            cancelText: "Annuleren",
        });

        if (!confirmed) return;

        await supabase.auth.signOut();
        router.replace("/auth");
    }

    return (
        <Pressable style={styles.button} onPress={handlePress}>
            <Feather name="user" size={20} color={theme.colors.text} />
        </Pressable>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        button: {
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
        },
    });
}