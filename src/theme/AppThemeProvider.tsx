import React, {
    createContext,
    useContext,
    useMemo,
    useState,
} from "react";
import { useColorScheme } from "react-native";
import { darkTheme, greenTheme, lightTheme } from "./theme";

export type ThemePreference = "system" | "light" | "dark" | "green";

type AppThemeContextValue = {
    themePreference: ThemePreference;
    setThemePreference: (preference: ThemePreference) => Promise<void>;
    theme: typeof lightTheme;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function isThemePreference(value: unknown): value is ThemePreference {
    return (
        value === "system" ||
        value === "light" ||
        value === "dark" ||
        value === "green"
    );
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
    const systemScheme = useColorScheme();

    const [themePreference, setThemePreferenceState] =
        useState<ThemePreference>("system");

    async function setThemePreference(preference: ThemePreference) {
        setThemePreferenceState(preference);
    }

    const activeTheme =
        themePreference === "system"
            ? systemScheme === "light"
                ? lightTheme
                : darkTheme
            : themePreference === "light"
                ? lightTheme
                : themePreference === "dark"
                    ? darkTheme
                    : greenTheme;

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