import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { AppTheme } from "../theme/theme";
import { useAppTheme } from "../theme/useAppTheme";

type Props = {
    value: number;
    size?: number;
    showValue?: boolean;
};

export function StarRatingDisplay({
                                      value,
                                      size = 16,
                                      showValue = true,
                                  }: Props) {
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
            <View style={styles.row}>
                {[1, 2, 3, 4, 5].map((starNumber) => (
                    <Ionicons
                        key={starNumber}
                        name={getStarIcon(starNumber)}
                        size={size}
                        color={theme.colors.accent}
                    />
                ))}
            </View>

            {showValue ? (
                <Text style={styles.valueText}>{value.toFixed(1)}</Text>
            ) : null}
        </View>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        wrapper: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginTop: 2,
        },
        row: {
            flexDirection: "row",
            alignItems: "center",
            gap: 2,
        },
        valueText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.medium,
        },
    });
}