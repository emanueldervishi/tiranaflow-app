import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listActiveEvents } from "@/lib/events.functions";
import { listReports } from "@/lib/reports.functions";
import { eventToReport, reportToFeedItem } from "@/lib/event-adapter";
import { TiranaMap } from "@/components/map/tirana-map";
import { REPORT_TYPES, SEVERITY_META, timeAgo, type Report, type Severity } from "@/lib/report-meta";
import { Filter, Search, Sparkles, User, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { AIChatPanel } from "@/components/ai-chat-panel";
import { ReportDetailSheet } from "@/components/report/report-detail-sheet";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/map")({
  head: () => ({ meta: [{ title: "Tirana live · TiranaFlow" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    focus: typeof s.focus === "string" ? s.focus : undefined,
  }),
  component: MapPage,
});

function MapPage() {
  const fetchEvents = useServerFn(listActiveEvents);
  const fetchReports = useServerFn(listReports);
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const { data } = useQuery({
    queryKey: ["live-events"],
    queryFn: () => fetchEvents({}),
    refetchInterval: 30_000,
  });
  const { data: reportsData } = useQuery({
    queryKey: ["user-reports"],
    queryFn: () => fetchReports(),
    refetchInterval: 30_000,
  });

  const [filter, setFilter] = useState<Severity | "all">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [query, setQuery] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInitial, setChatInitial] = useState<string | undefined>(undefined);
  const [clusterReports, setClusterReports] = useState<Report[] | null>(null);
  const [selected, setSelected] = useState<Report | null>(null);
  const [focusPoint, setFocusPoint] = useState<{ lat: number; lng: number; key: string } | null>(null);
  const navigate = useNavigate();
  

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { maximumAge: 60_000, timeout: 5000 },
    );
  }, []);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel("events-map")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        queryClient.invalidateQueries({ queryKey: ["live-events"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => {
        queryClient.invalidateQueries({ queryKey: ["user-reports"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [queryClient]);

  const reports = [
    ...(reportsData?.reports ?? []).map(reportToFeedItem),
    ...(data?.events ?? []).map(eventToReport),
  ].filter((r) => filter === "all" || r.severity === filter);

  // Handle ?focus=<reportId> — pan map and open the detail sheet
  useEffect(() => {
    if (!search.focus) return;
    const all = [
      ...(reportsData?.reports ?? []).map(reportToFeedItem),
      ...(data?.events ?? []).map(eventToReport),
    ];
    const target = all.find((r) => r.id === search.focus);
    if (!target) return;
    setFocusPoint({ lat: target.latitude, lng: target.longitude, key: target.id });
    setSelected(target);
    navigate({ to: "/map", search: {}, replace: true });
  }, [search.focus, data, reportsData, navigate]);

  const onPin = useCallback((r: Report) => setSelected(r), []);
  const onCluster = useCallback((rs: Report[]) => setClusterReports(rs), []);

  const openChat = (q?: string) => {
    setChatInitial(q);
    setChatOpen(true);
  };

  return (
    <main className="relative h-screen overflow-hidden">
      <TiranaMap reports={reports} onPinClick={onPin} onClusterClick={onCluster} userLocation={userLocation} focus={focusPoint} />


      <div className="absolute left-0 right-0 top-0 z-30 safe-top">
        <div className="mx-auto flex max-w-md items-center gap-2 px-4 pt-3">
          <div className="relative flex-1">
            <div className="apple-glow pointer-events-none absolute rounded-2xl" aria-hidden />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                openChat(query.trim() || undefined);
                setQuery("");
              }}
              className="relative flex items-center gap-2 rounded-2xl bg-card/90 px-3 py-2.5 backdrop-blur-xl shadow-elegant"
            >
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => openChat()}
                placeholder="Ask Tirana AI…"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
            </form>
          </div>

          <button
            onClick={() => setShowFilters((v) => !v)}
            className="glass grid h-11 w-11 shrink-0 place-items-center rounded-2xl shadow-elegant"
            aria-label="Filter"
          >
            <Filter className="h-4 w-4" />
          </button>
          <Link
            to="/profile"
            className="glass grid h-11 w-11 shrink-0 place-items-center rounded-2xl shadow-elegant"
            aria-label="Profile"
          >
            <User className="h-4 w-4" />
          </Link>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mx-auto mt-2 flex max-w-md gap-2 px-4"
            >
              {(["all", "critical", "serious", "low"] as const).map((s) => {
                const active = filter === s;
                return (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    className={`glass rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition ${active ? "ring-2 ring-primary" : ""}`}
                  >
                    {s === "all" ? "All" : SEVERITY_META[s].label}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        <AIChatPanel open={chatOpen} onClose={() => setChatOpen(false)} initialQuery={chatInitial} />
      </div>

      <div className="pointer-events-none absolute left-1/2 top-[78px] z-20 -translate-x-1/2">
        <div className="glass flex items-center gap-2.5 rounded-full px-4 py-2 shadow-elegant">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-foreground opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-foreground" />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground">
            {reports.length} live
          </span>
          <span className="h-3 w-px bg-border" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {reports.filter((r) => r.severity === "critical").length} critical
          </span>
        </div>
      </div>

      <AnimatePresence>
        {clusterReports && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={() => setClusterReports(null)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md overflow-hidden rounded-t-3xl bg-card shadow-elegant safe-bottom"
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Nearby
                  </p>
                  <h2 className="text-lg font-semibold">
                    {clusterReports.length} reports in this area
                  </h2>
                </div>
                <button
                  onClick={() => setClusterReports(null)}
                  className="grid h-9 w-9 place-items-center rounded-full bg-muted text-muted-foreground"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto px-2 pb-4">
                {clusterReports.map((r) => {
                  const t = REPORT_TYPES[r.type];
                  const Icon = t.icon;
                  return (
                    <li key={r.id}>
                      <button
                        onClick={() => {
                          setClusterReports(null);
                          setSelected(r);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition active:bg-muted"
                      >
                        <div
                          className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
                          style={{ background: t.color }}
                        >
                          {r.image_url ? (
                            <img src={r.image_url} alt="" className="h-full w-full rounded-full object-cover" />
                          ) : (
                            <Icon className="h-5 w-5 text-white" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{r.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {t.label} · {SEVERITY_META[r.severity].label} · {timeAgo(r.created_at)}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ReportDetailSheet report={selected} userLocation={userLocation} onClose={() => setSelected(null)} />
    </main>
  );
}
