import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ChoiceStepper } from "@/src/components/ChoiceStepper";
import { ScreenTopBar } from "@/src/components/ScreenTopBar";
import { t } from "@/src/i18n";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";

export default function ChooseMethodScreen() {
    const theme = useAppTheme();
    const styles = createStyles(theme);
    const params = useLocalSearchParams();

    const clubId = useMemo(() => {
        const value = params.clubId;
        return Array.isArray(value) ? value[0] : value;
    }, [params.clubId]);

    return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <ScreenTopBar title={t("chooseMethod.screenTitle")} />
            <ChoiceStepper currentStep={3} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.container}
            >


                <View style={styles.header}>
                    <Text style={styles.title}>{t("chooseMethod.title")}</Text>
                    <Text style={styles.subtitle}>{t("chooseMethod.subtitle")}</Text>
                </View>

                <View style={styles.methods}>
                    <MethodCard
                        icon="refresh-cw"
                        title={t("chooseMethod.wheelTitle")}
                        subtitle={t("chooseMethod.wheelSubtitle")}
                        label={t("chooseMethod.recommended")}
                        onPress={() =>
                            router.push({
                                pathname: "/spin-the-wheel",
                                params: { clubId: clubId ?? "" },
                            })
                        }
                        theme={theme}
                    />

                    <MethodCard
                        icon="check-circle"
                        title={t("chooseMethod.voteTitle")}
                        subtitle={t("chooseMethod.voteSubtitle")}
                        label={t("chooseMethod.later")}
                        disabled
                        theme={theme}
                    />

                    <MethodCard
                        icon="layers"
                        title={t("chooseMethod.swipeTitle")}
                        subtitle={t("chooseMethod.swipeSubtitle")}
                        label={t("chooseMethod.later")}
                        disabled
                        theme={theme}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

type MethodCardProps = {
    icon: keyof typeof Feather.glyphMap;
    title: string;
    subtitle: string;
    label?: string;
    disabled?: boolean;
    onPress?: () => void;
    theme: AppTheme;
};

function MethodCard({
                        icon,
                        title,
                        subtitle,
                        label,
                        disabled = false,
                        onPress,
                        theme,
                    }: MethodCardProps) {
    const styles = createStyles(theme);

    return (
        <Pressable
            style={[styles.methodCard, disabled && styles.methodCardDisabled]}
            onPress={onPress}
            disabled={disabled}
        >
            <View style={styles.methodIconWrap}>
                <Feather name={icon} size={22} color={theme.colors.accent} />
            </View>

            <View style={styles.methodTextWrap}>
                <View style={styles.methodTitleRow}>
                    <Text style={styles.methodTitle}>{title}</Text>

                    {label ? (
                        <View style={styles.methodLabel}>
                            <Text style={styles.methodLabelText}>{label}</Text>
                        </View>
                    ) : null}
                </View>

                <Text style={styles.methodSubtitle}>{subtitle}</Text>
            </View>

            <Feather
                name={disabled ? "lock" : "chevron-right"}
                size={18}
                color={theme.colors.textMuted}
            />
        </Pressable>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        container: {
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.lg,
            paddingBottom: theme.spacing.xxl,
        },
        stepText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            marginTop: theme.spacing.sm,
            marginBottom: theme.spacing.lg,
        },
        header: {
            gap: theme.spacing.sm,
            marginBottom: theme.spacing.xl,
        },
        title: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.xxl,
            fontWeight: theme.typography.fontWeight.bold,
        },
        subtitle: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
        },
        methods: {
            gap: theme.spacing.md,
        },
        methodCard: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.md,
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
        },
        methodCardDisabled: {
            opacity: 0.65,
        },
        methodIconWrap: {
            width: 48,
            height: 48,
            borderRadius: 16,
            backgroundColor: theme.colors.accentSoft,
            alignItems: "center",
            justifyContent: "center",
        },
        methodTextWrap: {
            flex: 1,
            gap: 5,
        },
        methodTitleRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            flexWrap: "wrap",
        },
        methodTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.md,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        methodSubtitle: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
        },
        methodLabel: {
            backgroundColor: theme.colors.accentSoft,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 8,
            paddingVertical: 4,
        },
        methodLabelText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
        },
    });
}