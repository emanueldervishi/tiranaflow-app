import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ReportAvatar } from "@/components/ReportAvatar";
import { ScalePressable } from "@/components/ScalePressable";
import { REPORT_TYPES, timeAgo } from "@/constants/city";
import { deleteReport } from "@/services/city";
import { useCityStore } from "@/store/useCityStore";
import { useSessionStore } from "@/store/useSessionStore";
import { type ThemePreference, useAppTheme, useThemeStore } from "@/store/useThemeStore";

export default function ProfileScreen() {
  const theme = useAppTheme();
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);
  const profile = useCityStore((state) => state.profile);
  const reports = useCityStore((state) => state.reports);
  const hydrate = useCityStore((state) => state.hydrate);
  const { userId, email, signOut } = useSessionStore();
  const mine = reports.filter((report) => report.createdBy === userId);
  const confirmed = mine.filter((report) => report.confirmations > 0).length;
  const name = profile?.name || email?.split("@")[0] || "Citizen";
  const remove = (id: string) => Alert.alert("Delete report?", "This cannot be undone.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: async () => { if (!userId) return; await deleteReport(userId, id); await hydrate(userId); } }]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]} edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.heading}><Text style={[styles.title, { color: theme.ink }]}>Profile</Text><Text style={[styles.subtitle, { color: theme.inkMuted }]}>Your reports and city contribution</Text></View>
        <View style={[styles.identity, { backgroundColor: theme.card }]}>
          <View style={styles.identityRow}><View style={styles.avatarWrap}>{profile?.avatarUrl ? <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} /> : <Text style={styles.initials}>{name.slice(0, 2).toUpperCase()}</Text>}</View><View style={styles.nameWrap}><Text numberOfLines={1} style={[styles.name, { color: theme.ink }]}>{name}</Text><Text numberOfLines={1} style={[styles.email, { color: theme.inkMuted }]}>{email}</Text><View style={[styles.citizen, { backgroundColor: theme.accentSoft }]}><Ionicons name="shield-checkmark-outline" size={13} color={theme.accent} /><Text style={[styles.citizenText, { color: theme.accent }]}>Citizen reporter</Text></View></View></View>
          <View style={styles.stats}><Stat value={mine.length} label="Reports" /><Stat value={profile?.trustedReporterScore ?? 0} label="Trust score" /><Stat value={confirmed} label="Confirmed" /></View>
        </View>

        <SectionTitle text="My reports" />
        <View style={[styles.listCard, { backgroundColor: theme.card }]}>{mine.length === 0 ? <Text style={[styles.empty, { color: theme.inkMuted }]}>You have not submitted any reports yet.</Text> : mine.map((report, index) => { const meta = REPORT_TYPES[report.type]; return <View key={report.id}><View style={styles.reportRow}><ScalePressable onPress={() => router.push(`/reports/${report.id}` as never)} style={styles.reportOpen}><ReportAvatar report={report} size={43} /><View style={styles.reportText}><Text numberOfLines={1} style={[styles.reportTitle, { color: theme.ink }]}>{report.title}</Text><Text style={[styles.reportMeta, { color: theme.inkMuted }]}>{meta.label} · {timeAgo(report.createdAt)}</Text></View></ScalePressable><ScalePressable onPress={() => remove(report.id)} style={styles.delete}><Ionicons name="trash-outline" size={18} color={theme.danger} /></ScalePressable></View>{index < mine.length - 1 ? <View style={[styles.divider, { backgroundColor: theme.border }]} /> : null}</View>; })}</View>

        <SectionTitle text="Appearance" />
        <View style={[styles.appearance, { backgroundColor: theme.card }]}><Text style={[styles.appearanceCopy, { color: theme.inkMuted }]}>Choose how TiranaFlow looks on this device.</Text><View style={[styles.segment, { backgroundColor: theme.cardMuted }]}>{(["light", "dark", "system"] as ThemePreference[]).map((value) => { const active = preference === value; const icon = value === "light" ? "sunny-outline" : value === "dark" ? "moon-outline" : "phone-portrait-outline"; return <ScalePressable key={value} onPress={() => void setPreference(value)} style={[styles.segmentButton, active && { backgroundColor: theme.ink }]}><Ionicons name={icon} size={15} color={active ? theme.bg : theme.inkMuted} /><Text style={[styles.segmentText, { color: active ? theme.bg : theme.inkMuted }]}>{value}</Text></ScalePressable>; })}</View></View>

        <SectionTitle text="Preferences" />
        <View style={[styles.listCard, { backgroundColor: theme.card }]}><Row icon="notifications-outline" label="Notifications" /><View style={[styles.divider, { backgroundColor: theme.border }]} /><Row icon="language-outline" label="Language" value="English" /></View>
        <ScalePressable onPress={signOut} style={[styles.signOut, { backgroundColor: theme.dark ? "#321F20" : "#F8EDEC" }]}><Ionicons name="log-out-outline" size={18} color={theme.danger} /><Text style={[styles.signOutText, { color: theme.danger }]}>Sign out</Text></ScalePressable>
        <Text style={[styles.footer, { color: theme.inkSoft }]}>TiranaFlow · keep Tirana informed</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: number; label: string }) { const theme = useAppTheme(); return <View style={[styles.stat, { backgroundColor: theme.cardMuted }]}><Text style={[styles.statValue, { color: theme.ink }]}>{value}</Text><Text style={[styles.statLabel, { color: theme.inkMuted }]}>{label}</Text></View>; }
