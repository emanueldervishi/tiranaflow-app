import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScalePressable } from "@/components/ScalePressable";
import { supabase } from "@/lib/supabase";
import { useSessionStore } from "@/store/useSessionStore";

export default function SignInScreen() {
  const { loginWithGoogle, isLoading, error } = useSessionStore();
  return (
    <View style={styles.screen}>
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.brandRow}>
          <View style={styles.logo}><Ionicons name="navigate" size={23} color="#111" /></View>
          <View><Text style={styles.brand}>TiranaFlow</Text><Text style={styles.tagline}>Real-time warnings for Tirana.</Text></View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.eyebrow}>LIVE CITY INTELLIGENCE</Text>
          <Text style={styles.title}>Know what is happening around you.</Text>
          <Text style={styles.copy}>Live reports, verified incidents, city maps, and an AI assistant grounded in Tirana right now.</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {!supabase ? <Text style={styles.error}>Supabase configuration is missing.</Text> : null}
          <ScalePressable disabled={isLoading || !supabase} onPress={() => loginWithGoogle()} style={styles.googleButton}>
            {isLoading ? <ActivityIndicator color="#111" /> : <><Ionicons name="logo-google" size={19} color="#111" /><Text style={styles.googleText}>Continue with Google</Text></>}
          </ScalePressable>
          <Text style={styles.legal}>By continuing, you agree to keep Tirana informed responsibly.</Text>
        </View>

        <Text style={styles.footer}>TiranaFlow · Tirane</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#090A0C", overflow: "hidden" },
  safe: { flex: 1, justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 24 },
  glowOne: { position: "absolute", width: 380, height: 380, borderRadius: 190, backgroundColor: "rgba(113,81,194,0.22)", top: -170, left: -150 },
  glowTwo: { position: "absolute", width: 340, height: 340, borderRadius: 170, backgroundColor: "rgba(39,111,154,0.17)", bottom: -140, right: -160 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  logo: { width: 46, height: 46, borderRadius: 16, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center" },
  brand: { color: "#FFF", fontSize: 23, fontWeight: "700", letterSpacing: -0.6 },
  tagline: { color: "rgba(255,255,255,0.58)", fontSize: 12, marginTop: 2 },
  panel: { borderRadius: 30, padding: 23, backgroundColor: "rgba(255,255,255,0.10)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  eyebrow: { color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: "700", letterSpacing: 2 },
  title: { color: "#FFF", fontSize: 34, lineHeight: 38, fontWeight: "700", letterSpacing: -1.2, marginTop: 10 },
  copy: { color: "rgba(255,255,255,0.66)", fontSize: 15, lineHeight: 22, marginTop: 12, marginBottom: 22 },
  googleButton: { height: 56, borderRadius: 17, flexDirection: "row", gap: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF" },
  googleText: { color: "#111", fontSize: 15, fontWeight: "600" },
  legal: { color: "rgba(255,255,255,0.38)", textAlign: "center", fontSize: 11, lineHeight: 16, marginTop: 16 },
  error: { color: "#FF9B92", fontSize: 13, marginBottom: 12 },
  footer: { color: "rgba(255,255,255,0.32)", textAlign: "center", fontSize: 12 },
});
