import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TiranaLogo } from "@/components/tirana-logo";
import { Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — TiranaFlow" },
      { name: "description", content: "Real-time warnings for Tirana." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState<"google" | "email" | null>(null);
  const [showEmail, setShowEmail] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/map" });
    });
  }, [navigate]);

  async function handleGoogle() {
    setLoading("google");
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      setLoading(null);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/map" });
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading("email");
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created. Check your email if confirmation is required.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/map" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(at 20% 10%, oklch(0.35 0 0 / 0.6), transparent 55%), radial-gradient(at 85% 85%, oklch(0.22 0 0 / 0.6), transparent 55%), linear-gradient(160deg, oklch(0.1 0 0), oklch(0.04 0 0))",
        }}
      />
      <div
        className="absolute inset-0 -z-10 opacity-40"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-between px-6 py-10 safe-top safe-bottom">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-3 text-white"
        >
          <TiranaLogo size={44} />
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">TiranaFlow</h1>
            <p className="text-xs text-white/70">Real-time warnings for Tirana.</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="glass-strong rounded-3xl p-6 text-white shadow-elegant"
          style={{ ["--color-foreground" as never]: "white" }}
        >
          <h2 className="font-display text-3xl font-bold leading-tight">Welcome back</h2>
          <p className="mt-1 text-sm text-white/70">
            Sign in to see what's happening around you right now.
          </p>

          <div className="mt-6 space-y-3">
            <Button
              onClick={handleGoogle}
              disabled={loading !== null}
              className="h-12 w-full rounded-2xl bg-white text-zinc-900 hover:bg-white/90"
            >
              {loading === "google" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <GoogleIcon /> Continue with Google
                </>
              )}
            </Button>

            <button
              type="button"
              onClick={() => setShowEmail((v) => !v)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 py-3 text-sm text-white/80 transition hover:bg-white/10"
            >
              <Mail className="h-4 w-4" /> Use email instead
            </button>

            {showEmail && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                onSubmit={handleEmail}
                className="space-y-2 overflow-hidden pt-2"
              >
                <Input
                  type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                  className="h-12 rounded-2xl border-white/15 bg-white/5 text-white placeholder:text-white/40"
                />
                <Input
                  type="password" required minLength={6} value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="Password"
                  className="h-12 rounded-2xl border-white/15 bg-white/5 text-white placeholder:text-white/40"
                />
                <Button
                  type="submit" disabled={loading !== null}
                  className="h-12 w-full rounded-2xl"
                >
                  {loading === "email" ? <Loader2 className="h-5 w-5 animate-spin" /> : mode === "signin" ? "Sign in" : "Create account"}
                </Button>
                <button
                  type="button"
                  onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
                  className="w-full text-center text-xs text-white/60 hover:text-white"
                >
                  {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
                </button>
              </motion.form>
            )}
          </div>

          <p className="mt-6 text-center text-[11px] text-white/50">
            By continuing you agree to keep Tirana safer for everyone.
          </p>
        </motion.div>

        <p className="text-center text-xs text-white/40">© TiranaFlow · Tiranë</p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" className="mr-2">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 43.5c5 0 9.6-1.8 13.1-4.8l-6.1-5c-2 1.4-4.4 2.3-7 2.3-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39.1 16.3 43.5 24 43.5z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.7l6.1 5c4.3-3.9 6.8-9.7 6.8-16.2 0-1.2-.1-2.4-.4-3.5z"/>
    </svg>
  );
}
