import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs, router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScalePressable } from "@/components/ScalePressable";
import { useAppTheme } from "@/store/useThemeStore";

const icons = {
  map: ["map-outline", "map"],
  feed: ["list-outline", "list"],
  assistant: ["chatbubble-ellipses-outline", "chatbubble-ellipses"],
  profile: ["person-outline", "person"],
} as const;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  return (
    <Tabs
      initialRouteName="map"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.ink,
        tabBarInactiveTintColor: theme.tabInactive,
        tabBarStyle: [styles.bar, { bottom: Math.max(insets.bottom, 10) }],
        tabBarBackground: () => <BlurView intensity={theme.dark ? 58 : 72} tint={theme.dark ? "dark" : "light"} style={styles.tabBackdrop} />,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
        tabBarIcon: ({ focused, color }) => {
          const names = icons[route.name as keyof typeof icons];
          if (!names) return null;
          return <Ionicons name={focused ? names[1] : names[0]} size={20} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="map" options={{ title: "Map" }} />
      <Tabs.Screen name="feed" options={{ title: "Feed" }} />
      <Tabs.Screen
        name="capture"
        options={{
          title: "",
          tabBarButton: () => (
            <View style={styles.reportSlot}>
              <View style={[styles.reportHalo, { backgroundColor: theme.glassStrong }]}>
                <ScalePressable onPress={() => router.push("/report/new" as never)} style={styles.reportButton} scaleTo={0.9}>
                  <Ionicons name="add" size={31} color="#FFF" />
                </ScalePressable>
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen name="assistant" options={{ title: "Ask AI" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 27,
    right: 27,
    height: 64,
    paddingHorizontal: 7,
    paddingTop: 4,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.42)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.32)",
    borderRadius: 27,
    backgroundColor: "transparent",
    overflow: "visible",
    shadowColor: "#151515",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  item: { height: 54, paddingTop: 2 },
  tabBackdrop: { ...StyleSheet.absoluteFillObject, borderRadius: 27, overflow: "hidden" },
  label: { fontSize: 8.5, fontWeight: "600", letterSpacing: 0.65 },
  reportSlot: { flex: 1, alignItems: "center", justifyContent: "center" },
  reportHalo: {
    width: 68,
    height: 68,
    borderRadius: 34,
    marginTop: -38,
    alignItems: "center",
    justifyContent: "center",
  },
  reportButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 9 },
    elevation: 12,
  },
});
