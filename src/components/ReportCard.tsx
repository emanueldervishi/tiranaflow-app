import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, View } from "react-native";

import { ScalePressable } from "@/components/ScalePressable";
import { REPORT_TYPES, SEVERITY_META, timeAgo } from "@/constants/city";
import type { Report } from "@/types/domain";
import { useAppTheme } from "@/store/useThemeStore";

export function ReportCard({ report, onPress, compact = false }: { report: Report; onPress: () => void; compact?: boolean }) {
  const theme = useAppTheme();
  const type = REPORT_TYPES[report.type];
  const severity = SEVERITY_META[report.severity];
  return (
    <ScalePressable onPress={onPress} style={[styles.card, { backgroundColor: theme.card }]} scaleTo={0.985}>
      <View style={[styles.severityRail, { backgroundColor: severity.color }]} />
      <View style={[styles.imageWrap, compact && styles.imageWrapCompact, { backgroundColor: type.tint }]}>
        {report.imageUrl ? <Image source={{ uri: report.imageUrl }} style={styles.image} /> : <Ionicons name={type.icon} size={28} color={type.color} />}
      </View>
      <View style={styles.body}>
        <View style={styles.metaRow}>
          <View style={[styles.severity, { backgroundColor: severity.tint }]}><Text style={[styles.severityText, { color: severity.color }]}>{severity.label}</Text></View>
          {report.status === "confirmed" ? <Text style={styles.confirmed}>Confirmed</Text> : null}
          <Text style={styles.time}>{timeAgo(report.createdAt)}</Text>
        </View>
        <Text numberOfLines={2} style={[styles.title, { color: theme.ink }]}>{report.title}</Text>
        {!compact && report.description ? <Text numberOfLines={2} style={[styles.description, { color: theme.inkMuted }]}>{report.description}</Text> : null}
        <View style={styles.locationRow}><Ionicons name="location-outline" size={13} color={theme.inkMuted} /><Text numberOfLines={1} style={[styles.location, { color: theme.inkMuted }]}>{report.address || "Tirana"}</Text></View>
      </View>
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 112, flexDirection: "row", gap: 12, padding: 12, paddingLeft: 16, borderRadius: 22, backgroundColor: "#FFF", overflow: "hidden" },
  severityRail: { position: "absolute", left: 0, top: 14, bottom: 14, width: 3, borderRadius: 2 },
  imageWrap: { width: 82, height: 88, borderRadius: 17, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  imageWrapCompact: { width: 72, height: 72 },
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  body: { flex: 1, minWidth: 0 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  severity: { borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  severityText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.7, textTransform: "uppercase" },
  confirmed: { color: "#278252", fontSize: 10, fontWeight: "700" },
  time: { marginLeft: "auto", color: "#8B8B8B", fontSize: 10 },
  title: { color: "#151515", fontSize: 15, lineHeight: 19, fontWeight: "600", marginTop: 7, letterSpacing: -0.2 },
  description: { color: "#737373", fontSize: 12, lineHeight: 16, marginTop: 4 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 7 },
  location: { flex: 1, color: "#777", fontSize: 11 },
});
