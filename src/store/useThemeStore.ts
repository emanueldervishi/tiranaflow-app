import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";
import { create } from "zustand";

import { darkTheme, lightTheme } from "@/constants/theme";

export type ThemePreference = "light" | "dark" | "system";

type ThemeStore = {
  preference: ThemePreference;
  ready: boolean;
  hydrate: () => Promise<void>;
  setPreference: (preference: ThemePreference) => Promise<void>;
};

const STORAGE_KEY = "tiranaflow-theme";

export const useThemeStore = create<ThemeStore>((set) => ({
  preference: "system",
  ready: false,
  hydrate: async () => {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    set({ preference: stored === "light" || stored === "dark" ? stored : "system", ready: true });
  },
  setPreference: async (preference) => {
    set({ preference });
    await AsyncStorage.setItem(STORAGE_KEY, preference);
  },
}));

export const useAppTheme = () => {
  const system = useColorScheme();
  const preference = useThemeStore((state) => state.preference);
  const dark = preference === "dark" || (preference === "system" && system === "dark");
  return dark ? darkTheme : lightTheme;
};
