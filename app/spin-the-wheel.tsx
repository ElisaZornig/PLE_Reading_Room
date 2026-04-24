import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Easing,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, {Circle, G, Path, Polygon, Text as SvgText} from "react-native-svg";
import { useFocusEffect } from "@react-navigation/native";

import { AppHeader } from "@/src/components/AppHeader";
import {
    fetchClubShortlist,
    type ClubShortlistItem, clearClubShortlist,
} from "@/src/services/supabaseClubShortlist";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";
import {setCurrentClubBookAndAddToTbr, updateCurrentBookInSupabase} from "@/src/services/supabaseClub";
import {triggerRefresh} from "@/src/utils/refreshEvents";
import {ScreenTopBar} from "@/src/components/ScreenTopBar";
import {t} from "@/src/i18n";

const WHEEL_SIZE = 280;
const RADIUS = 130;
const CENTER = WHEEL_SIZE / 2;

export default function SpinTheWheelScreen() {
    const theme = useAppTheme();
    const styles = createStyles(theme);
    const params = useLocalSearchParams();

    const clubId = useMemo(() => {
        const value = params.clubId;
        return Array.isArray(value) ? value[0] : value;
    }, [params.clubId]);

    const [shortlistBooks, setShortlistBooks] = useState<ClubShortlistItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSpinning, setIsSpinning] = useState(false);
    const [winner, setWinner] = useState<ClubShortlistItem | null>(null);


    const rotation = useRef(new Animated.Value(0)).current;
    const currentRotation = useRef(0);

    async function loadShortlist() {
        try {
            setIsLoading(true);

            const data = await fetchClubShortlist(clubId ?? "");
            setShortlistBooks(data);
        } catch (error) {
            console.error("Error loading shortlist for wheel:", error);
            Alert.alert(
                t("spinWheel.errors.loadTitle"),
                t("spinWheel.errors.loadMessage")
            );
        } finally {
            setIsLoading(false);
        }
    }

    useFocusEffect(
        useCallback(() => {
            loadShortlist();
        }, [clubId])
    );

    const wheelBooks = shortlistBooks.slice(0, 12);

    const segmentAngle = wheelBooks.length > 0 ? 360 / wheelBooks.length : 0;

    const animatedRotation = rotation.interpolate({
        inputRange: [0, 10000],
        outputRange: ["0deg", "10000deg"],
    });

    function polarToCartesian(
        centerX: number,
        centerY: number,
        radius: number,
        angleInDegrees: number
    ) {
        const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;

        return {
            x: centerX + radius * Math.cos(angleInRadians),
            y: centerY + radius * Math.sin(angleInRadians),
        };
    }

    function describeSlice(startAngle: number, endAngle: number) {
        const start = polarToCartesian(CENTER, CENTER, RADIUS, endAngle);
        const end = polarToCartesian(CENTER, CENTER, RADIUS, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

        return [
            `M ${CENTER} ${CENTER}`,
            `L ${start.x} ${start.y}`,
            `A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
            "Z",
        ].join(" ");
    }

    function getSegmentColor(index: number) {
        const colors = [
            theme.colors.accent,
            theme.colors.accentSoft,
            theme.colors.surface,
            theme.colors.card,
        ];

        return colors[index % colors.length];
    }

    function getTargetRotationForWinner(index: number) {
        const targetNormalized =
            (360 - ((index + 0.5) * segmentAngle) + 360) % 360;

        const currentNormalized = currentRotation.current % 360;
        const delta =
            ((targetNormalized - currentNormalized + 360) % 360) + 5 * 360;

        return currentRotation.current + delta;
    }

    function handleSpin() {
        console.log("spin pressed", {
            wheelBooksLength: wheelBooks.length,
            isSpinning,
        });
        if (wheelBooks.length < 2 || isSpinning) {
            return;
        }

        const winnerIndex = Math.floor(Math.random() * wheelBooks.length);
        const selectedWinner = wheelBooks[winnerIndex];
        const targetRotation = getTargetRotationForWinner(winnerIndex);

        setIsSpinning(true);
        setWinner(null);

        Animated.timing(rotation, {
            toValue: targetRotation,
            duration: 4200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start(() => {
            currentRotation.current = targetRotation;
            setWinner(selectedWinner);
            setIsSpinning(false);
        });
    }
    async function handleMakeCurrentBook() {
        if (!winner || !clubId) {
            return;
        }

        try {
            await setCurrentClubBookAndAddToTbr({
                clubId,
                bookId: winner.bookId,
            });
            triggerRefresh("club","books", "home");
            router.replace({
                pathname: "/club",
                params: { clubId },
            });
        } catch (error) {
            console.error("Error setting current book from wheel:", error);
            Alert.alert(
                t("spinWheel.errors.setCurrentTitle"),
                t("spinWheel.errors.setCurrentMessage")
            );
        }
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <ScreenTopBar title={t("spinWheel.title")} />
            <View style={styles.screen}>
                <View style={styles.header}>

                    <Text style={styles.subtitle}>{t("spinWheel.subtitle")}</Text>
                </View>

                {isLoading ? (
                    <View style={styles.stateWrapper}>
                        <Text style={styles.stateText}>{t("spinWheel.loading")}</Text>
                    </View>
                ) : wheelBooks.length < 2 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>{t("spinWheel.notEnoughTitle")}</Text>
                        <Text style={styles.emptyText}>{t("spinWheel.notEnoughText")}</Text>

                        <Pressable
                            style={styles.secondaryButton}
                            onPress={() =>
                                router.push({
                                    pathname: "/choose-next-book",
                                    params: { clubId: clubId ?? "" },
                                })
                            }
                        >
                            <Text style={styles.secondaryButtonText}>{t("spinWheel.goToShortlist")}</Text>
                        </Pressable>
                    </View>
                ) : (
                    <>
                        <View style={styles.wheelArea}>
                            <View style={styles.pointerWrap}>
                                <Svg width={28} height={20}>
                                    <Polygon
                                        points="14,20 2,2 26,2"
                                        fill={theme.colors.accent}
                                    />
                                </Svg>
                            </View>

                            <Animated.View
                                style={[
                                    styles.wheelWrap,
                                    {
                                        transform: [{ rotate: animatedRotation }],
                                    },
                                ]}
                            >
                                <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
                                    {wheelBooks.map((book, index) => {
                                        const startAngle = index * segmentAngle;
                                        const endAngle = startAngle + segmentAngle;
                                        const midAngle = startAngle + segmentAngle / 2;
                                        const labelPosition = polarToCartesian(
                                            CENTER,
                                            CENTER,
                                            RADIUS * 0.72,
                                            midAngle
                                        );

                                        const shortLabel =
                                            book.title.length > 9 ? `${book.title.slice(0, 9)}…` : book.title;

// Laat de tekst van het midden naar buiten lopen.
// Op de linkerhelft draaien we hem om zodat hij leesbaar blijft.
                                        const radialAngle = midAngle - 90;
                                        const textRotation = midAngle > 180 ? radialAngle + 180 : radialAngle;


                                        return (
                                            <G key={book.optionId}>
                                                <Path
                                                    d={describeSlice(startAngle, endAngle)}
                                                    fill={getSegmentColor(index)}
                                                    stroke={theme.colors.border}
                                                    strokeWidth={2}
                                                />
                                                <SvgText
                                                    x={labelPosition.x}
                                                    y={labelPosition.y}
                                                    fill={theme.colors.text}
                                                    fontSize="10"
                                                    fontWeight="700"
                                                    textAnchor="middle"
                                                    alignmentBaseline="middle"
                                                    transform={`rotate(${textRotation} ${labelPosition.x} ${labelPosition.y})`}
                                                >
                                                    {shortLabel}
                                                </SvgText>
                                            </G>
                                        );
                                    })}

                                    <Circle
                                        cx={CENTER}
                                        cy={CENTER}
                                        r={22}
                                        fill={theme.colors.background}
                                        stroke={theme.colors.border}
                                        strokeWidth={2}
                                    />
                                </Svg>
                            </Animated.View>
                        </View>
                        <Pressable
                            style={[
                                styles.primaryButton,
                                isSpinning && styles.primaryButtonDisabled,
                            ]}
                            onPress={handleSpin}
                            disabled={isSpinning}
                        >
                            <Text style={styles.primaryButtonText}>
                                {isSpinning
                                    ? t("spinWheel.spinning")
                                    : winner
                                        ? t("spinWheel.spinAgain")
                                        : t("spinWheel.spinButton")}
                            </Text>
                        </Pressable>
                        {/*<View style={styles.legendCard}>*/}
                        {/*    <Text style={styles.legendTitle}>Wheel books</Text>*/}

                        {/*    <View style={styles.legendList}>*/}
                        {/*        {wheelBooks.map((book, index) => (*/}
                        {/*            <View key={book.optionId} style={styles.legendRow}>*/}
                        {/*                <View style={styles.legendNumber}>*/}
                        {/*                    <Text style={styles.legendNumberText}>{index + 1}</Text>*/}
                        {/*                </View>*/}

                        {/*                <View style={styles.legendTextWrap}>*/}
                        {/*                    <Text style={styles.legendBookTitle}>{book.title}</Text>*/}
                        {/*                    <Text style={styles.legendBookAuthor}>{book.author}</Text>*/}
                        {/*                </View>*/}
                        {/*            </View>*/}
                        {/*        ))}*/}
                        {/*    </View>*/}
                        {/*</View>*/}

                        {winner ? (
                            <View style={styles.resultCard}>
                                <Text style={styles.resultLabel}>{t("spinWheel.winner")}</Text>
                                <Text style={styles.resultText}>{winner.title}</Text>
                                <Text style={styles.resultSubtext}>{winner.author}</Text>
                            </View>
                        ) : null}
                        {winner ? (
                            <Pressable
                                style={styles.secondaryButton}
                                onPress={handleMakeCurrentBook}
                            >
                                <Text style={styles.secondaryButtonText}>{t("spinWheel.makeCurrentBook")}</Text>
                            </Pressable>
                        ) : null}

                    </>
                )}
            </View>
        </SafeAreaView>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        resultSubtext: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
        },
        screen: {
            flex: 1,
            backgroundColor: theme.colors.background,
            padding: theme.spacing.lg,
            gap: theme.spacing.md,
        },
        header: {
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
            lineHeight: 20,
        },
        stateWrapper: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
        },
        stateText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
        },
        emptyCard: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            gap: theme.spacing.md,
        },
        emptyTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        emptyText: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 20,
        },
        secondaryButton: {
            backgroundColor: theme.colors.accentSoft,
            borderRadius: theme.radius.pill,
            paddingVertical: 12,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: theme.colors.border,
        },
        secondaryButtonText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        wheelArea: {
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 12,
            paddingBottom: theme.spacing.md,
        },
        pointerWrap: {
            zIndex: 2,
            marginBottom: -6,
        },
        wheelWrap: {
            width: WHEEL_SIZE,
            height: WHEEL_SIZE,
            alignItems: "center",
            justifyContent: "center",
        },
        legendCard: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            gap: theme.spacing.sm,
        },
        legendTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.md,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        legendList: {
            gap: theme.spacing.sm,
        },
        legendRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
        },
        legendNumber: {
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: theme.colors.accentSoft,
            alignItems: "center",
            justifyContent: "center",
        },
        legendNumberText: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        legendTextWrap: {
            flex: 1,
        },
        legendBookTitle: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        legendBookAuthor: {
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.xs,
        },
        resultCard: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            gap: 4,
        },
        resultLabel: {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        resultText: {
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.md,
            fontWeight: theme.typography.fontWeight.semibold,
        },
        primaryButton: {
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.pill,
            paddingVertical: 14,
            alignItems: "center",
            justifyContent: "center",
            marginTop: "auto",
        },
        primaryButtonDisabled: {
            opacity: 0.7,
        },
        primaryButtonText: {
            color: "#FFFFFF",
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
        },
    });
}