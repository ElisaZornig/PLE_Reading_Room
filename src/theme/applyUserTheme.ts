import { supabase } from "@/src/services/supabase";
import {
    isThemePreference,
    ThemePreference,
} from "@/src/theme/AppThemeProvider";

export async function getUserAppTheme(userId: string): Promise<ThemePreference> {
    const { data, error } = await supabase
        .from("profiles")
        .select("app_theme")
        .eq("id", userId)
        .single();

    if (error || !data || !isThemePreference(data.app_theme)) {
        return "system";
    }

    return data.app_theme;
}