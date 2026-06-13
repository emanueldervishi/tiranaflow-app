export type AppTheme = {
  dark: boolean;
  bg: string;
  bgSoft: string;
  card: string;
  cardMuted: string;
  glass: string;
  glassStrong: string;
  ink: string;
  inkMuted: string;
  inkSoft: string;
  border: string;
  accent: string;
  accentSoft: string;
  success: string;
  danger: string;
  shadow: string;
  tabInactive: string;
};

export const lightTheme: AppTheme = {
  dark: false,
  bg: "#F6F6F2",
  bgSoft: "#ECECE7",
  card: "#FFFFFF",
  cardMuted: "#F0F0EC",
  glass: "rgba(255,255,255,0.72)",
  glassStrong: "rgba(255,255,255,0.90)",
  ink: "#111315",
  inkMuted: "#62676F",
  inkSoft: "#90959D",
  border: "rgba(20,22,25,0.08)",
  accent: "#7259C7",
  accentSoft: "#EEE9FF",
  success: "#2D8758",
  danger: "#C64E44",
  shadow: "#15171A",
  tabInactive: "#7D8289",
};

export const darkTheme: AppTheme = {
  dark: true,
  bg: "#0E1013",
  bgSoft: "#171A1F",
  card: "#191C21",
  cardMuted: "#22262C",
  glass: "rgba(24,27,32,0.76)",
  glassStrong: "rgba(20,23,28,0.92)",
  ink: "#F7F7F5",
  inkMuted: "#B0B5BD",
  inkSoft: "#777E88",
  border: "rgba(255,255,255,0.09)",
  accent: "#A792FF",
  accentSoft: "#28233C",
  success: "#6AD69A",
  danger: "#F17D72",
  shadow: "#000000",
  tabInactive: "#8D939C",
};

// Legacy primitives still used by a few generic components.
export const colors = {
  ...lightTheme,
  accentSoft: lightTheme.accentSoft,
  successSoft: "#EAF5EE",
  warning: "#D18C19",
  black: "#111111",
};
