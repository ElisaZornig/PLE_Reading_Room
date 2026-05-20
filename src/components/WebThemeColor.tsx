// src/components/WebThemeColor.tsx
import { useEffect } from "react";
import { Platform } from "react-native";
import { useAppTheme } from "@/src/theme/useAppTheme";

export function WebThemeColor() {
    const theme = useAppTheme();

    useEffect(() => {
        if (Platform.OS !== "web") return;

        let meta = document.querySelector('meta[name="theme-color"]');

        if (!meta) {
            meta = document.createElement("meta");
            meta.setAttribute("name", "theme-color");
            document.head.appendChild(meta);
        }

        meta.setAttribute("content", theme.colors.background);
    }, [theme.colors.background]);

    return null;
}