import "react-native-gesture-handler";
import "react-native-reanimated";

import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { supabase } from "@/lib/supabase";
import { useCityStore } from "@/store/useCityStore";
import { useSessionStore } from "@/store/useSessionStore";
import { useAppTheme, useThemeStore } from "@/store/useThemeStore";

export default function RootLayout() {
  const theme = useAppTheme();
  const { userId, bootstrap, setSession, isReady } = useSessionStore();
  const hydrate = useCityStore((state) => state.hydrate);
  const subscribe = useCityStore((state) => state.subscribe);
  const reset = useCityStore((state) => state.reset);
  const hydrateTheme = useThemeStore((state) => state.hydrate);

  useEffect(() => {
    void hydrateTheme();
  }, [hydrateTheme]);

  useEffect(() => {
    void bootstrap();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session?.user ? { userId: session.user.id, email: session.user.email ?? null } : null);
    });
    return () => data.subscription.unsubscribe();
  }, [bootstrap, setSession]);

  useEffect(() => {
    if (!userId) {
      reset();
      return;
    }
    void hydrate(userId);
    return subscribe(userId);
  }, [hydrate, reset, subscribe, userId]);

  if (!isReady) return <StatusBar style={theme.dark ? "light" : "dark"} />;

  return (
    <>
      <StatusBar style={theme.dark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!userId}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={!!userId}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="report/new" />
          <Stack.Screen name="reports/[id]" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
