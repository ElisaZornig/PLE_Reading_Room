import { useAppThemeContext } from "./AppThemeProvider";

export function useAppTheme() {
    return useAppThemeContext().theme;
}