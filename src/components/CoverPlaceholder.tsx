import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../theme/useAppTheme";

type Props = {
    title: string;
    width?: number;
    height?: number;
    borderRadius?: number;
};

export function CoverPlaceholder({
                                     title,
                                     width = 70,
                                     height = 100,
                                     borderRadius = 12,
                                 }: Props) {
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
                    width,
                    height,
                    borderRadius,
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
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    text: {
        fontSize: 24,
        fontWeight: "700",
    },
});