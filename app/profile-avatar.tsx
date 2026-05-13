import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AVATAR_BACKGROUNDS } from "@/src/constants/avatarBackgrounds";
import { AVATARS, getAvatarById } from "@/src/constants/avatars";
import { supabase } from "@/src/services/supabase";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";

type ProfileAvatarSettings = {
    id: string;
    avatar_id: string | null;
    avatar_background_color: string | null;
};

export default function ProfileAvatarScreen() {
    const theme = useAppTheme();
    const styles = createStyles(theme);

    const [profile, setProfile] = useState<ProfileAvatarSettings | null>(null);
    const [selectedAvatarId, setSelectedAvatarId] = useState("1");
    const [selectedBackground, setSelectedBackground] = useState("#F6D3CB");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    async function fetchProfile() {
        setLoading(true);

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            router.replace("/auth");
            return;
        }

        const { data, error } = await supabase
            .from("profiles")
            .select("id, avatar_id, avatar_background_color")
            .eq("id", user.id)
            .single();

        if (error) {
            console.error("Error fetching avatar settings:", error.message);
        } else {
            setProfile(data);
            setSelectedAvatarId(data.avatar_id || "1");
            setSelectedBackground(data.avatar_background_color || "#F6D3CB");
        }

        setLoading(false);
    }

    async function saveChanges() {
        if (!profile) return;

        setSaving(true);

        const { error } = await supabase
            .from("profiles")
            .update({
                avatar_id: selectedAvatarId,
                avatar_background_color: selectedBackground,
            })
            .eq("id", profile.id);

        setSaving(false);

        if (error) {
            console.error("Error saving avatar:", error.message);
            return;
        }

        router.back();
    }

    useEffect(() => {
        void fetchProfile();
    }, []);

    if (loading) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>Avatar laden...</Text>
            </SafeAreaView>
        );
    }

    const selectedAvatar = getAvatarById(selectedAvatarId);

    return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <ScrollView
                style={styles.screen}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.topRow}>
                    <Pressable style={styles.iconButton} onPress={() => router.back()}>
                        <Feather name="arrow-left" size={20} color={theme.colors.text} />
                    </Pressable>

                    <Text style={styles.pageTitle}>Avatar</Text>

                    <View style={styles.iconButtonPlaceholder} />
                </View>

                <View style={styles.previewCard}>
                    <View
                        style={[
                            styles.previewCircle,
                            { backgroundColor: selectedBackground },
                        ]}
                    >
                        <Image source={selectedAvatar.image} style={styles.previewImage} />
                    </View>

                    <Text style={styles.previewText}>Zo ziet je profiel eruit</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Kies je poppetje</Text>

                    <View style={styles.avatarGrid}>
                        {AVATARS.map((avatar) => {
                            const isSelected = avatar.id === selectedAvatarId;

                            return (
                                <Pressable
                                    key={avatar.id}
                                    onPress={() => setSelectedAvatarId(avatar.id)}
                                    style={[
                                        styles.avatarOption,
                                        isSelected && styles.avatarOptionSelected,
                                    ]}
                                >
                                    <Image source={avatar.image} style={styles.avatarImage} />
                                </Pressable>
                            );
                        })}
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Kies achtergrondkleur</Text>

                    <View style={styles.colorGrid}>
                        {AVATAR_BACKGROUNDS.map((background) => {
                            const isSelected = background.color === selectedBackground;

                            return (
                                <Pressable
                                    key={background.id}
                                    onPress={() => setSelectedBackground(background.color)}
                                    style={[
                                        styles.colorOption,
                                        { backgroundColor: background.color },
                                        isSelected && styles.colorOptionSelected,
                                    ]}
                                >
                                    {isSelected && (
                                        <Feather name="check" size={18} color="#2B1F1D" />
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>
                </View>

                <Pressable
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                    onPress={saveChanges}
                    disabled={saving}
                >
                    <Text style={styles.saveButtonText}>
                        {saving ? "Opslaan..." : "Opslaan"}
                    </Text>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        screen: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        content: {
            padding: theme.spacing.lg,
            paddingBottom: 40,
        },
        center: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.background,
        },
        loadingText: {
            marginTop: theme.spacing.sm,
            color: theme.colors.textMuted,
        },
        topRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: theme.spacing.lg,
        },
        iconButton: {
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
        },
        iconButtonPlaceholder: {
            width: 44,
            height: 44,
        },
        pageTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        previewCard: {
            alignItems: "center",
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.xl,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.xl,
            marginBottom: theme.spacing.lg,
        },
        previewCircle: {
            width: 136,
            height: 136,
            borderRadius: 68,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            marginBottom: theme.spacing.md,
        },
        previewImage: {
            width: 104,
            height: 104,
            resizeMode: "contain",
        },
        previewText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
        },
        card: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.lg,
            marginBottom: theme.spacing.lg,
        },
        sectionTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
            marginBottom: theme.spacing.md,
        },
        avatarGrid: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: theme.spacing.md,
        },
        avatarOption: {
            width: "30%",
            aspectRatio: 1,
            borderRadius: theme.radius.lg,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.surface,
            borderWidth: 2,
            borderColor: theme.colors.border,
        },
        avatarOptionSelected: {
            borderColor: theme.colors.accent,
            backgroundColor: theme.colors.accentSoft,
        },
        avatarImage: {
            width: 64,
            height: 64,
            resizeMode: "contain",
        },
        colorGrid: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: theme.spacing.md,
        },
        colorOption: {
            width: 48,
            height: 48,
            borderRadius: 24,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: theme.colors.border,
        },
        colorOptionSelected: {
            borderColor: theme.colors.text,
        },
        saveButton: {
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.pill,
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 14,
        },
        saveButtonDisabled: {
            opacity: 0.6,
        },
        saveButtonText: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.md,
            fontWeight: theme.typography.fontWeight.semibold,
        },
    });
}