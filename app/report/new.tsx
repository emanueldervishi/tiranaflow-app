import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScalePressable } from "@/components/ScalePressable";
import { REPORT_TYPES, SEVERITY_META, TIRANA_CENTER } from "@/constants/city";
import { createReport } from "@/services/city";
import { useCityStore } from "@/store/useCityStore";
import { useSessionStore } from "@/store/useSessionStore";
import { useAppTheme } from "@/store/useThemeStore";
import type { ReportType, Severity } from "@/types/domain";

export default function NewReportScreen() {
  const theme = useAppTheme();
  const userId = useSessionStore((state) => state.userId);
  const hydrate = useCityStore((state) => state.hydrate);
  const [photo, setPhoto] = useState<string | null>(null);
  const [step, setStep] = useState<"photo" | "details">("photo");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ReportType>("traffic_accident");
  const [severity, setSeverity] = useState<Severity>("serious");
  const [location, setLocation] = useState({ ...TIRANA_CENTER, address: "Tirana" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") return;
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const places = await Location.reverseGeocodeAsync({ latitude: current.coords.latitude, longitude: current.coords.longitude });
      const place = places[0];
      setLocation({ latitude: current.coords.latitude, longitude: current.coords.longitude, address: [place?.street, place?.district, place?.city].filter(Boolean).join(", ") || "Tirana" });
    })();
  }, []);

  const choosePhoto = async (camera: boolean) => {
    const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert("Permission required", camera ? "Allow camera access to photograph the incident." : "Allow photo access to choose an image.");
    const result = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.82 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.82 });
    if (!result.canceled && result.assets[0]?.uri) {
      setPhoto(result.assets[0].uri);
      setStep("details");
    }
  };

  const submit = async () => {
    if (!userId || title.trim().length < 2) return Alert.alert("Add a title", "Describe what is happening in a few words.");
    setSubmitting(true);
    try {
      const report = await createReport(userId, { title, description, type, severity, imageUri: photo, latitude: location.latitude, longitude: location.longitude, address: location.address });
      await hydrate(userId);
      router.replace(`/reports/${report.id}` as never);
    } catch (error) {
      Alert.alert("Could not publish", error instanceof Error ? error.message : "Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: theme.bg }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <ScalePressable onPress={() => step === "details" ? setStep("photo") : router.back()} style={[styles.back, { backgroundColor: theme.cardMuted }]}><Ionicons name="chevron-back" size={22} color={theme.ink} /></ScalePressable>
          <View><Text style={[styles.headerTitle, { color: theme.ink }]}>New report</Text><Text style={[styles.headerStep, { color: theme.inkMuted }]}>{step === "photo" ? "Step 1 · Photo" : "Step 2 · Details"}</Text></View>
        </View>

        {step === "photo" ? (
          <View style={styles.photoStage}>
            <View><Text style={[styles.eyebrow, { color: theme.inkSoft }]}>REPORT WHAT YOU SEE</Text><Text style={[styles.photoTitle, { color: theme.ink }]}>Show Tirana what is happening.</Text><Text style={[styles.photoCopy, { color: theme.inkMuted }]}>A clear photo helps nearby people understand the situation quickly.</Text></View>
            <View style={styles.photoActions}>
              <ScalePressable onPress={() => choosePhoto(true)} style={styles.cameraButton}><Ionicons name="camera-outline" size={38} color="#FFF" /><Text style={styles.cameraTitle}>Take a photo</Text><Text style={styles.cameraCopy}>Open the camera</Text></ScalePressable>
              <ScalePressable onPress={() => choosePhoto(false)} style={[styles.libraryButton, { backgroundColor: theme.cardMuted }]}><Ionicons name="images-outline" size={21} color={theme.ink} /><Text style={[styles.libraryText, { color: theme.ink }]}>Choose from library</Text></ScalePressable>
              <ScalePressable onPress={() => setStep("details")} style={styles.skip}><Text style={[styles.skipText, { color: theme.inkMuted }]}>Continue without photo</Text></ScalePressable>
            </View>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            {photo ? <Image source={{ uri: photo }} style={styles.preview} /> : null}
            <FormSection label="Title" labelColor={theme.inkMuted}>
              <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Accident on Rruga e Kavajes" placeholderTextColor={theme.inkSoft} style={[styles.input, { backgroundColor: theme.cardMuted, color: theme.ink }]} />
            </FormSection>
            <FormSection label="Type" labelColor={theme.inkMuted}>
              <View style={styles.typeGrid}>{(Object.keys(REPORT_TYPES) as ReportType[]).map((value) => { const meta = REPORT_TYPES[value]; const active = type === value; return <ScalePressable key={value} onPress={() => setType(value)} style={[styles.typeCard, { backgroundColor: theme.cardMuted }, active && { backgroundColor: theme.dark ? theme.accentSoft : meta.tint }]}><Ionicons name={meta.icon} size={22} color={active ? meta.color : theme.inkMuted} /><Text numberOfLines={2} style={[styles.typeLabel, { color: active && theme.dark ? theme.ink : active ? meta.color : theme.inkMuted }]}>{meta.label}</Text></ScalePressable>; })}</View>
            </FormSection>
            <FormSection label="Severity" labelColor={theme.inkMuted}>
              <View style={styles.severityRow}>{(Object.keys(SEVERITY_META) as Severity[]).map((value) => { const meta = SEVERITY_META[value]; const active = severity === value; return <ScalePressable key={value} onPress={() => setSeverity(value)} style={[styles.severityButton, { backgroundColor: active ? meta.color : theme.cardMuted }]}><Text style={[styles.severityButtonText, { color: active ? "#FFF" : theme.inkMuted }]}>{meta.label}</Text></ScalePressable>; })}</View>
            </FormSection>
            <FormSection label="Details" labelColor={theme.inkMuted}>
              <TextInput value={description} onChangeText={setDescription} placeholder="What should people nearby know?" placeholderTextColor={theme.inkSoft} multiline style={[styles.input, styles.textarea, { backgroundColor: theme.cardMuted, color: theme.ink }]} />
            </FormSection>
            <View style={[styles.location, { backgroundColor: theme.cardMuted }]}><Ionicons name="location" size={19} color={theme.ink} /><View style={styles.locationCopy}><Text style={[styles.locationLabel, { color: theme.inkSoft }]}>CURRENT LOCATION</Text><Text numberOfLines={2} style={[styles.locationValue, { color: theme.ink }]}>{location.address}</Text></View></View>
            <ScalePressable disabled={submitting} onPress={submit} style={styles.publish}><Text style={styles.publishText}>{submitting ? "Publishing..." : "Publish report"}</Text><Ionicons name="arrow-forward" size={19} color="#FFF" /></ScalePressable>
          </ScrollView>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function FormSection({ label, labelColor, children }: { label: string; labelColor: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={[styles.label, { color: labelColor }]}>{label}</Text>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 14 }, back: { width: 43, height: 43, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "600" }, headerStep: { fontSize: 11, marginTop: 2 },
  photoStage: { flex: 1, justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 36, paddingBottom: 28 }, eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.8 }, photoTitle: { maxWidth: 330, fontSize: 39, lineHeight: 43, fontWeight: "700", letterSpacing: -1.3, marginTop: 10 }, photoCopy: { maxWidth: 320, fontSize: 15, lineHeight: 22, marginTop: 13 },
  photoActions: { gap: 10 }, cameraButton: { height: 190, borderRadius: 30, alignItems: "center", justifyContent: "center", backgroundColor: "#161616" }, cameraTitle: { color: "#FFF", fontSize: 20, fontWeight: "600", marginTop: 13 }, cameraCopy: { color: "rgba(255,255,255,0.58)", fontSize: 12, marginTop: 4 }, libraryButton: { height: 58, borderRadius: 19, flexDirection: "row", gap: 10, alignItems: "center", justifyContent: "center" }, libraryText: { fontSize: 14, fontWeight: "600" }, skip: { paddingVertical: 11, alignItems: "center" }, skipText: { fontSize: 12 },
  form: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 52 }, preview: { width: "100%", height: 210, borderRadius: 25, resizeMode: "cover", marginBottom: 24 }, section: { marginBottom: 25 }, label: { fontSize: 11, fontWeight: "700", letterSpacing: 1.1, textTransform: "uppercase", marginBottom: 10 },
  input: { minHeight: 56, borderRadius: 17, paddingHorizontal: 16, fontSize: 15 }, textarea: { minHeight: 116, paddingTop: 15, textAlignVertical: "top" },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", columnGap: 8, rowGap: 10 }, typeCard: { width: "31.5%", minHeight: 88, borderRadius: 18, paddingHorizontal: 7, alignItems: "center", justifyContent: "center" }, typeLabel: { fontSize: 10, lineHeight: 13, textAlign: "center", fontWeight: "600", marginTop: 7 },
  severityRow: { flexDirection: "row", gap: 8 }, severityButton: { flex: 1, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" }, severityButtonText: { fontSize: 13, fontWeight: "700" },
  location: { flexDirection: "row", gap: 12, alignItems: "center", padding: 15, borderRadius: 18, marginBottom: 18 }, locationCopy: { flex: 1 }, locationLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 1.2 }, locationValue: { fontSize: 13, lineHeight: 18, marginTop: 3 },
  publish: { height: 58, borderRadius: 19, flexDirection: "row", gap: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#151515" }, publishText: { color: "#FFF", fontSize: 15, fontWeight: "600" },
});
