import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { ScalePressable } from "@/components/ScalePressable";
import { askCityAssistant } from "@/services/city";
import { useAppTheme } from "@/store/useThemeStore";
import type { ChatMessage } from "@/types/domain";

const suggestions = ["What should I avoid right now?", "Any serious traffic near the center?", "Show me critical incidents", "Is it safe around Blloku?"];

export default function AssistantScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { prompt } = useLocalSearchParams<{ prompt?: string }>();
  const listRef = useRef<FlatList<ChatMessage> | null>(null);
  const handledPrompt = useRef<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async (value: string) => {
    const text = value.trim();
    if (!text || loading) return;
    const userMessage: ChatMessage = { id: `${Date.now()}-user`, role: "user", content: text };
    const next = [...messages, userMessage];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const answer = await askCityAssistant(next);
      setMessages((current) => [...current, { id: `${Date.now()}-assistant`, role: "assistant", content: answer }]);
    } catch (error) {
      setMessages((current) => [...current, { id: `${Date.now()}-error`, role: "assistant", content: error instanceof Error ? error.message : "The city assistant is unavailable." }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!prompt || handledPrompt.current === prompt) return;
    handledPrompt.current = prompt;
    void send(prompt);
  });

  useEffect(() => {
    if (messages.length) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages]);

  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: theme.bg }]} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={[styles.aiAvatar, { backgroundColor: theme.accent }]}><Ionicons name="sparkles" size={21} color="#FFF" /></View>
          <View style={styles.headerText}><Text style={[styles.title, { color: theme.ink }]}>Ask Tirana</Text><View style={styles.statusRow}><View style={styles.statusDot} /><Text style={[styles.status, { color: theme.inkMuted }]}>Reads the live city map</Text></View></View>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => item.role === "user" ? (
            <View style={[styles.userBubble, { backgroundColor: theme.accent }]}><Text style={styles.userText}>{item.content}</Text></View>
          ) : (
            <View style={styles.assistantMessage}><View style={[styles.smallAvatar, { backgroundColor: theme.accent }]}><Ionicons name="sparkles" size={13} color="#FFF" /></View><Text style={[styles.assistantText, { color: theme.ink }]}>{item.content}</Text></View>
          )}
          ListHeaderComponent={messages.length === 0 ? (
            <View style={styles.intro}>
              <Text style={[styles.eyebrow, { color: theme.inkSoft }]}>CITY INTELLIGENCE</Text>
              <Text style={[styles.introTitle, { color: theme.ink }]}>Ask what is happening in Tirana right now.</Text>
              <Text style={[styles.introCopy, { color: theme.inkMuted }]}>Answers use active reports and verified incidents from the same map you see in the app.</Text>
              <View style={styles.suggestions}>{suggestions.map((item) => <ScalePressable key={item} onPress={() => send(item)} style={[styles.suggestion, { backgroundColor: theme.cardMuted }]}><Text style={[styles.suggestionText, { color: theme.ink }]}>{item}</Text><Ionicons name="arrow-up-outline" size={15} color={theme.inkMuted} /></ScalePressable>)}</View>
            </View>
          ) : null}
          ListFooterComponent={loading ? <View style={styles.thinking}><ActivityIndicator color={theme.accent} /><Text style={[styles.thinkingText, { color: theme.inkMuted }]}>Reading live reports...</Text></View> : null}
        />

        <View style={[styles.composerWrap, { paddingBottom: insets.bottom + 78, backgroundColor: theme.bg }]}>
          <View style={[styles.composer, { backgroundColor: theme.card, shadowColor: theme.shadow }]}><TextInput value={input} onChangeText={setInput} onSubmitEditing={() => send(input)} placeholder="Ask about Tirana..." placeholderTextColor={theme.inkSoft} style={[styles.input, { color: theme.ink }]} multiline /><ScalePressable disabled={!input.trim() || loading} onPress={() => send(input)} style={[styles.send, { backgroundColor: theme.accent }, (!input.trim() || loading) && styles.sendDisabled]}><Ionicons name="arrow-up" size={20} color="#FFF" /></ScalePressable></View>
          <Text style={[styles.disclaimer, { color: theme.inkSoft }]}>AI answers can be incomplete. Verify critical information.</Text>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  aiAvatar: { width: 45, height: 45, borderRadius: 17, alignItems: "center", justifyContent: "center" }, headerText: { flex: 1 },
  title: { fontSize: 20, fontWeight: "600", letterSpacing: -0.4 }, statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }, statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#43B971" }, status: { fontSize: 11 },
  messages: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 22 },
  intro: { flex: 1, paddingTop: 42 }, eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.8 }, introTitle: { maxWidth: 340, fontSize: 35, lineHeight: 39, fontWeight: "700", letterSpacing: -1.1, marginTop: 10 }, introCopy: { fontSize: 14, lineHeight: 21, marginTop: 12 },
  suggestions: { gap: 8, marginTop: 30 }, suggestion: { minHeight: 52, borderRadius: 18, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, suggestionText: { flex: 1, fontSize: 13, fontWeight: "500" },
  userBubble: { alignSelf: "flex-end", maxWidth: "84%", borderRadius: 22, borderBottomRightRadius: 6, paddingHorizontal: 15, paddingVertical: 11, marginBottom: 16 }, userText: { color: "#FFF", fontSize: 14, lineHeight: 20 },
  assistantMessage: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 20 }, smallAvatar: { width: 28, height: 28, borderRadius: 10, alignItems: "center", justifyContent: "center" }, assistantText: { flex: 1, fontSize: 14, lineHeight: 22, paddingTop: 3 },
  thinking: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 10 }, thinkingText: { fontSize: 12 },
  composerWrap: { paddingHorizontal: 14, paddingTop: 9 }, composer: { minHeight: 56, maxHeight: 120, borderRadius: 23, paddingLeft: 16, paddingRight: 7, paddingVertical: 7, flexDirection: "row", alignItems: "flex-end", gap: 8, shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6 }, input: { flex: 1, minHeight: 42, maxHeight: 100, fontSize: 14, paddingTop: 11, paddingBottom: 9 }, send: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" }, sendDisabled: { opacity: 0.38 }, disclaimer: { textAlign: "center", fontSize: 9, marginTop: 6 },
});
