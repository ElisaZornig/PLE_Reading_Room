import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const isServer = typeof window === "undefined";

const webStorage = {
    getItem: async (key: string) => {
        if (isServer) return null;
        return window.localStorage.getItem(key);
    },
    setItem: async (key: string, value: string) => {
        if (isServer) return;
        window.localStorage.setItem(key, value);
    },
    removeItem: async (key: string) => {
        if (isServer) return;
        window.localStorage.removeItem(key);
    },
};

const storage =
    Platform.OS === "web"
        ? webStorage
        : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage,
        autoRefreshToken: !isServer,
        persistSession: true,
        detectSessionInUrl: false,
    },
});