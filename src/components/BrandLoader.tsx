import { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";

import { t } from "@/src/i18n";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";

const logoNoBackground = require("@/assets/images/logo-nobackrgound.png");

type BrandLoaderProps = {
    text?: string;
};

export function BrandLoader({ text }: BrandLoaderProps) {
    const theme = useAppTheme();
    const styles = createStyles(theme);

    const scale = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(0.75)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(scale, {
                        toValue: 1.06,
                        duration: 850,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scale, {
                        toValue: 1,
                        duration: 850,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.sequence([
                    Animated.timing(opacity, {
                        toValue: 1,
                        duration: 850,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacity, {
                        toValue: 0.75,
                        duration: 850,
                        useNativeDriver: true,
                    }),
                ]),
            ])
        );

        animation.start();

        return () => animation.stop();
    }, [opacity, scale]);

    return (
        <View style={styles.container}>
            <Animated.View
                style={[
                    styles.logoFrame,
                    {
                        opacity,
                        transform: [{ scale }],
                    },
                ]}
            >
                <Image
                    source={logoNoBackground}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </Animated.View>

            <Text style={styles.loadingText}>
                {text ?? t("common.loading")}
            </Text>
        </View>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        container: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.background,
            padding: theme.spacing.lg,
        },

        logoFrame: {
            width: 120,
            height: 120,
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
        },

        logo: {
            width: 210,
            height: 210,
        },

        loadingText: {
            marginTop: theme.spacing.md,
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
        },
    });
}