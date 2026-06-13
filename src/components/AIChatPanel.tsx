import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeOut, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { ScalePressable } from "@/components/ScalePressable";
import { useAppTheme } from "@/store/useThemeStore";
import { askCityAssistant } from "@/services/city";
import type { ChatMessage } from "@/types/domain";

const suggestions = [
  { icon: "shield-checkmark-outline" as const, label: "Is Blloku safe right now?" },
  { icon: "car-sport-outline" as const, label: "Which roads should I avoid?" },
  { icon: "megaphone-outline" as const, label: "Any protests near the center?" },
];

export function AIChatPanel({ open, onClose, initialQuery }: { open: boolean; onClose: () => void; initialQuery?: string }) {
  const theme = useAppTheme();
  const listRef = useRef<FlatList<ChatMessage> | null>(null);
  const inputRef = useRef<TextInput | null>(null);
  const sentInitial = useRef<string | null>(null);
  const pulse = useSharedValue(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    pulse.value = withRepeat(withTiming(1, { duration: 2200 }), -1, true);
    const timer = setTimeout(() => inputRef.current?.focus(), 280);
    return () => clearTimeout(timer);
  }, [open, pulse]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.45, 0.95]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.995, 1.012]) }],
  }));

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
  const sendRef = useRef(send);
  sendRef.current = send;

  useEffect(() => {
    if (!open || !initialQuery || sentInitial.current === initialQuery) return;
    sentInitial.current = initialQuery;
    void sendRef.current(initialQuery);
  }, [initialQuery, open]);

  useEffect(() => {
    if (messages.length) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages]);

  if (!open) return null;

  return (
    <KeyboardAvoidingView pointerEvents="box-none" style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={10}>
      <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} style={styles.backdrop}>
        <ScalePressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View entering={FadeIn.springify().damping(19).stiffness(240)} exiting={FadeOut.duration(130)} style={styles.panelPosition}>
        <Animated.View pointerEvents="none" style={[styles.glow, glowStyle]}>
          <LinearGradient colors={["#4B8CFF", "#A45CFF", "#FF7A77", "#67D6B2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <View style={[styles.panel, { backgroundColor: theme.glassStrong, borderColor: theme.border }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.identity}>
              <LinearGradient colors={["#7659D5", "#4C79E7"]} style={styles.avatar}><Ionicons name="sparkles" size={15} color="#FFF" /></LinearGradient>
              <View><Text style={[styles.name, { color: theme.ink }]}>Tirana AI</Text><View style={styles.statusRow}><View style={styles.statusDot} /><Text style={[styles.status, { color: theme.inkMuted }]}>Live city intelligence</Text></View></View>
            </View>
            <ScalePressable onPress={onClose} style={[styles.close, { backgroundColor: theme.cardMuted }]}><Ionicons name="close" size={18} color={theme.ink} /></ScalePressable>
          </View>

          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={styles.messages}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => item.role === "user" ? (
              <LinearGradient colors={["#7659D5", "#4C79E7"]} style={styles.userBubble}><Text style={styles.userText}>{item.content}</Text></LinearGradient>
            ) : (
              <View style={styles.assistantRow}><View style={[styles.assistantMark, { backgroundColor: theme.accentSoft }]}><Ionicons name="sparkles" size={12} color={theme.accent} /></View><Text style={[styles.assistantText, { color: theme.ink }]}>{item.content}</Text></View>
            )}
            ListEmptyComponent={
              <View>
                <Text style={[styles.prompt, { color: theme.inkMuted }]}>Ask anything about Tirana right now.</Text>
                <View style={styles.suggestions}>{suggestions.map((item) => <ScalePressable key={item.label} onPress={() => send(item.label)} style={[styles.suggestion, { backgroundColor: theme.cardMuted }]}><Ionicons name={item.icon} size={17} color={theme.accent} /><Text style={[styles.suggestionText, { color: theme.ink }]}>{item.label}</Text><Ionicons name="arrow-up-outline" size={14} color={theme.inkSoft} /></ScalePressable>)}</View>
              </View>
            }
            ListFooterComponent={loading ? <View style={styles.thinking}><ActivityIndicator size="small" color={theme.accent} /><Text style={[styles.thinkingText, { color: theme.inkMuted }]}>Reading the live map...</Text></View> : null}
          />

          <View style={[styles.composerArea, { borderTopColor: theme.border }]}>
            <View style={[styles.composer, { backgroundColor: theme.bgSoft, borderColor: theme.border }]}>
              <TextInput ref={inputRef} value={input} onChangeText={setInput} onSubmitEditing={() => send(input)} placeholder="Ask about Tirana..." placeholderTextColor={theme.inkSoft} style={[styles.input, { color: theme.ink }]} editable={!loading} />
              <ScalePressable disabled={!input.trim() || loading} onPress={() => send(input)} style={[styles.send, { backgroundColor: input.trim() ? theme.accent : theme.inkSoft }]}>{loading ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="arrow-up" size={18} color="#FFF" />}</ScalePressable>
            </View>
            <View style={styles.mapHint}><Ionicons name="location-outline" size={11} color={theme.inkSoft} /><Text style={[styles.mapHintText, { color: theme.inkSoft }]}>Reads live map data</Text></View>
          </View>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 80, justifyContent: "flex-start" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(6,8,12,0.26)" },
  panelPosition: { marginHorizontal: 14, marginTop: 82, maxHeight: "72%" },
  glow: { ...StyleSheet.absoluteFillObject, borderRadius: 27, overflow: "hidden" },
  panel: { margin: 2, borderRadius: 25, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, shadowColor: "#000", shadowOpacity: 0.24, shadowRadius: 26, shadowOffset: { width: 0, height: 16 }, elevation: 18 },
  header: { height: 58, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth },
  identity: { flexDirection: "row", alignItems: "center", gap: 9 }, avatar: { width: 31, height: 31, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 13, fontWeight: "600" }, statusRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 }, statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4BD17C" }, status: { fontSize: 9.5 },
  close: { width: 31, height: 31, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  list: { maxHeight: 360 }, messages: { minHeight: 154, paddingHorizontal: 13, paddingVertical: 13 }, prompt: { fontSize: 12, marginBottom: 11 }, suggestions: { gap: 7 },
  suggestion: { minHeight: 43, borderRadius: 15, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 9 }, suggestionText: { flex: 1, fontSize: 12, fontWeight: "500" },
  userBubble: { alignSelf: "flex-end", maxWidth: "85%", borderRadius: 18, borderBottomRightRadius: 5, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 13 }, userText: { color: "#FFF", fontSize: 13, lineHeight: 18 },
  assistantRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 15 }, assistantMark: { width: 25, height: 25, borderRadius: 10, alignItems: "center", justifyContent: "center" }, assistantText: { flex: 1, fontSize: 13, lineHeight: 20, paddingTop: 2 },
  thinking: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 4 }, thinkingText: { fontSize: 11 },
  composerArea: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, paddingTop: 9, paddingBottom: 8 }, composer: { minHeight: 46, borderRadius: 17, paddingLeft: 13, paddingRight: 5, flexDirection: "row", alignItems: "center", borderWidth: StyleSheet.hairlineWidth }, input: { flex: 1, fontSize: 13, paddingVertical: 10 }, send: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" }, mapHint: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, paddingLeft: 3 }, mapHintText: { fontSize: 9 },
});
