import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppTheme } from "../theme/theme";
import { useAppTheme } from "../theme/useAppTheme";

type Props = {
    value: number;
    onChange: (value: number) => void;
};

export function StarRatingInput({ value, onChange }: Props) {
    const theme = useAppTheme();
    const styles = createStyles(theme);

    function getStarIcon(starNumber: number) {
        if (value >= starNumber) {
            return "star";
        }

        if (value >= starNumber - 0.5) {
            return "star-half";
        }

        return "star-outline";
    }

    return (
        <View style={styles.wrapper}>
            <Text style={styles.helperText}>Tik op de sterren om je rating te geven</Text>

            <View style={styles.row}>
                {[1, 2, 3, 4, 5].map((starNumber) => (
                    <View key={starNumber} style={styles.starContainer}>
                        <Ionicons
                            name={getStarIcon(starNumber)}
                            size={34}
                            color={theme.colors.accent}
                        />

                        <View style={styles.touchOverlay}>
                            <Pressable
                                style={styles.halfTouch}
                                onPress={() => onChange(starNumber - 0.5)}
                            />
                            <Pressable
                                style={styles.halfTouch}
                                onPress={() => onChange(starNumber)}
                            />
                        </View>
                    </View>
                ))}
            </View>

            <View style={styles.bottomRow}>
                <Text style={styles.valueText}>{value.toFixed(1)} / 5</Text>

                {value > 0 ? (
                    <Pressable onPress={() => onChange(0)} style={styles.clearButton}>
                        <Text style={styles.clearButtonText}>Wis</Text>
                    </Pressable>
                ) : null}
            </View>
        </View>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        wrapper: {
            gap: theme.spacing.sm,
        },
        helperText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
        },
        row: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
        },
        starContainer: {
            position: "relative",
            width: 34,
            height: 34,
            alignItems: "center",
            justifyContent: "center",
        },
        touchOverlay: {
            position: "absolute",
            inset: 0,
            flexDirection: "row",
        },
        halfTouch: {
            flex: 1,
        },
        bottomRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
        },
        valueText: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
        },
        clearButton: {
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.accentSoft,
        },
        clearButtonText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
        },
    });
}