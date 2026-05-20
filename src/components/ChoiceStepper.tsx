import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";

type ChoiceStepperProps = {
    currentStep: number;
    totalSteps?: number;
};

export function ChoiceStepper({ currentStep, totalSteps = 4 }: ChoiceStepperProps) {
    const theme = useAppTheme();
    const styles = createStyles(theme);

    return (
        <View style = {styles.stepperWrap}>
        <View style={styles.container}>
            {Array.from({ length: totalSteps }).map((_, index) => {
                const step = index + 1;
                const isCompleted = step < currentStep;
                const isActive = step === currentStep;

                return (
                    <View
                        key={step}
                        style={[
                            styles.stepItem,
                            step < totalSteps && styles.stepItemWithLine,
                        ]}
                    >
                        <View
                            style={[
                                styles.circle,
                                (isCompleted || isActive) && styles.circleActive,
                            ]}
                        >
                            {isCompleted ? (
                                <Feather name="check" size={14} color="#FFFFFF" />
                            ) : (
                                <Text
                                    style={[
                                        styles.circleText,
                                        isActive && styles.circleTextActive,
                                    ]}
                                >
                                    {step}
                                </Text>
                            )}
                        </View>

                        {step < totalSteps ? (
                            <View
                                style={[
                                    styles.line,
                                    isCompleted && styles.lineActive,
                                ]}
                            />
                        ) : null}
                    </View>
                );
            })}
        </View>
        </View>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        container: {
            width: "100%",
            alignSelf: "stretch",
            flexDirection: "row",
            alignItems: "center",
        },

        stepItem: {
            flexDirection: "row",
            alignItems: "center",
        },

        stepItemWithLine: {
            flex: 1,
        },

        circle: {
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: theme.colors.surface,
            alignItems: "center",
            justifyContent: "center",
        },

        circleActive: {
            backgroundColor: theme.colors.accent,
        },

        circleText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
        },

        circleTextActive: {
            color: "#FFFFFF",
        },

        line: {
            flex: 1,
            height: 2,
            backgroundColor: theme.colors.border,
            marginHorizontal: 6,
        },

        lineActive: {
            backgroundColor: theme.colors.accent,
        },
        stepperWrap: {
            width: "100%",
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.lg,
            alignItems: "center",
        },
    });
}