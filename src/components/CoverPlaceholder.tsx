import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../theme/useAppTheme";

type Props = {
    title: string;
    small?: boolean;
};

export function CoverPlaceholder({ title, small = false }: Props) {
    const theme = useAppTheme();

    const initials = title
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase();

    return (
        <View
            style={[
                styles.cover,
                small && styles.coverSmall,
                {
                    backgroundColor: theme.colors.accentSoft,
                    borderColor: theme.colors.border,
                },
            ]}
        >
            <Text
                style={[
                    styles.text,
                    small && styles.textSmall,
                    { color: theme.colors.accent },
                ]}
            >
                {initials || "?"}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    cover: {
        width: 70,
        height: 100,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    coverSmall: {
        width: 48,
        height: 72,
        borderRadius: 8,
    },
    text: {
        fontSize: 18,
        fontWeight: "700",
    },
    textSmall: {
        fontSize: 12,
    },
});