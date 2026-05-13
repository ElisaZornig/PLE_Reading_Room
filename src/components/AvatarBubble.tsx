import { Feather } from "@expo/vector-icons";
import { Image, StyleSheet, Text, View } from "react-native";

import { getAvatarById } from "@/src/constants/avatars";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";

type AvatarBubbleProps = {
    avatarId?: string | null;
    backgroundColor?: string | null;
    name?: string | null;
    size?: number;
};

function getInitials(name?: string | null) {
    const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];

    if (parts.length === 0) return null;
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();

    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function AvatarBubble({
                                 avatarId,
                                 backgroundColor,
                                 name,
                                 size = 44,
                             }: AvatarBubbleProps) {
    const theme = useAppTheme();
    const styles = createStyles(theme, size);

    const initials = getInitials(name);
    const circleBackground = backgroundColor || theme.colors.accentSoft;

    if (!avatarId) {
        return (
            <View style={[styles.circle, { backgroundColor: circleBackground }]}>
                {initials ? (
                    <Text style={styles.initials}>{initials}</Text>
                ) : (
                    <Feather
                        name="user"
                        size={size * 0.45}
                        color={theme.colors.textMuted}
                    />
                )}
            </View>
        );
    }

    const avatar = getAvatarById(avatarId);

    return (
        <View style={[styles.circle, { backgroundColor: circleBackground }]}>
            <Image source={avatar.image} style={styles.image} />
        </View>
    );
}

function createStyles(theme: AppTheme, size: number) {
    return StyleSheet.create({
        circle: {
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
        },
        image: {
            width: size * 0.74,
            height: size * 0.74,
            resizeMode: "contain",
        },
        initials: {
            color: theme.colors.text,
            fontSize: size * 0.34,
            fontWeight: theme.typography.fontWeight.semibold,
        },
    });
}