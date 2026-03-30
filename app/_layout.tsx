import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../src/services/supabase";

export default function RootLayout() {
    const scheme = useColorScheme();
    const segments = useSegments();

    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session);
            setIsLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            setSession(nextSession);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (isLoading) return;

        const inAuthRoute =
            segments[0] === "auth" || segments[0] === "sign-up";

        if (!session && !inAuthRoute) {
            router.replace("/auth");
            return;
        }

        if (session && inAuthRoute) {
            router.replace("/");
        }
    }, [session, segments, isLoading]);

    if (isLoading) {
        return null;
    }

    return (
        <SafeAreaProvider>
            <StatusBar style={scheme === "dark" ? "light" : "dark"} />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="add-book" />
                <Stack.Screen name="book/[id]" />
                <Stack.Screen name="auth" />
                <Stack.Screen name="sign-up" />
            </Stack>
        </SafeAreaProvider>
    );
}