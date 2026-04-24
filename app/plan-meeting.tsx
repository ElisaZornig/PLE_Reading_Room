import { Feather } from "@expo/vector-icons";
import DateTimePicker, {
    DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
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
import { t } from "@/src/i18n";
import { createMeetingInSupabase } from "@/src/services/supabaseClub";
import { createPageStyles } from "@/src/styles/pageStyles";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import { triggerRefresh } from "@/src/utils/refreshEvents";
import { showAppAlert } from "@/src/utils/appAlert";
import {ScreenTopBar} from "@/src/components/ScreenTopBar";

export default function PlanMeetingScreen() {
    const theme = useAppTheme();
    const pageStyles = createPageStyles(theme);
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
    function handleWebDateChange(value: string) {
        setDate(value);

        const [year, month, day] = value.split("-").map(Number);

        if (!year || !month || !day) return;

        const updated = new Date(selectedDateTime);
        updated.setFullYear(year, month - 1, day);
        setSelectedDateTime(updated);
    }

    function handleWebTimeChange(value: string) {
        setTime(value);

        const [hours, minutes] = value.split(":").map(Number);

        if (Number.isNaN(hours) || Number.isNaN(minutes)) return;

        const updated = new Date(selectedDateTime);
        updated.setHours(hours, minutes, 0, 0);
        setSelectedDateTime(updated);
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

            triggerRefresh("club", "home");
            router.back();
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : t("planMeeting.errorFallback");

            showAppAlert(t("planMeeting.errorTitle"), message);
        } finally {
            setIsLoading(false);
        }
    }
    const screenContent = (
        <View style={pageStyles.screen}>
            <View style={styles.screenContent}>

                <View style={styles.form}>
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>{t("planMeeting.meetingTitle")}</Text>
                        <TextInput
                            value={title}
                            onChangeText={setTitle}
                            placeholder={t("planMeeting.titlePlaceholder")}
                            placeholderTextColor={theme.colors.textMuted}
                            style={styles.input}
                        />
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>{t("planMeeting.date")}</Text>

                        {Platform.OS === "web" ? (
                            <View style={styles.webPickerInput}>
                                <TextInput
                                    value={date}
                                    style={styles.webPickerTextInput}
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor={theme.colors.textMuted}
                                    {...({
                                        type: "date",
                                        onChange: (event: any) =>
                                            handleWebDateChange(event.target.value),
                                    } as any)}
                                />

                                <Feather name="calendar" size={18} color={theme.colors.accent} />
                            </View>
                        ) : (
                            <Pressable style={styles.input} onPress={openDatePicker}>
                                <Text style={styles.inputText}>{date}</Text>
                            </Pressable>
                        )}
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>{t("planMeeting.time")}</Text>

                        {Platform.OS === "web" ? (
                            <View style={styles.webPickerInput}>
                                <TextInput
                                    value={time}
                                    style={styles.webPickerTextInput}
                                    placeholder="HH:MM"
                                    placeholderTextColor={theme.colors.textMuted}
                                    {...({
                                        type: "time",
                                        onChange: (event: any) =>
                                            handleWebTimeChange(event.target.value),
                                    } as any)}
                                />

                                <Feather name="clock" size={18} color={theme.colors.accent} />
                            </View>
                        ) : (
                            <Pressable style={styles.input} onPress={openTimePicker}>
                                <Text style={styles.inputText}>{time}</Text>
                            </Pressable>
                        )}
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>{t("planMeeting.location")}</Text>
                        <TextInput
                            value={location}
                            onChangeText={setLocation}
                            placeholder={t("planMeeting.optional")}
                            placeholderTextColor={theme.colors.textMuted}
                            style={styles.input}
                        />
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>{t("planMeeting.notes")}</Text>
                        <TextInput
                            value={notes}
                            onChangeText={setNotes}
                            placeholder={t("planMeeting.optional")}
                            placeholderTextColor={theme.colors.textMuted}
                            style={[styles.input, styles.textArea]}
                            multiline
                            textAlignVertical="top"
                        />
                    </View>
                </View>

                {Platform.OS !== "web" ? (
                    <Modal
                        visible={pickerMode !== null}
                        transparent
                        animationType="fade"
                        onRequestClose={() => setPickerMode(null)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalCard}>
                                {pickerMode ? (
                                    <DateTimePicker
                                        value={selectedDateTime}
                                        mode={pickerMode}
                                        display="spinner"
                                        onChange={handleIosPickerChange}
                                        style={styles.iosPicker}
                                    />
                                ) : null}

                                <Pressable
                                    style={styles.modalButton}
                                    onPress={() => setPickerMode(null)}
                                >
                                    <Text style={styles.modalButtonText}>
                                        {t("planMeeting.done")}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </Modal>
                ) : null}

                <Pressable
                    style={[
                        styles.primaryButton,
                        isLoading && styles.primaryButtonDisabled,
                    ]}
                    onPress={handleCreateMeeting}
                    disabled={isLoading}
                >
                    <Text style={styles.primaryButtonText}>
                        {isLoading
                            ? t("planMeeting.saving")
                            : t("planMeeting.save")}
                    </Text>
                </Pressable>
            </View>
        </View>
    )

    return (
        <SafeAreaView style={pageStyles.safeArea} edges={["top"]}>
            <ScreenTopBar title={t("planMeeting.title")} />
            <KeyboardAvoidingView
                style={pageStyles.safeArea}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                {Platform.OS === "web" ? (
                    screenContent
                ) : (
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                        {screenContent}
                    </TouchableWithoutFeedback>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        screenContent: {
            flex: 1,
            padding: theme.spacing.lg,
        },
        webPickerInput: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md,
            paddingHorizontal: 14,
            paddingVertical: 0,
        },

        webPickerTextInput: {
            flex: 1,
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            paddingVertical: 12,
            outlineStyle: "none" as any,
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