import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BackButton } from "@/src/components/BackButton";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";

type ScreenTopBarProps = {
    title?: string;
    right?: ReactNode;
};

export function ScreenTopBar({ title, right }: ScreenTopBarProps) {
    const theme = useAppTheme();
    const styles = createStyles(theme);

    return (
        <View style={styles.container}>
            <BackButton />

            {title ? (
                <Text style={styles.title} numberOfLines={1}>
                    {title}
                </Text>
            ) : (
                <View style={styles.titleSpacer} />
            )}

            <View style={styles.rightSlot}>{right}</View>
        </View>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        container: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.sm,
            paddingBottom: theme.spacing.md,
        },
        title: {
            flex: 1,
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
            textAlign: "center",
        },
        titleSpacer: {
            flex: 1,
        },
        rightSlot: {
            width: 44,
            alignItems: "flex-end",
        },
    });
}