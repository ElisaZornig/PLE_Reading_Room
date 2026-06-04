import { colors } from "./colors";
import { radius, spacing } from "./spacing";
import { fontSize, fontWeight, lineHeight } from "./typography";

function createTheme(
    colorSet: typeof colors.light,
    mode: "light" | "dark",
    palette: "default" | "green" | "yellow"
) {
    return {
        mode,
        palette,
        colors: colorSet,
        spacing,
        radius,
        typography: {
            fontSize,
            lineHeight,
            fontWeight,
        },
    };
}

export const lightTheme = createTheme(colors.light, "light", "default");
export const darkTheme = createTheme(colors.dark, "dark", "default");

export const greenTheme = createTheme(colors.green, "light", "green");
export const greenDarkTheme = createTheme(colors.greenDark, "dark", "green");

export const yellowTheme = createTheme(colors.yellow, "light", "yellow");
export const yellowDarkTheme = createTheme(colors.yellowDark, "dark", "yellow");

export type AppTheme = typeof lightTheme;