function SectionTitle({ text }: { text: string }) { const theme = useAppTheme(); return <Text style={[styles.sectionTitle, { color: theme.inkMuted }]}>{text}</Text>; }
function Row({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; value?: string }) { const theme = useAppTheme(); return <ScalePressable style={styles.row}><View style={[styles.rowIcon, { backgroundColor: theme.cardMuted }]}><Ionicons name={icon} size={18} color={theme.inkMuted} /></View><Text style={[styles.rowLabel, { color: theme.ink }]}>{label}</Text>{value ? <Text style={[styles.rowValue, { color: theme.inkMuted }]}>{value}</Text> : null}<Ionicons name="chevron-forward" size={17} color={theme.inkSoft} /></ScalePressable>; }

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingHorizontal: 16, paddingTop: 22, paddingBottom: 115 }, heading: { marginBottom: 17 }, title: { fontSize: 30, fontWeight: "700", letterSpacing: -0.9 }, subtitle: { fontSize: 13, marginTop: 3 },
  identity: { borderRadius: 25, padding: 18 }, identityRow: { flexDirection: "row", alignItems: "center", gap: 14 }, avatarWrap: { width: 66, height: 66, borderRadius: 33, alignItems: "center", justifyContent: "center", padding: 2, backgroundColor: "#151515" }, avatar: { width: "100%", height: "100%", borderRadius: 31 }, initials: { color: "#FFF", fontSize: 19, fontWeight: "700" }, nameWrap: { flex: 1 }, name: { fontSize: 21, fontWeight: "600", letterSpacing: -0.4 }, email: { fontSize: 12, marginTop: 3 }, citizen: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }, citizenText: { fontSize: 9, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  stats: { flexDirection: "row", gap: 8, marginTop: 18 }, stat: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 17 }, statValue: { fontSize: 20, fontWeight: "700" }, statLabel: { fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, marginTop: 3 },
  sectionTitle: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase", marginTop: 25, marginBottom: 8, marginLeft: 4 }, listCard: { borderRadius: 22, paddingHorizontal: 14, overflow: "hidden" }, empty: { fontSize: 13, textAlign: "center", paddingVertical: 24 }, reportRow: { minHeight: 67, flexDirection: "row", alignItems: "center" }, reportOpen: { flex: 1, flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 10 }, reportText: { flex: 1 }, reportTitle: { fontSize: 13, fontWeight: "600" }, reportMeta: { fontSize: 10, marginTop: 4 }, delete: { width: 40, height: 40, alignItems: "center", justifyContent: "center" }, divider: { height: StyleSheet.hairlineWidth, marginLeft: 52 },
  appearance: { borderRadius: 22, padding: 14 }, appearanceCopy: { fontSize: 12, marginBottom: 12 }, segment: { height: 45, borderRadius: 15, padding: 4, flexDirection: "row", gap: 4 }, segmentButton: { flex: 1, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 }, segmentText: { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  row: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 11 }, rowIcon: { width: 32, height: 32, borderRadius: 12, alignItems: "center", justifyContent: "center" }, rowLabel: { flex: 1, fontSize: 14, fontWeight: "500" }, rowValue: { fontSize: 12 }, signOut: { height: 55, borderRadius: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 26 }, signOutText: { fontSize: 14, fontWeight: "600" }, footer: { textAlign: "center", fontSize: 10, marginTop: 22 },
});
