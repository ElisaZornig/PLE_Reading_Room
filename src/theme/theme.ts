import { colors } from "./colors";
import { radius, spacing } from "./spacing";
import { fontSize, fontWeight, lineHeight } from "./typography";

export const lightTheme = {
    colors: colors.light,
    spacing,
    radius,
    typography: {
        fontSize,
        lineHeight,
        fontWeight,
    },
};

export const darkTheme = {
    colors: colors.dark,
    spacing,
    radius,
    typography: {
        fontSize,
        lineHeight,
        fontWeight,
    },
};

export type AppTheme = typeof lightTheme;