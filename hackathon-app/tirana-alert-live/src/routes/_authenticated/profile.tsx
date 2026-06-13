import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { myStats, listMyReports, deleteReport } from "@/lib/reports.functions";
import { isCurrentUserAdmin, latestIngestionLog, triggerIngestion } from "@/lib/events.functions";
import { REPORT_TYPES, SEVERITY_META, timeAgo, type Report } from "@/lib/report-meta";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { setTheme } from "@/components/theme-provider";
import {
  Activity,
  Bell,
  ChevronRight,
  Globe,
  Info,
  Loader2,
  LogOut,
  Mail,
  Moon,
  RefreshCcw,
  Shield,
  ShieldCheck,
  Sun,
  SunMoon,
  UserCircle2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile · TiranaFlow" }] }),
  component: ProfilePage,
});

type ThemeKey = "light" | "dark" | "auto";

function ProfilePage() {
  const navigate = useNavigate();
  const stats = useServerFn(myStats);
  const adminCheck = useServerFn(isCurrentUserAdmin);
  const fetchLog = useServerFn(latestIngestionLog);
  const runIngest = useServerFn(triggerIngestion);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["stats"], queryFn: () => stats({}) });
  const { data: admin } = useQuery({ queryKey: ["is-admin"], queryFn: () => adminCheck({}) });
  const myReportsFn = useServerFn(listMyReports);
  const delReport = useServerFn(deleteReport);
  const { data: myReportsData } = useQuery({
    queryKey: ["my-reports"],
    queryFn: () => myReportsFn({}),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => delReport({ data: { id } }),
    onSuccess: () => {
      toast.success("Report deleted");
      qc.invalidateQueries({ queryKey: ["my-reports"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["user-reports"] });
      qc.invalidateQueries({ queryKey: ["live-events"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });
  const { data: logData } = useQuery({
    queryKey: ["latest-ingestion-log"],
    queryFn: () => fetchLog({}),
    refetchInterval: admin?.isAdmin ? 30_000 : false,
    enabled: !!admin?.isAdmin,
  });
  const ingestMutation = useMutation({
    mutationFn: () => runIngest({}),
    onSuccess: (r) => {
      toast.success(`Ingested ${r.items_fetched} items → ${r.events_created} new events`);
      qc.invalidateQueries({ queryKey: ["latest-ingestion-log"] });
      qc.invalidateQueries({ queryKey: ["live-events"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Ingestion failed"),
  });
  const [email, setEmail] = useState<string | null>(null);
  const [theme, setThemeState] = useState<ThemeKey>("auto");
  const [lang, setLang] = useState<"EN" | "SQ">("EN");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const stored = (localStorage.getItem("tf-theme") as ThemeKey | null) ?? "auto";
    setThemeState(stored);
    const storedLang = (localStorage.getItem("tf-lang") as "EN" | "SQ" | null) ?? "EN";
    setLang(storedLang);
  }, []);

  function pickTheme(t: ThemeKey) {
    setThemeState(t);
    setTheme(t);
  }
  function pickLang(l: "EN" | "SQ") {
    setLang(l);
    localStorage.setItem("tf-lang", l);
  }

  const score = data?.profile?.trusted_reporter_score ?? 0;
  const reports = data?.totalReports ?? 0;
  const confirmed = (data?.profile as { confirmed_count?: number } | null)?.confirmed_count ?? 0;
  const name = data?.profile?.name ?? email?.split("@")[0] ?? "You";
  const initials = name.slice(0, 2).toUpperCase();
  const trustPct = Math.min(100, Math.round((score / 100) * 100));
  const log = logData?.log;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-md px-4 pb-36 pt-12 safe-top">
        <motion.header
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-5"
        >
          <h1 className="font-display text-2xl font-bold">Profile</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Your account and preferences</p>
        </motion.header>

        {/* Identity card */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative overflow-hidden rounded-[20px] border border-border bg-card p-5"
        >
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-foreground p-[2px]">
              <Avatar className="h-full w-full">
                <AvatarImage src={data?.profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-muted text-lg font-bold text-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-display text-[20px] font-bold leading-tight">{name}</h2>
              <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{email}</p>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground">
                <ShieldCheck className="h-3 w-3 text-[#4DA3FF]" /> Citizen
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-5 grid grid-cols-3 gap-2.5">
            <StatTile
              icon={<UserCircle2 className="h-3.5 w-3.5" />}
              label="Reports"
              value={reports}
            />
            <TrustTile score={score} pct={trustPct} />
            <StatTile
              icon={<ShieldCheck className="h-3.5 w-3.5" />}
              label="Confirmed"
              value={confirmed}
            />
          </div>
        </motion.section>

        {/* My Reports */}
        <SectionHeader>My reports</SectionHeader>
        <Card>
          {(() => {
            const list = myReportsData?.reports ?? [];
            if (list.length === 0) {
              return (
                <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
                  You haven't submitted any reports yet.
                </p>
              );
            }
            return (
              <ul className="divide-y divide-muted">
                {list.map((r) => (
                  <MyReportRow
                    key={r.id}
                    report={r}
                    onOpen={() => navigate({ to: "/map", search: { focus: r.id } })}
                    onDelete={() => {
                      if (confirm("Delete this report?")) deleteMutation.mutate(r.id);
                    }}
                    deleting={deleteMutation.isPending && deleteMutation.variables === r.id}
                  />
                ))}
              </ul>
            );
          })()}
        </Card>

        {/* Account */}
        <SectionHeader>Account</SectionHeader>
        <Card>
          <Row icon={<Mail className="h-4 w-4" />} label="Email" value={email ?? "—"} />
          <Divider />
          <Row icon={<UserCircle2 className="h-4 w-4" />} label="Display name" value={name} />
        </Card>

        {/* Preferences */}
        <SectionHeader>Preferences</SectionHeader>
        <Card>
          <div className="px-4 pt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Theme</p>
            <Segmented
              value={theme}
              onChange={pickTheme}
              options={[
                { key: "light", label: "Light", Icon: Sun },
                { key: "dark", label: "Dark", Icon: Moon },
                { key: "auto", label: "Auto", Icon: SunMoon },
              ]}
            />
          </div>
          <div className="px-4 pt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Language</p>
            <Segmented
              value={lang}
              onChange={pickLang}
              options={[
                { key: "EN", label: "English", Icon: Globe },
                { key: "SQ", label: "Shqip", Icon: Globe },
              ]}
            />
          </div>
          <div className="mt-2">
            <Divider />
            <Row icon={<Bell className="h-4 w-4" />} label="Notifications" chevron />
          </div>
        </Card>

        {admin?.isAdmin && (
          <>
            <SectionHeader>Admin · Live ingestion</SectionHeader>
            <Card>
              <div className="space-y-3 p-4">
                <button
                  onClick={() => ingestMutation.mutate()}
                  disabled={ingestMutation.isPending}
                  className="tirana-gradient flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-semibold text-white shadow-[0_0_18px_rgba(124,92,255,0.45)] transition active:scale-[0.99] disabled:opacity-60"
                >
                  {ingestMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-4 w-4" />
                  )}
                  {ingestMutation.isPending ? "Ingesting…" : "Run ingestion now"}
                </button>

                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <Activity className="h-3.5 w-3.5" /> Last run
                  </div>
                  {log ? (
                    <div className="mt-2 space-y-1 text-[12.5px] text-foreground/90">
                      <div>
                        <span className="text-muted-foreground">When: </span>
                        {new Date(log.run_at).toLocaleString()}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Items fetched: </span>
                        {log.items_fetched}
                      </div>
                      <div>
                        <span className="text-muted-foreground">New events: </span>
                        <span className="font-semibold text-emerald-400">{log.events_created}</span>
                        <span className="text-muted-foreground"> · deduped: </span>
                        {log.events_deduped}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Duration: </span>
                        {(log.duration_ms / 1000).toFixed(1)}s
                      </div>
                      {Array.isArray(log.errors) && log.errors.length > 0 && (
                        <div className="mt-1.5 text-[11.5px] text-amber-400">
                          {log.errors.length} feed/AI error{log.errors.length === 1 ? "" : "s"} (non-blocking)
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-[12.5px] text-muted-foreground">No runs yet — press the button above.</p>
                  )}
                </div>
              </div>
            </Card>
          </>
        )}

        {/* About */}
        <SectionHeader>About</SectionHeader>
        <Card>
          <Row icon={<Info className="h-4 w-4" />} label="About TiranaFlow" chevron />
          <Divider />
          <Row icon={<Shield className="h-4 w-4" />} label="Privacy & data" chevron />
        </Card>

        {/* Sign out */}
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/auth" });
          }}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-[16px] border border-red-500/20 bg-red-500/[0.06] px-4 py-3.5 text-[14px] font-semibold text-red-400 transition hover:bg-red-500/[0.1] active:scale-[0.99]"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>

        <p className="mt-6 text-center text-[11px] text-muted-foreground/70">TiranaFlow · keep Tirana informed</p>
      </div>
    </main>
  );
}

/* --- building blocks --- */

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 mt-6 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
      {children}
    </p>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-[16px] border border-border bg-card shadow-[0_10px_30px_-20px_rgba(0,0,0,0.7)]">
      {children}
    </section>
  );
}

function Divider() {
  return <div className="mx-4 h-px bg-muted" />;
}

function Row({
  icon,
  label,
  value,
  chevron,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  chevron?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-muted/30">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted/60 text-foreground/80">
        {icon}
      </span>
      <span className="flex-1 text-[14px] font-medium text-foreground">{label}</span>
      {value && <span className="max-w-[55%] truncate text-[13px] text-muted-foreground">{value}</span>}
      {chevron && <ChevronRight className="h-4 w-4 text-muted-foreground/70" />}
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted/40 p-3">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1.5 font-display text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}

function MyReportRow({
  report,
  onOpen,
  onDelete,
  deleting,
}: {
  report: Report;
  onOpen: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const typeMeta = REPORT_TYPES[report.type];
  const sevMeta = SEVERITY_META[report.severity];
  const Icon = typeMeta.icon;
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted/60">
          <Icon className="h-4 w-4" style={{ color: typeMeta.color }} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold text-foreground">{report.title}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${sevMeta.className}`}>
              {sevMeta.label}
            </span>
            <span>· {timeAgo(report.created_at)}</span>
            <span>· {report.confirmations} confirms</span>
          </span>
        </span>
      </button>
      <button
        onClick={onDelete}
        disabled={deleting}
        aria-label="Delete report"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
      >
        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </button>
    </li>
  );
}

function TrustTile({ score, pct }: { score: number; pct: number }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-muted/40 p-3">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Shield className="h-3.5 w-3.5 text-foreground" />
        <span>Trust</span>
      </div>
      <div className="mt-1.5 font-display text-2xl font-bold text-foreground">
        {score}
      </div>
      {score > 0 && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-foreground transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

interface SegOpt<T extends string> {
  key: T;
  label: string;
  Icon: typeof Sun;
}
function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegOpt<T>[];
}) {
  return (
    <div
      className="relative grid rounded-2xl border border-border bg-muted/40 p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className="relative z-10 flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-[11px] font-semibold transition-colors duration-150"
          >
            {active && (
              <motion.span
                layoutId={`seg-${options.map((o) => o.key).join("-")}`}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className="absolute inset-0 -z-10 rounded-xl bg-foreground"
              />
            )}
            <opt.Icon className={`h-4 w-4 ${active ? "text-background" : "text-muted-foreground"}`} />
            <span className={active ? "text-background" : "text-muted-foreground"}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
