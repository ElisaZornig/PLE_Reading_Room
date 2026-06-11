import { Feather } from "@expo/vector-icons";
import { Href, router } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";

export type BackButtonProps = {
    href?: Href;
    replace?: boolean;
    fallbackHref?: Href;
};

export function BackButton({ href, replace = false, fallbackHref }: BackButtonProps) {
    const theme = useAppTheme();
    const styles = createStyles(theme);

    const handlePress = () => {
        if (href) {
            if (replace) {
                router.replace(href);
            } else {
                router.push(href);
            }
            return;
        }

        if (router.canGoBack()) {
            router.back();
            return;
        }

        if (fallbackHref) {
            router.replace(fallbackHref);
        }
    };

    return (
        <Pressable style={styles.button} onPress={handlePress}>
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