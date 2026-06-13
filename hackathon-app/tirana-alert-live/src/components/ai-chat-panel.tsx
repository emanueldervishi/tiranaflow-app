import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, MapPin, Send, Sparkles as SparklesIcon, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { AssistantSuggestions, type Suggestion } from "@/components/assistant/shared";

type Msg = { role: "user" | "assistant"; content: string };

interface AIChatPanelProps {
  open: boolean;
  onClose: () => void;
  initialQuery?: string;
}

const SUGGESTIONS: Suggestion[] = [
  { icon: "🛡️", label: "Is Blloku safe right now?" },
  { icon: "🚧", label: "Which roads should I avoid?" },
  { icon: "📢", label: "Any protests near the center?" },
];

export function AIChatPanel({ open, onClose, initialQuery }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sentInitialRef = useRef(false);

  useEffect(() => {
    if (open && initialQuery && !sentInitialRef.current) {
      sentInitialRef.current = true;
      void send(initialQuery);
    }
    if (!open) sentInitialRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialQuery]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 250);
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || streaming) return;
    const next: Msg[] = [
      ...messages,
      { role: "user", content: t },
      { role: "assistant", content: "" },
    ];
    setMessages(next);
    setStreaming(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sess.session ? { Authorization: `Bearer ${sess.session.access_token}` } : {}),
        },
        body: JSON.stringify({ messages: next.slice(0, -1) }),
      });
      if (!res.ok || !res.body) throw new Error(await res.text());
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch (e) {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content: `Sorry — couldn't reach the city right now. ${e instanceof Error ? e.message : ""}`,
        };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  const hasText = input.trim().length > 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ type: "spring", damping: 24, stiffness: 280 }}
          className="pointer-events-auto relative mx-auto mt-2 w-full max-w-md px-4"
        >
          <div className="relative">
            {/* Breathing rainbow border around panel */}
            <div className="apple-glow pointer-events-none absolute rounded-[26px]" aria-hidden />

            <div
              className="relative overflow-hidden rounded-[24px] border bg-card shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between border-b px-4 py-2.5"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="tirana-gradient grid h-7 w-7 place-items-center rounded-full shadow-[0_0_12px_rgba(124,92,255,0.5)]">
                      <SparklesIcon className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-card">
                      <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
                    </span>
                  </div>
                  <div className="leading-tight">
                    <p className="text-xs font-semibold text-foreground">Tirana AI</p>
                    <p className="text-[10px] text-muted-foreground">Live city intelligence</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="grid h-7 w-7 place-items-center rounded-full bg-muted/60 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Messages */}
              <div
                ref={scrollRef}
                className="max-h-[50vh] min-h-[140px] space-y-3 overflow-y-auto px-4 py-3"
              >
                {messages.length === 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Ask anything about Tirana right now.
                    </p>
                    <AssistantSuggestions items={SUGGESTIONS} onPick={send} dense />
                  </div>
                ) : (
                  messages.map((m, i) => (
                    <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                      {m.role === "user" ? (
                        <div className="tirana-gradient max-w-[85%] rounded-2xl rounded-br-md px-3 py-1.5 text-sm text-white shadow-[0_4px_18px_-6px_rgba(124,92,255,0.6)]">
                          {m.content}
                        </div>
                      ) : (
                        <div className="prose prose-sm max-w-none text-foreground dark:prose-invert prose-p:my-1 prose-p:leading-relaxed">
                          {m.content ? (
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                          ) : (
                            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Composer */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void send(input);
                  setInput("");
                }}
                className="border-t px-3 pb-2 pt-2"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                <div className="focus-glow-wrap rounded-2xl">
                  <div className="focus-glow" aria-hidden />
                  <div className="relative flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-1.5">
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask about Tirana…"
                      className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                      disabled={streaming}
                    />
                    <button
                      type="submit"
                      disabled={streaming || !hasText}
                      className={`grid h-8 w-8 place-items-center rounded-full text-white transition-all duration-150 ${
                        hasText
                          ? "tirana-gradient shadow-[0_0_14px_rgba(192,77,255,0.55)] hover:scale-105"
                          : "bg-muted opacity-60"
                      }`}
                      aria-label="Send"
                    >
                      {streaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <p className="mt-1.5 flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
                  <MapPin className="h-2.5 w-2.5" />
                  Reads live map data
                </p>
              </form>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
