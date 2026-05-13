import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet } from "react-native";

import { AvatarBubble } from "@/src/components/AvatarBubble";
import { supabase } from "@/src/services/supabase";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";

type ProfileButtonData = {
    display_name: string | null;
    avatar_id: string | null;
    avatar_background_color: string | null;
};

export function ProfileButton() {
    const theme = useAppTheme();
    const styles = createStyles(theme);

    const [profile, setProfile] = useState<ProfileButtonData | null>(null);

    async function fetchProfileButtonData() {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data, error } = await supabase
            .from("profiles")
            .select("display_name, avatar_id, avatar_background_color")
            .eq("id", user.id)
            .single();

        if (!error && data) {
            setProfile(data);
        }
    }

    useFocusEffect(
        useCallback(() => {
            void fetchProfileButtonData();
        }, [])
    );

    return (
        <Pressable style={styles.button} onPress={() => router.push("/profile")}>
            <AvatarBubble
                avatarId={profile?.avatar_id}
                backgroundColor={profile?.avatar_background_color}
                name={profile?.display_name}
                size={42}
            />
        </Pressable>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        button: {
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
        },
    });
}