import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ChoiceStepper } from "@/src/components/ChoiceStepper";
import { ScreenTopBar } from "@/src/components/ScreenTopBar";
import { t } from "@/src/i18n";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";

export default function ChooseNextBookStartScreen() {
    const theme = useAppTheme();
    const styles = createStyles(theme);
    const params = useLocalSearchParams();

    const rawClubId = params.clubId;
    const clubId = Array.isArray(rawClubId) ? rawClubId[0] : rawClubId;

    return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <ScreenTopBar title={t("chooseNextBook.title")} />
            <ChoiceStepper currentStep={1} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.container}
            >

                <Text style={styles.title}>{t("chooseNextBook.startQuestion")}</Text>
                <Text style={styles.subtitle}>{t("chooseNextBook.startSubtitle")}</Text>

                <View style={styles.options}>
                    <StepOptionCard
                        icon="list"
                        title={t("chooseNextBook.hasOptionsTitle")}
                        subtitle={t("chooseNextBook.hasOptionsSubtitle")}
                        onPress={() =>
                            router.push({
                                pathname: "/club-shortlist",
                                params: { clubId: clubId ?? "" },
                            })
                        }
                        theme={theme}
                    />

                    <StepOptionCard
                        icon="star"
                        title={t("chooseNextBook.wantRecommendationsTitle")}
                        subtitle={t("chooseNextBook.wantRecommendationsSubtitle")}
                        onPress={() =>
                            router.push({
                                pathname: "/recommendations",
                                params: { clubId: clubId ?? "" },
                            })
                        }
                        theme={theme}
                    />

                    <StepOptionCard
                        icon="check-square"
                        title={t("chooseNextBook.knowBookTitle")}
                        subtitle={t("chooseNextBook.knowBookSubtitle")}
                        onPress={() =>
                            router.push({
                                pathname: "/set-current-book",
                                params: { clubId: clubId ?? "" },
                            })
                        }
                        theme={theme}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

type StepOptionCardProps = {
    icon: keyof typeof Feather.glyphMap;
    title: string;
    subtitle: string;
    onPress: () => void;
    theme: AppTheme;
};

function StepOptionCard({
                            icon,
                            title,
                            subtitle,
                            onPress,
                            theme,
                        }: StepOptionCardProps) {
    const styles = createStyles(theme);

    return (
        <Pressable style={styles.optionCard} onPress={onPress}>
            <View style={styles.optionIconWrap}>
                <Feather name={icon} size={22} color={theme.colors.accent} />
            </View>

            <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>{title}</Text>
                <Text style={styles.optionSubtitle}>{subtitle}</Text>
            </View>
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
            padding: theme.spacing.lg,
            paddingBottom: theme.spacing.xxl,
        },
        stepText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            marginBottom: theme.spacing.lg,
        },
        title: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.xxl,
            fontWeight: theme.typography.fontWeight.bold,
            lineHeight: 34,
            marginBottom: theme.spacing.sm,
        },
        subtitle: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.md,
            lineHeight: 23,
            marginBottom: theme.spacing.xl,
        },
        options: {
            gap: theme.spacing.md,
        },
        optionCard: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.xl,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.lg,
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.md,
        },
        optionIconWrap: {
            width: 48,
            height: 48,
            borderRadius: 16,
            backgroundColor: theme.colors.accentSoft,
            alignItems: "center",
            justifyContent: "center",
        },
        optionTextWrap: {
            flex: 1,
            gap: 4,
        },
        optionTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.md,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        optionSubtitle: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
        },
    });
}