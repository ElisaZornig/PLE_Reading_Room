import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";

export function BackButton() {
    const theme = useAppTheme();
    const styles = createStyles(theme);

    return (
        <Pressable style={styles.button} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={theme.colors.text} />
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