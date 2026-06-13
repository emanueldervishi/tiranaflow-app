import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft, Loader2, MapPin, Send, Sparkles as SparklesIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { AssistantSuggestions, type Suggestion } from "@/components/assistant/shared";
import { z } from "zod";

type Msg = { role: "user" | "assistant"; content: string };

const SEARCH_SCHEMA = z.object({ q: z.string().optional() }).catch({});

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({ meta: [{ title: "Tirana AI · TiranaFlow" }] }),
  validateSearch: (search) => SEARCH_SCHEMA.parse(search),
  component: AssistantPage,
});

const SUGGESTIONS: Suggestion[] = [
  { icon: "🛡️", label: "Is it safe to go to Blloku now?" },
  { icon: "🚧", label: "Which roads should I avoid?" },
  { icon: "📢", label: "Any protests near the center?" },
  { icon: "🚗", label: "Summarize the current traffic situation." },
];

function AssistantPage() {
  const navigate = useNavigate();
  const { q } = Route.useSearch();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q) {
      setInput("");
      void send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || streaming) return;
    const next: Msg[] = [...messages, { role: "user", content: t }, { role: "assistant", content: "" }];
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
        copy[copy.length - 1] = { role: "assistant", content: `Sorry — I couldn't reach the city right now. ${e instanceof Error ? e.message : ""}` };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  const hasText = input.trim().length > 0;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-44 pt-4 safe-top">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-5 flex items-center gap-3"
        >
          <button
            onClick={() => navigate({ to: "/map" })}
            className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-card text-foreground transition hover:text-foreground"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="tirana-gradient grid h-10 w-10 place-items-center rounded-2xl p-[2px] shadow-[0_0_18px_rgba(124,92,255,0.45)]">
                <div className="grid h-full w-full place-items-center rounded-[14px] bg-background">
                  <SparklesIcon className="h-4 w-4 text-white" />
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-background">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
              </span>
            </div>
            <div>
              <h1 className="font-display text-lg font-bold leading-none">
                <span className="tirana-gradient-text">Tirana AI</span>
              </h1>
              <p className="mt-1 text-[11px] text-muted-foreground">Live city intelligence</p>
            </div>
          </div>
        </motion.header>

        {/* Intro + Suggestions */}
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="space-y-4 py-2"
          >
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-[0_20px_50px_-30px_rgba(124,92,255,0.6)]">
              <div className="tirana-gradient absolute inset-x-0 top-0 h-[2px] opacity-90" aria-hidden />
              <div className="flex items-center gap-2">
                <div className="tirana-gradient grid h-6 w-6 place-items-center rounded-full">
                  <SparklesIcon className="h-3 w-3 text-white" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/80">
                  Ask the city
                </p>
              </div>
              <p className="mt-3 text-[15px] leading-relaxed text-foreground">
                Ask anything about Tirana right now. I read live reports from the map to answer in real time.
              </p>
            </div>

            <AssistantSuggestions items={SUGGESTIONS} onPick={send} />
          </motion.div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-4 pt-2">
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={m.role === "user" ? "flex justify-end" : ""}
            >
              {m.role === "user" ? (
                <div className="tirana-gradient max-w-[85%] rounded-3xl rounded-br-md px-4 py-2.5 text-sm text-white shadow-[0_8px_24px_-10px_rgba(124,92,255,0.7)]">
                  {m.content}
                </div>
              ) : (
                <div className="prose prose-sm max-w-none text-foreground dark:prose-invert prose-p:leading-relaxed prose-headings:font-display prose-headings:text-foreground prose-strong:text-foreground prose-a:text-[#4DA3FF]">
                  {m.content ? (
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
          setInput("");
        }}
        className="fixed bottom-24 left-0 right-0 z-30 mx-auto max-w-md px-4"
      >
        <div className="focus-glow-wrap rounded-3xl">
          <div className="focus-glow" aria-hidden />
          <div className="relative flex items-center gap-2 rounded-3xl border border-border bg-card px-3 py-2 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about Tirana…"
              className="min-w-0 flex-1 bg-transparent px-2 py-2 text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
              disabled={streaming}
            />
            <button
              type="submit"
              disabled={streaming || !hasText}
              className={`grid h-10 w-10 place-items-center rounded-full text-white transition-all duration-150 ${
                hasText
                  ? "tirana-gradient shadow-[0_0_18px_rgba(192,77,255,0.6)] hover:scale-105"
                  : "bg-muted opacity-50"
              }`}
              aria-label="Send"
            >
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <p className="mt-1.5 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3" />
          Reads live map data
        </p>
      </form>
    </main>
  );
}
