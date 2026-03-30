import { useColorScheme } from "react-native";
import { darkTheme, lightTheme } from "./theme";

export function useAppTheme() {
    const scheme = useColorScheme();
    return scheme === "light" ? lightTheme : darkTheme;
}