import { Feather } from "@expo/vector-icons";
import DateTimePicker, {
    DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/src/components/AppHeader";
import { createMeetingInSupabase } from "@/src/services/supabaseClub";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";

export default function PlanMeetingScreen() {
    const theme = useAppTheme();
    const styles = createStyles(theme);
    const params = useLocalSearchParams();

    const clubId = useMemo(() => {
        const value = params.clubId;
        return Array.isArray(value) ? value[0] : value;
    }, [params.clubId]);

    function formatDate(date: Date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function formatTime(date: Date) {
        return date.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    }

    const [title, setTitle] = useState("");
    const [location, setLocation] = useState("");
    const [notes, setNotes] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const [selectedDateTime, setSelectedDateTime] = useState(new Date());
    const [date, setDate] = useState(formatDate(new Date()));
    const [time, setTime] = useState(formatTime(new Date()));
    const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);

    function applyDate(pickedDate: Date) {
        const updated = new Date(selectedDateTime);
        updated.setFullYear(
            pickedDate.getFullYear(),
            pickedDate.getMonth(),
            pickedDate.getDate()
        );
        setSelectedDateTime(updated);
        setDate(formatDate(updated));
    }

    function applyTime(pickedDate: Date) {
        const updated = new Date(selectedDateTime);
        updated.setHours(pickedDate.getHours(), pickedDate.getMinutes(), 0, 0);
        setSelectedDateTime(updated);
        setTime(formatTime(updated));
    }

    function openDatePicker() {
        if (Platform.OS === "android") {
            DateTimePickerAndroid.open({
                value: selectedDateTime,
                mode: "date",
                onChange: (event, pickedDate) => {
                    if (event.type === "set" && pickedDate) {
                        applyDate(pickedDate);
                    }
                },
            });
            return;
        }

        setPickerMode("date");
    }

    function openTimePicker() {
        if (Platform.OS === "android") {
            DateTimePickerAndroid.open({
                value: selectedDateTime,
                mode: "time",
                is24Hour: true,
                onChange: (event, pickedDate) => {
                    if (event.type === "set" && pickedDate) {
                        applyTime(pickedDate);
                    }
                },
            });
            return;
        }

        setPickerMode("time");
    }

    function handleIosPickerChange(_: unknown, pickedDate?: Date) {
        if (!pickedDate || !pickerMode) {
            return;
        }

        if (pickerMode === "date") {
            applyDate(pickedDate);
        } else {
            applyTime(pickedDate);
        }
    }

    async function handleCreateMeeting() {
        try {
            setIsLoading(true);

            await createMeetingInSupabase({
                clubId: clubId ?? "",
                title,
                date,
                time,
                location,
                notes,
            });

            router.replace("/club");
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Something went wrong while planning the meeting.";
            Alert.alert("Plan meeting error", message);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <AppHeader />

            <KeyboardAvoidingView
                style={styles.safeArea}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                    <View style={styles.screen}>
                        <View style={styles.header}>
                            <View style={styles.titleRow}>
                                <Pressable style={styles.backButton} onPress={() => router.back()}>
                                    <Feather
                                        name="chevron-left"
                                        size={24}
                                        color={theme.colors.accent}
                                    />
                                </Pressable>

                                <Text style={styles.title}>Plan a meeting</Text>
                            </View>

                            <Text style={styles.subtitle}>
                                Add your next book club moment.
                            </Text>
                        </View>

                        <View style={styles.form}>
                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>Title</Text>
                                <TextInput
                                    value={title}
                                    onChangeText={setTitle}
                                    placeholder="For example: April meeting"
                                    placeholderTextColor={theme.colors.textMuted}
                                    style={styles.input}
                                />
                            </View>

                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>Date</Text>
                                <Pressable style={styles.input} onPress={openDatePicker}>
                                    <Text style={styles.inputText}>{date}</Text>
                                </Pressable>
                            </View>

                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>Time</Text>
                                <Pressable style={styles.input} onPress={openTimePicker}>
                                    <Text style={styles.inputText}>{time}</Text>
                                </Pressable>
                            </View>

                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>Location</Text>
                                <TextInput
                                    value={location}
                                    onChangeText={setLocation}
                                    placeholder="Optional"
                                    placeholderTextColor={theme.colors.textMuted}
                                    style={styles.input}
                                />
                            </View>

                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>Notes</Text>
                                <TextInput
                                    value={notes}
                                    onChangeText={setNotes}
                                    placeholder="Optional"
                                    placeholderTextColor={theme.colors.textMuted}
                                    style={[styles.input, styles.textArea]}
                                    multiline
                                    textAlignVertical="top"
                                />
                            </View>
                        </View>

                        <Modal
                            visible={pickerMode !== null}
                            transparent
                            animationType="fade"
                            onRequestClose={() => setPickerMode(null)}
                        >
                            <View style={styles.modalOverlay}>
                                <View style={styles.modalCard}>
                                    <DateTimePicker
                                        value={selectedDateTime}
                                        mode={pickerMode === "date" ? "date" : "time"}
                                        display="spinner"
                                        onChange={handleIosPickerChange}
                                        style={styles.iosPicker}
                                    />

                                    <Pressable
                                        style={styles.modalButton}
                                        onPress={() => setPickerMode(null)}
                                    >
                                        <Text style={styles.modalButtonText}>Done</Text>
                                    </Pressable>
                                </View>
                            </View>
                        </Modal>

                        <Pressable
                            style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
                            onPress={handleCreateMeeting}
                            disabled={isLoading}
                        >
                            <Text style={styles.primaryButtonText}>
                                {isLoading ? "Saving..." : "Plan meeting"}
                            </Text>
                        </Pressable>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
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
            padding: theme.spacing.lg,
        },
        header: {
            marginBottom: theme.spacing.xl,
            gap: theme.spacing.sm,
        },
        titleRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.xs,
        },
        backButton: {
            width: 32,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
        },
        title: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.xxl,
            fontWeight: theme.typography.fontWeight.bold,
        },
        subtitle: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: theme.typography.lineHeight.sm,
        },
        form: {
            gap: theme.spacing.lg,
        },
        fieldGroup: {
            gap: theme.spacing.sm,
        },
        label: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
        },
        input: {
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
        },
        inputText: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
        },
        textArea: {
            minHeight: 120,
        },
        primaryButton: {
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.pill,
            paddingVertical: 14,
            alignItems: "center",
            marginTop: theme.spacing.xl,
        },
        primaryButtonDisabled: {
            opacity: 0.7,
        },
        primaryButtonText: {
            color: "#FFFFFF",
            fontWeight: theme.typography.fontWeight.semibold,
            fontSize: theme.typography.fontSize.sm,
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.25)",
            justifyContent: "center",
            padding: theme.spacing.lg,
        },
        modalCard: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
        },
        iosPicker: {
            alignSelf: "stretch",
        },
        modalButton: {
            marginTop: theme.spacing.md,
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.pill,
            paddingVertical: 12,
            alignItems: "center",
        },
        modalButtonText: {
            color: "#FFFFFF",
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
    });
}