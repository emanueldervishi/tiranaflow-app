import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ReportCard } from "@/components/ReportCard";
import { ScalePressable } from "@/components/ScalePressable";
import { useCityStore } from "@/store/useCityStore";
import { useSessionStore } from "@/store/useSessionStore";
import { useAppTheme } from "@/store/useThemeStore";
import type { ReportType } from "@/types/domain";

const filters: { label: string; type: ReportType | "all" }[] = [
  { label: "All", type: "all" }, { label: "Accidents", type: "traffic_accident" }, { label: "Traffic", type: "heavy_traffic" }, { label: "Fire", type: "fire" }, { label: "Flood", type: "flood" }, { label: "Police", type: "police_activity" }, { label: "Protests", type: "protest" },
];

export default function FeedScreen() {
  const theme = useAppTheme();
  const reports = useCityStore((state) => state.reports);
  const isLoading = useCityStore((state) => state.isLoading);
  const hydrate = useCityStore((state) => state.hydrate);
  const userId = useSessionStore((state) => state.userId);
  const [filter, setFilter] = useState<ReportType | "all">("all");
  const visible = useMemo(() => reports.filter((report) => filter === "all" || report.type === filter), [filter, reports]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]} edges={["top", "left", "right"]}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ReportCard report={item} onPress={() => router.push(`/reports/${item.id}` as never)} />}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => hydrate(userId)} tintColor={theme.ink} />}
        ListHeaderComponent={<><View style={styles.liveRow}><View style={styles.livePulse}><View style={styles.liveDot} /></View><Text style={[styles.liveLabel, { color: theme.inkMuted }]}>LIVE · UPDATED NOW</Text></View><Text style={[styles.title, { color: theme.ink }]}>Live in Tirana</Text><Text style={[styles.subtitle, { color: theme.inkMuted }]}><Text style={[styles.strong, { color: theme.ink }]}>{reports.length}</Text> active reports and verified incidents around the city</Text><FlatList horizontal data={filters} keyExtractor={(item) => item.type} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} renderItem={({ item }) => { const active = filter === item.type; return <ScalePressable onPress={() => setFilter(item.type)} style={[styles.filter, { backgroundColor: active ? theme.ink : theme.cardMuted }]}><Text style={[styles.filterText, { color: active ? theme.bg : theme.inkMuted }]}>{item.label}</Text></ScalePressable>; }} /></>}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="radio-outline" size={30} color={theme.inkSoft} /><Text style={[styles.emptyTitle, { color: theme.ink }]}>No reports in this view</Text><Text style={[styles.emptyCopy, { color: theme.inkMuted }]}>Try another filter or pull down to refresh.</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingHorizontal: 16, paddingTop: 22, paddingBottom: 120 }, liveRow: { flexDirection: "row", alignItems: "center", gap: 8 }, livePulse: { width: 9, height: 9, borderRadius: 5, backgroundColor: "rgba(45,170,97,0.2)", alignItems: "center", justifyContent: "center" }, liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#35B66C" }, liveLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1.4 }, title: { fontSize: 35, lineHeight: 39, fontWeight: "700", letterSpacing: -1.2, marginTop: 8 }, subtitle: { fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 16 }, strong: { fontWeight: "700" }, filters: { gap: 8, paddingBottom: 16 }, filter: { height: 34, paddingHorizontal: 14, borderRadius: 17, alignItems: "center", justifyContent: "center" }, filterText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8 }, separator: { height: 10 }, empty: { alignItems: "center", paddingVertical: 60 }, emptyTitle: { fontSize: 17, fontWeight: "600", marginTop: 12 }, emptyCopy: { fontSize: 13, marginTop: 5 },
});
