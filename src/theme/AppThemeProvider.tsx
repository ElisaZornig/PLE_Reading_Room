import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { darkTheme, lightTheme } from "./theme";

export type ThemePreference = "system" | "light" | "dark";

type AppThemeContextValue = {
    themePreference: ThemePreference;
    setThemePreference: (preference: ThemePreference) => Promise<void>;
    theme: typeof lightTheme;
};

const STORAGE_KEY = "app_theme_preference";

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
    const systemScheme = useColorScheme();
    const [themePreference, setThemePreferenceState] =
        useState<ThemePreference>("system");

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then((storedTheme) => {
            if (
                storedTheme === "system" ||
                storedTheme === "light" ||
                storedTheme === "dark"
            ) {
                setThemePreferenceState(storedTheme);
            }
        });
    }, []);

    async function setThemePreference(preference: ThemePreference) {
        setThemePreferenceState(preference);
        await AsyncStorage.setItem(STORAGE_KEY, preference);
    }

    const activeTheme =
        themePreference === "system"
            ? systemScheme === "light"
                ? lightTheme
                : darkTheme
            : themePreference === "light"
                ? lightTheme
                : darkTheme;

    const value = useMemo(
        () => ({
            themePreference,
            setThemePreference,
            theme: activeTheme,
        }),
        [themePreference, activeTheme]
    );

    return (
        <AppThemeContext.Provider value={value}>
            {children}
        </AppThemeContext.Provider>
    );
}

export function useAppThemeContext() {
    const context = useContext(AppThemeContext);

    if (!context) {
        throw new Error("useAppThemeContext must be used inside AppThemeProvider");
    }

    return context;
}