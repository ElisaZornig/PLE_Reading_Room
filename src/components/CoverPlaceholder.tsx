import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../theme/useAppTheme";

type Props = {
    title: string;
};

export function CoverPlaceholder({ title }: Props) {
    const theme = useAppTheme();

    const initials = title
        .split(" ")
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase();

    return (
        <View
            style={[
                styles.cover,
                {
                    backgroundColor: theme.colors.accentSoft,
                    borderColor: theme.colors.border,
                },
            ]}
        >
            <Text style={[styles.text, { color: theme.colors.accent }]}>
                {initials}
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
    text: {
        fontSize: 18,
        fontWeight: "700",
    },
});