import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { t } from "@/src/i18n";
import { AppTheme } from "@/src/theme/theme";
import { useAppTheme } from "@/src/theme/useAppTheme";

type TabIconName = keyof typeof Ionicons.glyphMap;

function TabIcon({
                     name,
                     focused,
                     color,
                 }: {
    name: TabIconName;
    focused: boolean;
    color: string;
}) {
    const theme = useAppTheme();
    const styles = createStyles(theme);

    return (
        <View>
            <Ionicons name={name} size={20} color={color} />
        </View>
    );
}

export default function TabsLayout() {
    const theme = useAppTheme();
    const styles = createStyles(theme);

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: theme.colors.accent,
                tabBarInactiveTintColor: theme.colors.tabInactive,
                tabBarShowLabel: true,
                tabBarLabelStyle: styles.tabLabel,
                tabBarItemStyle: styles.tabItem,
                tabBarStyle: styles.tabBar,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: t("tabs.home"),
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon name="home-outline" focused={focused} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="books"
                options={{
                    title: t("tabs.books"),
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon name="book-outline" focused={focused} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="club"
                options={{
                    title: t("tabs.club"),
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon name="people-outline" focused={focused} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        tabBar: {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 18,

            marginHorizontal: 18,
            height: 72,

            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderTopWidth: 1,
            borderColor: theme.colors.border,

            paddingTop: 8,
            paddingBottom: 10,

            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
            elevation: 8,
        },
        tabItem: {
            borderRadius: theme.radius.pill,
        },
        tabLabel: {
            fontSize: 11,
            fontWeight: theme.typography.fontWeight.medium,
            marginTop: 2,
        },
    });
}