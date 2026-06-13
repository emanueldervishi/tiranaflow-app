import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { ReportAvatar } from "@/components/ReportAvatar";
import { ReportCard } from "@/components/ReportCard";
import { ScalePressable } from "@/components/ScalePressable";
import { AIChatPanel } from "@/components/AIChatPanel";
import { SEVERITY_META, TIRANA_CENTER } from "@/constants/city";
import { useCityStore } from "@/store/useCityStore";
import { useAppTheme } from "@/store/useThemeStore";
import type { Report, Severity } from "@/types/domain";

type Cluster = { key: string; latitude: number; longitude: number; reports: Report[] };

const clusterReports = (reports: Report[]) => {
  const clusters: Cluster[] = [];
  for (const report of reports) {
    const found = clusters.find((cluster) => Math.abs(cluster.latitude - report.latitude) < 0.00065 && Math.abs(cluster.longitude - report.longitude) < 0.00065);
    if (found) found.reports.push(report);
    else clusters.push({ key: report.id, latitude: report.latitude, longitude: report.longitude, reports: [report] });
  }
  return clusters;
};

export default function MapScreen() {
  const mapRef = useRef<MapView | null>(null);
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const reports = useCityStore((state) => state.reports);
  const isLoading = useCityStore((state) => state.isLoading);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Severity | "all">("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<Report | null>(null);
  const [cluster, setCluster] = useState<Report[] | null>(null);
  const [userRegion, setUserRegion] = useState<Region | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInitial, setChatInitial] = useState<string | undefined>();

  useEffect(() => {
    void (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") return;
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserRegion({ latitude: location.coords.latitude, longitude: location.coords.longitude, latitudeDelta: 0.025, longitudeDelta: 0.025 });
    })();
  }, []);

  const filtered = useMemo(() => reports.filter((report) => filter === "all" || report.severity === filter), [filter, reports]);
  const clusters = useMemo(() => clusterReports(filtered), [filtered]);
  const critical = reports.filter((report) => report.severity === "critical").length;

  const openAssistant = () => {
    setChatInitial(query.trim() || undefined);
    setChatOpen(true);
    setQuery("");
  };

  const dismissMapOverlays = () => {
    setSelected(null);
    setCluster(null);
    setFiltersOpen(false);
  };

  return (
    <View style={styles.screen}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...TIRANA_CENTER, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
        showsUserLocation
        showsMyLocationButton={false}
        mapPadding={{ top: insets.top + 86, right: 12, bottom: 120, left: 12 }}
        onPress={dismissMapOverlays}
      >
        {clusters.map((entry) => {
          const top = [...entry.reports].sort((a, b) => SEVERITY_META[b.severity].rank - SEVERITY_META[a.severity].rank)[0];
          return (
            <Marker
              key={`${entry.key}-${entry.reports.length}`}
              coordinate={{ latitude: entry.latitude, longitude: entry.longitude }}
              anchor={{ x: 0.5, y: 1 }}
              onPress={() => entry.reports.length > 1 ? setCluster(entry.reports) : setSelected(top)}
            >
              <View style={styles.pin}>
                <ReportAvatar report={top} size={entry.reports.length > 1 ? 46 : 40} count={entry.reports.length > 1 ? entry.reports.length : undefined} />
                <View style={styles.pinTip} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      <SafeAreaView pointerEvents="box-none" style={styles.topLayer} edges={["top", "left", "right"]}>
        <View style={styles.topRow}>
          <BlurView intensity={theme.dark ? 48 : 72} tint={theme.dark ? "dark" : "light"} style={[styles.searchWrap, { borderColor: theme.border }]}>
            <Ionicons name="search" size={17} color={theme.inkMuted} />
            <TextInput value={query} onChangeText={setQuery} onSubmitEditing={openAssistant} onFocus={() => setChatOpen(true)} placeholder="Search or ask Tirana AI..." placeholderTextColor={theme.inkSoft} style={[styles.searchInput, { color: theme.ink }]} />
            <Ionicons name="sparkles" size={15} color={theme.accent} />
          </BlurView>
          <ScalePressable onPress={() => setFiltersOpen((value) => !value)} style={[styles.topButton, { backgroundColor: theme.glassStrong, borderColor: theme.border }]}><Ionicons name="options-outline" size={19} color={theme.ink} /></ScalePressable>
          <ScalePressable onPress={() => router.push("/(tabs)/profile" as never)} style={[styles.topButton, { backgroundColor: theme.glassStrong, borderColor: theme.border }]}><Ionicons name="person-outline" size={19} color={theme.ink} /></ScalePressable>
        </View>
        {filtersOpen ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {(["all", "critical", "serious", "low"] as const).map((value) => (
              <ScalePressable key={value} onPress={() => setFilter(value)} style={[styles.filterChip, { backgroundColor: theme.glassStrong }, filter === value && { backgroundColor: theme.ink }]}>
                <Text style={[styles.filterText, { color: theme.inkMuted }, filter === value && { color: theme.bg }]}>{value}</Text>
              </ScalePressable>
            ))}
          </ScrollView>
        ) : null}
      </SafeAreaView>

      <View pointerEvents="box-none" style={[styles.mapStatus, { top: insets.top + (filtersOpen ? 112 : 70) }]}>
        <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>{isLoading ? "Updating" : `${filtered.length} live`}</Text></View>
        {critical > 0 ? <View style={styles.criticalPill}><Text style={styles.criticalText}>{critical} critical</Text></View> : null}
      </View>

      <ScalePressable
        style={[styles.locateButton, { bottom: insets.bottom + 90, backgroundColor: theme.glassStrong }]}
        onPress={() => userRegion && mapRef.current?.animateToRegion(userRegion, 450)}
      ><Ionicons name="locate-outline" size={23} color={theme.ink} /></ScalePressable>

      {selected ? (
        <View style={[styles.preview, { bottom: insets.bottom + 94 }]}>
          <ReportCard report={selected} compact onPress={() => { setSelected(null); router.push(`/reports/${selected.id}` as never); }} />
          <ScalePressable style={styles.previewClose} onPress={() => setSelected(null)}><Ionicons name="close" size={17} color="#FFF" /></ScalePressable>
        </View>
      ) : null}

      <Modal visible={!!cluster} transparent animationType="slide" onRequestClose={() => setCluster(null)}>
        <View style={styles.modalBackdrop}>
          <ScalePressable style={StyleSheet.absoluteFill} onPress={() => setCluster(null)} />
          <View style={[styles.clusterSheet, { paddingBottom: insets.bottom + 24, backgroundColor: theme.bg }]}>
            <View style={styles.handle} />
            <View style={styles.clusterHeader}><View><Text style={[styles.clusterEyebrow, { color: theme.inkSoft }]}>NEARBY REPORTS</Text><Text style={[styles.clusterTitle, { color: theme.ink }]}>{cluster?.length ?? 0} reports in this area</Text></View><ScalePressable onPress={() => setCluster(null)} style={[styles.closeButton, { backgroundColor: theme.cardMuted }]}><Ionicons name="close" size={19} color={theme.ink} /></ScalePressable></View>
            <ScrollView style={styles.clusterList} contentContainerStyle={styles.clusterContent}>
              {cluster?.map((report) => <ReportCard key={report.id} report={report} compact onPress={() => { setCluster(null); router.push(`/reports/${report.id}` as never); }} />)}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <AIChatPanel open={chatOpen} initialQuery={chatInitial} onClose={() => { setChatOpen(false); setChatInitial(undefined); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#ECEAE4" },
  topLayer: { position: "absolute", top: 0, left: 0, right: 0 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingTop: 10 },
  searchWrap: { flex: 1, height: 46, borderRadius: 17, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 9, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, shadowColor: "#000", shadowOpacity: 0.11, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 9 },
  searchInput: { flex: 1, color: "#171717", fontSize: 14, paddingVertical: 0 },
  topButton: { width: 46, height: 46, borderRadius: 17, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 8 },
  filters: { paddingHorizontal: 14, paddingTop: 9, gap: 7 },
  filterChip: { paddingHorizontal: 14, height: 35, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.94)" },
  filterText: { color: "#676767", fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  mapStatus: { position: "absolute", left: 14, flexDirection: "row", gap: 7 },
  livePill: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 11, height: 30, borderRadius: 15, backgroundColor: "rgba(20,20,20,0.84)" },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#51CD82" },
  liveText: { color: "#FFF", fontSize: 11, fontWeight: "700" },
  criticalPill: { height: 30, borderRadius: 15, justifyContent: "center", paddingHorizontal: 11, backgroundColor: "rgba(209,67,59,0.92)" },
  criticalText: { color: "#FFF", fontSize: 11, fontWeight: "700" },
  pin: { alignItems: "center" },
  pinTip: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 9, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: "#FFF", marginTop: -3 },
  locateButton: { position: "absolute", right: 18, width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 9 },
  preview: { position: "absolute", left: 14, right: 14 },
  previewClose: { position: "absolute", right: 7, top: 7, width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(20,20,20,0.72)" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.28)" },
  clusterSheet: { maxHeight: "70%", borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 16, paddingTop: 10, backgroundColor: "#F7F7F5" },
  handle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: "#D5D5D2", marginBottom: 16 },
  clusterHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 3, marginBottom: 14 },
  clusterEyebrow: { color: "#888", fontSize: 10, fontWeight: "800", letterSpacing: 1.6 },
  clusterTitle: { color: "#151515", fontSize: 22, fontWeight: "600", letterSpacing: -0.5, marginTop: 3 },
  closeButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "#EDEDEA" },
  clusterList: { flexGrow: 0 },
  clusterContent: { gap: 10 },
});
