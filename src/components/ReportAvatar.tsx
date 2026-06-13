import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, View } from "react-native";

import { REPORT_TYPES, SEVERITY_META } from "@/constants/city";
import type { Report } from "@/types/domain";

export function ReportAvatar({ report, size = 48, count }: { report: Report; size?: number; count?: number }) {
  const type = REPORT_TYPES[report.type];
  const severity = SEVERITY_META[report.severity];
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      {report.imageUrl ? (
        <Image source={{ uri: report.imageUrl }} style={[styles.image, { borderRadius: size / 2 }]} />
      ) : (
        <View style={[styles.fallback, { backgroundColor: "#171717", borderRadius: size / 2 }]}>
          <Ionicons name={type.icon} size={size * 0.42} color="#FFF" />
        </View>
      )}
      {count && count > 1 ? <View style={[styles.badge, { backgroundColor: severity.color }]}><Text style={styles.badgeText}>{count}</Text></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: "#FFF", padding: 3, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 7, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  fallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", right: -4, top: -4, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#FFF" },
  badgeText: { color: "#FFF", fontSize: 10, fontWeight: "800" },
});
