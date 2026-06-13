import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, Send, Sparkles as SparklesIcon, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

interface AIChatOverlayProps {
  open: boolean;
  onClose: () => void;
  initialQuery?: string;
}

const SUGGESTIONS = [
  "Is Blloku safe right now?",
  "Which roads to avoid?",
  "Any protests near the center?",
  "Traffic situation in one sentence.",
];

export function AIChatOverlay({ open, onClose, initialQuery }: AIChatOverlayProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sentInitialRef = useRef(false);

  // Send initial query once
  useEffect(() => {
    if (open && initialQuery && !sentInitialRef.current) {
      sentInitialRef.current = true;
      void send(initialQuery);
    }
    if (!open) sentInitialRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialQuery]);

  // Focus input on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 250);
  }, [open]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Esc to close
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

  function handleClose() {
    setMessages([]);
    setInput("");
    sentInitialRef.current = false;
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-md"
            onClick={handleClose}
          />

          {/* Centered floating panel */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", damping: 22, stiffness: 280 }}
              className="relative w-full max-w-md pointer-events-auto"
            >
              {/* Apple Intelligence rainbow glow halo */}
              <div className="apple-glow pointer-events-none absolute rounded-[28px]" aria-hidden />
              <div className="apple-glow-soft pointer-events-none absolute rounded-[44px]" aria-hidden />

              {/* Panel */}
              <div className="relative overflow-hidden rounded-[26px] border border-white/15 bg-card/95 backdrop-blur-xl shadow-elegant">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="relative grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-500">
                      <SparklesIcon className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-none">Tirana AI</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">Live city intelligence</p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="grid h-8 w-8 place-items-center rounded-full bg-muted text-muted-foreground transition hover:bg-muted/70"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Messages */}
                <div
                  ref={scrollRef}
                  className="max-h-[55vh] min-h-[180px] space-y-3 overflow-y-auto px-4 py-4"
                >
                  {messages.length === 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Ask anything about Tirana right now. I read the live map feed.
                      </p>
                      <div className="grid gap-2">
                        {SUGGESTIONS.map((s) => (
                          <button
                            key={s}
                            onClick={() => send(s)}
                            className="rounded-2xl border border-border bg-card px-3 py-2 text-left text-xs font-medium transition hover:border-primary"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    messages.map((m, i) => (
                      <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                        {m.role === "user" ? (
                          <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                            {m.content}
                          </div>
                        ) : (
                          <div className="prose prose-sm max-w-none text-foreground dark:prose-invert prose-p:my-1.5 prose-p:leading-relaxed prose-ul:my-1.5 prose-headings:font-display">
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
                  className="border-t border-border/50 px-3 py-2.5"
                >
                  <div className="flex items-center gap-2 rounded-2xl bg-muted/60 px-3 py-1.5">
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask Tirana AI…"
                      className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground"
                      disabled={streaming}
                    />
                    <button
                      type="submit"
                      disabled={streaming || !input.trim()}
                      className="grid h-8 w-8 place-items-center rounded-full bg-foreground text-background disabled:opacity-40"
                      aria-label="Send"
                    >
                      {streaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
