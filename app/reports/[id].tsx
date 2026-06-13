import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Image, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScalePressable } from "@/components/ScalePressable";
import { REPORT_TYPES, SEVERITY_META, timeAgo } from "@/constants/city";
import { voteOnReport } from "@/services/city";
import { useCityStore } from "@/store/useCityStore";
import { useSessionStore } from "@/store/useSessionStore";
import { useAppTheme } from "@/store/useThemeStore";

export default function ReportDetailScreen() {
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const report = useCityStore((state) => state.reports.find((entry) => entry.id === id));
  const hydrate = useCityStore((state) => state.hydrate);
  const userId = useSessionStore((state) => state.userId);

  if (!report) return <View style={[styles.screen, { backgroundColor: theme.bg }]}><SafeAreaView style={styles.missing}><Text style={[styles.missingText, { color: theme.inkMuted }]}>Report unavailable.</Text><ScalePressable onPress={() => router.back()} style={styles.backTextButton}><Text style={{ color: theme.ink }}>Go back</Text></ScalePressable></SafeAreaView></View>;
  const type = REPORT_TYPES[report.type];
  const severity = SEVERITY_META[report.severity];

  const vote = async (value: "confirm" | "inaccurate") => {
    if (!userId || report.isLiveEvent) return;
    try {
      await voteOnReport(userId, report.id, value);
      await hydrate(userId);
    } catch (error) {
      Alert.alert("Vote failed", error instanceof Error ? error.message : "Could not record your vote.");
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: theme.cardMuted }]}>
          {report.imageUrl ? <Image source={{ uri: report.imageUrl }} style={styles.heroImage} /> : <View style={[styles.heroFallback, { backgroundColor: theme.dark ? theme.accentSoft : type.tint }]}><Ionicons name={type.icon} size={68} color={type.color} /></View>}
          <SafeAreaView style={styles.heroActions} edges={["top"]}><ScalePressable onPress={() => router.back()} style={[styles.heroButton, { backgroundColor: theme.glassStrong }]}><Ionicons name="chevron-back" size={22} color={theme.ink} /></ScalePressable><ScalePressable onPress={() => Share.share({ message: `${report.title} · TiranaFlow` })} style={[styles.heroButton, { backgroundColor: theme.glassStrong }]}><Ionicons name="share-outline" size={20} color={theme.ink} /></ScalePressable></SafeAreaView>
        </View>

        <View style={styles.article}>
          <View style={styles.metaRow}><View style={[styles.severity, { backgroundColor: severity.tint }]}><Text style={[styles.severityText, { color: severity.color }]}>{severity.label}</Text></View><View style={styles.typeRow}><Ionicons name={type.icon} size={15} color={type.color} /><Text style={[styles.typeText, { color: theme.inkMuted }]}>{type.label}</Text></View><Text style={[styles.time, { color: theme.inkSoft }]}>· {timeAgo(report.createdAt)}</Text></View>
          <Text style={[styles.title, { color: theme.ink }]}>{report.title}</Text>
          {report.description ? <Text style={[styles.description, { color: theme.inkMuted }]}>{report.description}</Text> : null}
          <View style={[styles.location, { backgroundColor: theme.cardMuted }]}><Ionicons name="location-outline" size={18} color={theme.inkMuted} /><View style={styles.locationText}><Text style={[styles.locationLabel, { color: theme.inkSoft }]}>LOCATION</Text><Text style={[styles.locationValue, { color: theme.ink }]}>{report.address || "Tirana"}</Text></View></View>
          {report.sourceCount > 1 ? <View style={styles.source}><Ionicons name="newspaper-outline" size={18} color={theme.inkMuted} /><Text style={[styles.sourceText, { color: theme.inkMuted }]}>Corroborated by {report.sourceCount} sources</Text></View> : null}
        </View>
      </ScrollView>

      {!report.isLiveEvent ? <SafeAreaView style={[styles.actions, { backgroundColor: theme.glassStrong }]} edges={["bottom"]}><ScalePressable onPress={() => vote("confirm")} style={styles.confirmButton}><Ionicons name="checkmark" size={19} color="#FFF" /><Text style={styles.confirmText}>Confirm ({report.confirmations})</Text></ScalePressable><ScalePressable onPress={() => vote("inaccurate")} style={[styles.inaccurateButton, { backgroundColor: theme.cardMuted }]}><Ionicons name="thumbs-down-outline" size={18} color={theme.ink} /><Text style={[styles.inaccurateText, { color: theme.ink }]}>Not accurate</Text></ScalePressable></SafeAreaView> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingBottom: 130 }, hero: { height: 370 }, heroImage: { width: "100%", height: "100%", resizeMode: "cover" }, heroFallback: { flex: 1, alignItems: "center", justifyContent: "center" }, heroActions: { position: "absolute", left: 16, right: 16, flexDirection: "row", justifyContent: "space-between", paddingTop: 10 }, heroButton: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  article: { paddingHorizontal: 22, paddingTop: 24 }, metaRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }, severity: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 }, severityText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8 }, typeRow: { flexDirection: "row", alignItems: "center", gap: 5 }, typeText: { fontSize: 13 }, time: { fontSize: 12 }, title: { fontSize: 31, lineHeight: 36, fontWeight: "600", letterSpacing: -0.9, marginTop: 16 }, description: { fontSize: 15, lineHeight: 24, marginTop: 18 },
  location: { flexDirection: "row", alignItems: "center", gap: 13, marginTop: 25, padding: 16, borderRadius: 20 }, locationText: { flex: 1 }, locationLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 1.4 }, locationValue: { fontSize: 15, fontWeight: "500", marginTop: 3 }, source: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10, paddingHorizontal: 4 }, sourceText: { fontSize: 13 },
  actions: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 13 }, confirmButton: { flex: 1, height: 55, borderRadius: 18, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#151515" }, confirmText: { color: "#FFF", fontSize: 14, fontWeight: "600" }, inaccurateButton: { flex: 1, height: 55, borderRadius: 18, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" }, inaccurateText: { fontSize: 14, fontWeight: "600" }, missing: { flex: 1, alignItems: "center", justifyContent: "center" }, missingText: { fontSize: 16 }, backTextButton: { marginTop: 14, padding: 12 },
});
