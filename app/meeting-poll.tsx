import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    GestureResponderEvent,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenTopBar } from "@/src/components/ScreenTopBar";
import { t } from "@/src/i18n";
import { fetchCurrentUserClubRole } from "@/src/services/supabaseClub";
import {
    addMeetingPollDateOption,
    addMeetingPollLocationOption,
    confirmMeetingPoll, deleteMeetingPollDateOption,
    fetchActiveMeetingPoll,
    type MeetingPoll,
    type MeetingPollAvailability,
    type MeetingPollDateOption,
    type MeetingPollLocationOption, toggleMeetingPollLocationVote,
    voteForMeetingPollDate,
    voteForMeetingPollLocation,
} from "@/src/services/supabaseMeetingPolls";
import { createPageStyles } from "@/src/styles/pageStyles";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import { showAppAlert } from "@/src/utils/appAlert";
import DateTimePicker from "@react-native-community/datetimepicker";
import {Calendar, DateData} from "react-native-calendars";

export default function MeetingPollScreen() {
    const theme = useAppTheme();
    const pageStyles = createPageStyles(theme);
    const styles = createStyles(theme);

    const params = useLocalSearchParams<{ clubId?: string; pollId?: string }>();
    const clubId = Array.isArray(params.clubId) ? params.clubId[0] : params.clubId;

    const [poll, setPoll] = useState<MeetingPoll | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<"owner" | "member" | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingDate, setIsSavingDate] = useState(false);
    const [isSavingLocation, setIsSavingLocation] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);

    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedTime, setSelectedTime] = useState<Date | null>(null);
    const [showDateCalendar, setShowDateCalendar] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [locationInput, setLocationInput] = useState("");

    const [selectedDateOptionId, setSelectedDateOptionId] = useState<string | null>(null);
    const [selectedLocationOptionId, setSelectedLocationOptionId] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    async function handleRefresh() {
        if (isRefreshing) return;

        try {
            setIsRefreshing(true);
            await loadPoll(false);
        } finally {
            setIsRefreshing(false);
        }
    }

    const canConfirmMeeting = currentUserRole === "owner";

    const bestDateOption = useMemo(() => {
        if (!poll || poll.dateOptions.length === 0) return null;

        return [...poll.dateOptions].sort((a, b) => {
            const aScore = a.availableCount * 2 + a.maybeCount - a.unavailableCount;
            const bScore = b.availableCount * 2 + b.maybeCount - b.unavailableCount;

            return bScore - aScore;
        })[0];
    }, [poll]);

    const bestLocationOption = useMemo(() => {
        if (!poll || poll.locationOptions.length === 0) return null;

        return [...poll.locationOptions].sort((a, b) => b.voteCount - a.voteCount)[0];
    }, [poll]);

    async function loadPoll(showLoader = true) {
        if (!clubId) return;

        try {
            if (showLoader) {
                setIsLoading(true);
            }

            const [pollData, role] = await Promise.all([
                fetchActiveMeetingPoll(clubId),
                fetchCurrentUserClubRole({ clubId }),
            ]);

            setPoll(pollData);
            setCurrentUserRole(role);

            if (pollData) {
                const bestDate = [...pollData.dateOptions].sort((a, b) => {
                    const aScore = a.availableCount * 2 + a.maybeCount - a.unavailableCount;
                    const bScore = b.availableCount * 2 + b.maybeCount - b.unavailableCount;

                    return bScore - aScore;
                })[0];

                const bestLocation = [...pollData.locationOptions].sort(
                    (a, b) => b.voteCount - a.voteCount
                )[0];

                setSelectedDateOptionId((current) =>
                    current && pollData.dateOptions.some((option) => option.id === current)
                        ? current
                        : bestDate?.id ?? null
                );

                setSelectedLocationOptionId((current) =>
                    current && pollData.locationOptions.some((option) => option.id === current)
                        ? current
                        : bestLocation?.id ?? null
                );
            }
        } catch (error) {
            console.log("Error loading meeting poll:", error);
            showAppAlert(
                t("meetingPoll.loadErrorTitle"),
                t("meetingPoll.loadErrorText")
            );
        } finally {
            if (showLoader) {
                setIsLoading(false);
            }
        }
    }

    useEffect(() => {
        void loadPoll();
    }, [clubId]);

    async function handleAddDateOption() {
        if (!poll || isSavingDate) return;

        if (!selectedDate) {
            showAppAlert(
                t("meetingPoll.addDateErrorTitle"),
                t("meetingPoll.chooseDateFirst")
            );
            return;
        }

        try {
            setIsSavingDate(true);

            await addMeetingPollDateOption({
                pollId: poll.id,
                date: selectedDate,
                time: selectedTime ? formatTimeForDatabase(selectedTime) : null,
            });

            setSelectedDate(null);
            setSelectedTime(null);
            await loadPoll(false);
        } catch (error) {
            console.log("Error adding date option:", error);
            showAppAlert(
                t("meetingPoll.addDateErrorTitle"),
                t("meetingPoll.addDateErrorText")
            );
        } finally {
            setIsSavingDate(false);
        }
    }

    async function handleVoteDate(
        optionId: string,
        availability: MeetingPollAvailability
    ) {
        updateDateVoteLocally(optionId, availability);

        try {
            await voteForMeetingPollDate({
                dateOptionId: optionId,
                availability,
            });

            void loadPoll(false);
        } catch (error) {
            console.log("Error voting date option:", error);
            void loadPoll(false);

            showAppAlert(
                t("meetingPoll.voteErrorTitle"),
                t("meetingPoll.voteErrorText")
            );
        }
    }

    async function handleDeleteDateOption(optionId: string) {
        setPoll((currentPoll) => {
            if (!currentPoll) return currentPoll;

            return {
                ...currentPoll,
                dateOptions: currentPoll.dateOptions.filter(
                    (option) => option.id !== optionId
                ),
            };
        });

        setSelectedDateOptionId((current) =>
            current === optionId ? null : current
        );

        try {
            await deleteMeetingPollDateOption({ dateOptionId: optionId });
            void loadPoll(false);
        } catch (error) {
            console.log("Error deleting date option:", error);
            void loadPoll(false);

            showAppAlert(
                t("meetingPoll.deleteDateErrorTitle"),
                t("meetingPoll.deleteDateErrorText")
            );
        }
    }

    async function handleAddLocationOption() {
        if (!poll || isSavingLocation) return;

        try {
            setIsSavingLocation(true);

            await addMeetingPollLocationOption({
                pollId: poll.id,
                label: locationInput,
            });

            setLocationInput("");
            await loadPoll(false);
        } catch (error) {
            console.log("Error adding location option:", error);
            showAppAlert(
                t("meetingPoll.addLocationErrorTitle"),
                t("meetingPoll.addLocationErrorText")
            );
        } finally {
            setIsSavingLocation(false);
        }
    }

    async function handleVoteLocation(optionId: string) {
        toggleLocationVoteLocally(optionId);

        try {
            await toggleMeetingPollLocationVote({
                locationOptionId: optionId,
            });

            void loadPoll(false);
        } catch (error) {
            console.log("Error voting location option:", error);
            void loadPoll(false);

            showAppAlert(
                t("meetingPoll.voteErrorTitle"),
                t("meetingPoll.voteErrorText")
            );
        }
    }

    async function handleConfirmMeeting() {
        if (!poll || !selectedDateOptionId || isConfirming) {
            showAppAlert(
                t("meetingPoll.confirmMissingTitle"),
                t("meetingPoll.confirmMissingText")
            );
            return;
        }

        try {
            setIsConfirming(true);

            await confirmMeetingPoll({
                pollId: poll.id,
                dateOptionId: selectedDateOptionId,
                locationOptionId: selectedLocationOptionId,
            });

            showAppAlert(
                t("meetingPoll.confirmSuccessTitle"),
                t("meetingPoll.confirmSuccessText")
            );

            router.replace({
                pathname: "/club",
                params: { refresh: Date.now().toString() },
            });
        } catch (error) {
            console.log("Error confirming meeting:", error);
            showAppAlert(
                t("meetingPoll.confirmErrorTitle"),
                t("meetingPoll.confirmErrorText")
            );
        } finally {
            setIsConfirming(false);
        }
    }

    const sortedDateOptions = useMemo(() => {
        if (!poll) return [];

        return [...poll.dateOptions].sort((a, b) => {
            const aValue = `${a.date}T${a.time ?? "00:00"}`;
            const bValue = `${b.date}T${b.time ?? "00:00"}`;

            return aValue.localeCompare(bValue);
        });
    }, [poll]);

    function updateDateVoteLocally(
        optionId: string,
        availability: MeetingPollAvailability
    ) {
        setPoll((currentPoll) => {
            if (!currentPoll) return currentPoll;

            return {
                ...currentPoll,
                dateOptions: currentPoll.dateOptions.map((option) => {
                    if (option.id !== optionId) return option;

                    const previousVote = option.currentUserVote;

                    let availableCount = option.availableCount;
                    let maybeCount = option.maybeCount;
                    let unavailableCount = option.unavailableCount;

                    if (previousVote === "available") availableCount -= 1;
                    if (previousVote === "maybe") maybeCount -= 1;
                    if (previousVote === "unavailable") unavailableCount -= 1;

                    if (availability === "available") availableCount += 1;
                    if (availability === "maybe") maybeCount += 1;
                    if (availability === "unavailable") unavailableCount += 1;

                    return {
                        ...option,
                        currentUserVote: availability,
                        availableCount: Math.max(0, availableCount),
                        maybeCount: Math.max(0, maybeCount),
                        unavailableCount: Math.max(0, unavailableCount),
                    };
                }),
            };
        });
    }
    function toggleLocationVoteLocally(optionId: string) {
        setPoll((currentPoll) => {
            if (!currentPoll) return currentPoll;

            return {
                ...currentPoll,
                locationOptions: currentPoll.locationOptions.map((option) => {
                    if (option.id !== optionId) return option;

                    const nextVoted = !option.currentUserVoted;

                    return {
                        ...option,
                        currentUserVoted: nextVoted,
                        voteCount: Math.max(
                            0,
                            option.voteCount + (nextVoted ? 1 : -1)
                        ),
                    };
                }),
            };
        });
    }
    const selectedDateOption = useMemo(() => {
        if (!poll || !selectedDateOptionId) return null;

        return poll.dateOptions.find((option) => option.id === selectedDateOptionId) ?? null;
    }, [poll, selectedDateOptionId]);

    const selectedLocationOption = useMemo(() => {
        if (!poll || !selectedLocationOptionId) return null;

        return (
            poll.locationOptions.find(
                (option) => option.id === selectedLocationOptionId
            ) ?? null
        );
    }, [poll, selectedLocationOptionId]);

    return (
        <SafeAreaView style={pageStyles.safeArea} edges={["top"]}>
            <ScreenTopBar
                title={t("meetingPoll.title")}
                right={
                    <Pressable
                        style={[
                            styles.refreshButton,
                            isRefreshing && styles.refreshButtonDisabled,
                        ]}
                        onPress={handleRefresh}
                        disabled={isRefreshing}
                    >
                        <Feather
                            name="refresh-cw"
                            size={16}
                            color={isRefreshing ? theme.colors.textMuted : theme.colors.accent}
                        />
                    </Pressable>
                }
            />
            <ScrollView
                style={pageStyles.screen}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {isLoading ? (
                    <View style={styles.stateCard}>
                        <Text style={styles.helperText}>
                            {t("meetingPoll.loading")}
                        </Text>
                    </View>
                ) : !poll ? (
                    <View style={styles.stateCard}>
                        <Text style={styles.helperText}>
                            {t("meetingPoll.noPoll")}
                        </Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.introCard}>
                            <View style={styles.introIcon}>
                                <Feather
                                    name="users"
                                    size={20}
                                    color={theme.colors.accent}
                                />
                            </View>

                            <View style={styles.introText}>
                                <Text style={styles.title}>
                                    {t("meetingPoll.introTitle")}
                                </Text>
                                <Text style={styles.subtitle}>
                                    {t("meetingPoll.introText")}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>
                                {t("meetingPoll.dateOptionsTitle")}
                            </Text>

                            <View style={styles.pickerBlock}>
                                <Text style={styles.inputLabel}>{t("meetingPoll.dateLabel")}</Text>

                                <Pressable
                                    style={styles.pickerButton}
                                    onPress={() => setShowDateCalendar(true)}
                                >
                                    <Feather name="calendar" size={16} color={theme.colors.accent} />
                                    <Text style={styles.pickerButtonText}>
                                        {formatPickedDate(selectedDate)}
                                    </Text>
                                </Pressable>

                                <Text style={styles.optionalHint}>
                                    {t("meetingPoll.timeOptionalHint")}
                                </Text>

                                <Pressable
                                    style={styles.pickerButton}
                                    onPress={() => setShowTimePicker(true)}
                                >
                                    <Feather name="clock" size={16} color={theme.colors.accent} />
                                    <Text style={styles.pickerButtonText}>
                                        {formatPickedTime(selectedTime)}
                                    </Text>
                                </Pressable>

                                {selectedTime ? (
                                    <Pressable onPress={() => setSelectedTime(null)}>
                                        <Text style={styles.clearTimeText}>
                                            {t("meetingPoll.clearTime")}
                                        </Text>
                                    </Pressable>
                                ) : null}

                                <Modal
                                    visible={showDateCalendar}
                                    transparent
                                    animationType="fade"
                                    onRequestClose={() => setShowDateCalendar(false)}
                                >
                                    <Pressable
                                        style={styles.modalOverlay}
                                        onPress={() => setShowDateCalendar(false)}
                                    >
                                        <Pressable
                                            style={styles.calendarModalCard}
                                            onPress={(event) => event.stopPropagation()}
                                        >
                                            <View style={styles.modalHeader}>
                                                <Text style={styles.modalTitle}>
                                                    {t("meetingPoll.chooseDate")}
                                                </Text>

                                                <Pressable onPress={() => setShowDateCalendar(false)}>
                                                    <Feather
                                                        name="x"
                                                        size={20}
                                                        color={theme.colors.textMuted}
                                                    />
                                                </Pressable>
                                            </View>

                                            <Calendar
                                                onDayPress={(day: DateData) => {
                                                    setSelectedDate(day.dateString);
                                                    setShowDateCalendar(false);
                                                }}
                                                markedDates={
                                                    selectedDate
                                                        ? {
                                                            [selectedDate]: {
                                                                selected: true,
                                                                selectedColor: theme.colors.accent,
                                                            },
                                                        }
                                                        : {}
                                                }
                                                theme={{
                                                    backgroundColor: theme.colors.card,
                                                    calendarBackground: theme.colors.card,
                                                    textSectionTitleColor: theme.colors.textMuted,
                                                    selectedDayBackgroundColor: theme.colors.accent,
                                                    selectedDayTextColor: "#FFFFFF",
                                                    todayTextColor: theme.colors.accent,
                                                    dayTextColor: theme.colors.text,
                                                    textDisabledColor: theme.colors.textMuted,
                                                    monthTextColor: theme.colors.text,
                                                    arrowColor: theme.colors.accent,
                                                }}
                                            />
                                        </Pressable>
                                    </Pressable>
                                </Modal>

                                {showTimePicker && Platform.OS !== "ios" ? (
                                    <DateTimePicker
                                        value={selectedTime ?? new Date()}
                                        mode="time"
                                        is24Hour
                                        display="default"
                                        onChange={(event, date) => {
                                            setShowTimePicker(false);

                                            if (event.type === "dismissed") {
                                                return;
                                            }

                                            if (date) {
                                                setSelectedTime(date);
                                            }
                                        }}
                                    />
                                ) : null}

                                <Modal
                                    visible={showTimePicker && Platform.OS === "ios"}
                                    transparent
                                    animationType="fade"
                                    onRequestClose={() => setShowTimePicker(false)}
                                >
                                    <Pressable
                                        style={styles.modalOverlay}
                                        onPress={() => setShowTimePicker(false)}
                                    >
                                        <Pressable
                                            style={styles.timeModalCard}
                                            onPress={(event) => event.stopPropagation()}
                                        >
                                            <View style={styles.modalHeader}>
                                                <Text style={styles.modalTitle}>
                                                    {t("meetingPoll.timeOptional")}
                                                </Text>

                                                <Pressable onPress={() => setShowTimePicker(false)}>
                                                    <Feather
                                                        name="x"
                                                        size={20}
                                                        color={theme.colors.textMuted}
                                                    />
                                                </Pressable>
                                            </View>

                                            <DateTimePicker
                                                value={selectedTime ?? new Date()}
                                                mode="time"
                                                is24Hour
                                                display="spinner"
                                                onChange={(_, date) => {
                                                    if (date) {
                                                        setSelectedTime(date);
                                                    }
                                                }}
                                            />

                                            <Pressable
                                                style={styles.donePickerButton}
                                                onPress={() => setShowTimePicker(false)}
                                            >
                                                <Text style={styles.donePickerButtonText}>
                                                    {t("common.done")}
                                                </Text>
                                            </Pressable>
                                        </Pressable>
                                    </Pressable>
                                </Modal>
                            </View>

                            <Pressable
                                style={[
                                    styles.primaryButton,
                                    isSavingDate && styles.disabledButton,
                                ]}
                                onPress={handleAddDateOption}
                                disabled={isSavingDate}
                            >
                                <Feather name="plus" size={16} color="#FFFFFF" />
                                <Text style={styles.primaryButtonText}>
                                    {t("meetingPoll.addDate")}
                                </Text>
                            </Pressable>

                            {poll.dateOptions.length === 0 ? (
                                <Text style={styles.emptyText}>
                                    {t("meetingPoll.noDatesYet")}
                                </Text>
                            ) : (
                                <View style={styles.optionList}>
                                    {sortedDateOptions.map((option) => (
                                        <DateOptionCard
                                            key={option.id}
                                            option={option}
                                            isSelected={selectedDateOptionId === option.id}
                                            isBestOption={bestDateOption?.id === option.id}
                                            onSelect={() => setSelectedDateOptionId(option.id)}
                                            onDelete={() => handleDeleteDateOption(option.id)}
                                            onVote={(availability) =>
                                                handleVoteDate(option.id, availability)
                                            }
                                        />
                                    ))}
                                </View>
                            )}
                        </View>

                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>
                                {t("meetingPoll.locationOptionsTitle")}
                            </Text>

                            <View style={styles.inputRow}>
                                <TextInput
                                    value={locationInput}
                                    onChangeText={setLocationInput}
                                    placeholder={t("meetingPoll.locationPlaceholder")}
                                    placeholderTextColor={theme.colors.textMuted}
                                    style={styles.input}
                                />
                            </View>

                            <Pressable
                                style={[
                                    styles.primaryButton,
                                    isSavingLocation && styles.disabledButton,
                                ]}
                                onPress={handleAddLocationOption}
                                disabled={isSavingLocation}
                            >
                                <Feather name="plus" size={16} color="#FFFFFF" />
                                <Text style={styles.primaryButtonText}>
                                    {t("meetingPoll.addLocation")}
                                </Text>
                            </Pressable>

                            {poll.locationOptions.length === 0 ? (
                                <Text style={styles.emptyText}>
                                    {t("meetingPoll.noLocationsYet")}
                                </Text>
                            ) : (
                                <View style={styles.optionList}>
                                    {poll.locationOptions.map((option) => (
                                        <LocationOptionCard
                                            key={option.id}
                                            option={option}
                                            isSelected={selectedLocationOptionId === option.id}
                                            isBestOption={bestLocationOption?.id === option.id}
                                            onSelect={() =>
                                                setSelectedLocationOptionId(option.id)
                                            }
                                            onVote={() => handleVoteLocation(option.id)}
                                        />
                                    ))}
                                </View>
                            )}
                        </View>

                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>
                                {t("meetingPoll.confirmTitle")}
                            </Text>

                            <Text style={styles.helperText}>
                                {canConfirmMeeting
                                    ? t("meetingPoll.confirmOwnerText")
                                    : t("meetingPoll.confirmMemberText")}
                            </Text>
                            <View style={styles.summaryBox}>
                                <Text style={styles.summaryTitle}>
                                    {t("meetingPoll.selectedOptionsTitle")}
                                </Text>

                                <View style={styles.summaryRow}>
                                    <Feather name="calendar" size={15} color={theme.colors.accent} />
                                    <Text style={styles.summaryText}>
                                        {selectedDateOption
                                            ? formatDateLabel(selectedDateOption.date, selectedDateOption.time)
                                            : t("meetingPoll.noDateSelected")}
                                    </Text>
                                </View>

                                <View style={styles.summaryRow}>
                                    <Feather name="map-pin" size={15} color={theme.colors.accent} />
                                    <Text style={styles.summaryText}>
                                        {selectedLocationOption
                                            ? selectedLocationOption.label
                                            : t("meetingPoll.noLocationSelected")}
                                    </Text>
                                </View>
                            </View>
                            <Pressable
                                style={[
                                    styles.confirmButton,
                                    (!canConfirmMeeting ||
                                        !selectedDateOptionId ||
                                        isConfirming) &&
                                    styles.disabledButton,
                                ]}
                                onPress={handleConfirmMeeting}
                                disabled={!canConfirmMeeting || !selectedDateOptionId || isConfirming}
                            >
                                <Text style={styles.confirmButtonText}>
                                    {isConfirming
                                        ? t("meetingPoll.confirming")
                                        : t("meetingPoll.confirmButton")}
                                </Text>
                            </Pressable>
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

function DateOptionCard({
                            option,
                            isSelected,
                            isBestOption,
                            onSelect,
                            onVote,
                            onDelete,
                        }: {
    option: MeetingPollDateOption;
    isSelected: boolean;
    isBestOption: boolean;
    onSelect: () => void;
    onDelete: () => void;
    onVote: (availability: MeetingPollAvailability) => void;
}) {
    const theme = useAppTheme();
    const styles = createStyles(theme);

    return (
        <View
            style={[
                styles.optionCard,
                isSelected && styles.optionCardSelected,
            ]}
        >
            <Pressable
                style={styles.optionHeader}
                onPress={onSelect}
            >
                <View style={styles.optionHeaderText}>
                    <Text style={styles.optionTitle}>
                        {formatDateLabel(option.date, option.time)}
                    </Text>

                    <Text style={styles.optionMeta}>
                        {option.availableCount} {t("meetingPoll.can")} ·{" "}
                        {option.maybeCount} {t("meetingPoll.maybe")} ·{" "}
                        {option.unavailableCount} {t("meetingPoll.cannot")}
                    </Text>
                </View>

                <View style={styles.optionActions}>
                    {isBestOption ? (
                        <View style={styles.bestBadge}>
                            <Text style={styles.bestBadgeText}>
                                {t("meetingPoll.bestOption")}
                            </Text>
                        </View>
                    ) : null}

                    <Pressable
                        style={styles.deleteIconButton}
                        onPress={onDelete}
                        hitSlop={8}
                    >
                        <Feather
                            name="trash-2"
                            size={15}
                            color={theme.colors.textMuted}
                        />
                    </Pressable>
                </View>
            </Pressable>

            <View style={styles.voteRow}>
                <VoteButton
                    label={t("meetingPoll.available")}
                    selected={option.currentUserVote === "available"}
                    onPress={() => onVote("available")}
                />

                <VoteButton
                    label={t("meetingPoll.maybeAvailable")}
                    selected={option.currentUserVote === "maybe"}
                    onPress={() => onVote("maybe")}
                />

                <VoteButton
                    label={t("meetingPoll.unavailable")}
                    selected={option.currentUserVote === "unavailable"}
                    onPress={() => onVote("unavailable")}
                />
            </View>
        </View>
    );
}

function LocationOptionCard({
                                option,
                                isSelected,
                                isBestOption,
                                onSelect,
                                onVote,
                            }: {
    option: MeetingPollLocationOption;
    isSelected: boolean;
    isBestOption: boolean;
    onSelect: () => void;
    onVote: () => void;
}) {
    const theme = useAppTheme();
    const styles = createStyles(theme);

    return (
        <View
            style={[
                styles.optionCard,
                isSelected && styles.optionCardSelected,
            ]}
        >
            <Pressable
                style={styles.optionHeader}
                onPress={onSelect}
            >
                <View style={styles.optionHeaderText}>
                    <Text style={styles.optionTitle}>{option.label}</Text>
                    <Text style={styles.optionMeta}>
                        {t("meetingPoll.locationVotes", {
                            count: option.voteCount,
                        })}
                    </Text>
                </View>

                {isBestOption ? (
                    <View style={styles.bestBadge}>
                        <Text style={styles.bestBadgeText}>
                            {t("meetingPoll.bestOption")}
                        </Text>
                    </View>
                ) : null}
            </Pressable>

            <Pressable
                style={[
                    styles.locationVoteButton,
                    option.currentUserVoted && styles.locationVoteButtonActive,
                ]}
                onPress={onVote}
            >
                <Feather
                    name="thumbs-up"
                    size={15}
                    color={option.currentUserVoted ? "#FFFFFF" : theme.colors.accent}
                />
                <Text
                    style={[
                        styles.locationVoteText,
                        option.currentUserVoted && styles.locationVoteTextActive,
                    ]}
                >
                    {option.currentUserVoted
                        ? t("meetingPoll.unvoteLocation")
                        : t("meetingPoll.voteLocation")}
                </Text>
            </Pressable>
        </View>
    );
}

function VoteButton({
                        label,
                        selected,
                        onPress,
                    }: {
    label: string;
    selected: boolean;
    onPress: () => void;
}) {
    const theme = useAppTheme();
    const styles = createStyles(theme);

    return (
        <Pressable
            style={[styles.voteButton, selected && styles.voteButtonSelected]}
            onPress={onPress}
        >
            <Text
                style={[
                    styles.voteButtonText,
                    selected && styles.voteButtonTextSelected,
                ]}
            >
                {label}
            </Text>
        </Pressable>
    );
}

function formatDateLabel(dateValue: string, timeValue: string | null) {
    const datePart = dateValue.includes("T")
        ? dateValue.split("T")[0]
        : dateValue;

    const cleanTime = timeValue ? timeValue.slice(0, 5) : null;

    const date = new Date(`${datePart}T${cleanTime ?? "12:00"}:00`);

    if (Number.isNaN(date.getTime())) {
        return cleanTime
            ? `${datePart} · ${cleanTime}`
            : `${datePart} · ${t("meetingPoll.timeToBeDecided")}`;
    }

    const formattedDate = new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
    }).format(date);

    if (!cleanTime) {
        return `${formattedDate} · ${t("meetingPoll.timeToBeDecided")}`;
    }

    return `${formattedDate} · ${cleanTime}`;
}

function formatTimeForDatabase(date: Date) {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${hours}:${minutes}`;
}

function formatPickedDate(date: string | null) {
    if (!date) return t("meetingPoll.chooseDate");

    return new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
    }).format(new Date(`${date}T12:00:00`));
}

function formatPickedTime(date: Date | null) {
    if (!date) return t("meetingPoll.timeOptional");

    return new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        summaryBox: {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            gap: theme.spacing.sm,
        },

        summaryTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },

        summaryRow: {
            flexDirection: "row",
            alignItems: "flex-start",
            gap: theme.spacing.sm,
        },

        summaryText: {
            flex: 1,
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
        },
        optionActions: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.xs,
        },

        deleteIconButton: {
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.border,
            alignItems: "center",
            justifyContent: "center",
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.35)",
            justifyContent: "center",
            padding: theme.spacing.lg,
        },

        calendarModalCard: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.xl,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            gap: theme.spacing.md,
        },

        timeModalCard: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.xl,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            gap: theme.spacing.md,
        },

        modalHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },

        modalTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.md,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        content: {
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.md,
            paddingBottom: 130,
            gap: theme.spacing.lg,
        },
        stateCard: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
        },
        introCard: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            flexDirection: "row",
            alignItems: "flex-start",
            gap: theme.spacing.md,
        },
        introIcon: {
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: theme.colors.accentSoft,
            alignItems: "center",
            justifyContent: "center",
        },
        introText: {
            flex: 1,
            gap: 4,
        },
        title: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.md,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        subtitle: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
        },
        sectionCard: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            gap: theme.spacing.md,
        },
        sectionTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.md,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        inputRow: {
            flexDirection: "row",
            gap: theme.spacing.sm,
        },
        input: {
            flex: 1,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.border,
            color: theme.colors.text,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: 10,
            fontSize: theme.typography.fontSize.sm,
        },
        timeInput: {
            maxWidth: 110,
        },
        primaryButton: {
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.pill,
            paddingVertical: 12,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: theme.spacing.sm,
        },
        primaryButtonText: {
            color: "#FFFFFF",
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        disabledButton: {
            opacity: 0.6,
        },
        optionList: {
            gap: theme.spacing.sm,
        },
        optionCard: {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            gap: theme.spacing.md,
        },
        optionCardSelected: {
            borderColor: theme.colors.accent,
        },
        optionHeader: {
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: theme.spacing.sm,
        },
        optionHeaderText: {
            flex: 1,
            gap: 3,
        },
        optionTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        optionMeta: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
        },
        bestBadge: {
            backgroundColor: theme.colors.accentSoft,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 9,
            paddingVertical: 4,
        },
        bestBadgeText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        voteRow: {
            flexDirection: "row",
            gap: theme.spacing.xs,
        },
        voteButton: {
            flex: 1,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.border,
            paddingVertical: 8,
            alignItems: "center",
            backgroundColor: theme.colors.card,
        },
        voteButtonSelected: {
            backgroundColor: theme.colors.accent,
            borderColor: theme.colors.accent,
        },
        voteButtonText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.medium,
        },
        voteButtonTextSelected: {
            color: "#FFFFFF",
        },
        locationVoteButton: {
            alignSelf: "flex-start",
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.accent,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: 8,
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.xs,
        },
        locationVoteButtonActive: {
            backgroundColor: theme.colors.accent,
        },
        locationVoteText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        locationVoteTextActive: {
            color: "#FFFFFF",
        },
        confirmButton: {
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.pill,
            paddingVertical: 13,
            alignItems: "center",
            justifyContent: "center",
        },
        confirmButtonText: {
            color: "#FFFFFF",
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        helperText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
        },
        emptyText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
        },
        pickerBlock: {
            gap: theme.spacing.sm,
        },

        inputLabel: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },

        pickerButton: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: 12,
        },

        pickerButtonText: {
            flex: 1,
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
        },

        optionalHint: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
            lineHeight: 18,
        },

        clearTimeText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.medium,
        },

        donePickerButton: {
            alignSelf: "flex-end",
            backgroundColor: theme.colors.accentSoft,
            borderRadius: theme.radius.pill,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: 8,
        },

        donePickerButtonText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        refreshButton: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.border,
            alignItems: "center",
            justifyContent: "center",
        },

        refreshButtonDisabled: {
            opacity: 0.6,
        },
    });
}
