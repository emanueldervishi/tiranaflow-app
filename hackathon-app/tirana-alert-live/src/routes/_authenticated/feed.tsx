import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { listActiveEvents } from "@/lib/events.functions";
import { listReports } from "@/lib/reports.functions";
import { eventToReport, reportToFeedItem } from "@/lib/event-adapter";
import { SEVERITY_META, REPORT_TYPES, timeAgo, type Report } from "@/lib/report-meta";
import { ReportDetailSheet } from "@/components/report/report-detail-sheet";
import { supabase } from "@/integrations/supabase/client";
import { MapPin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({ meta: [{ title: "Live in Tirana · TiranaFlow" }] }),
  component: FeedPage,
});

type FilterKey = "all" | "fire" | "flood" | "traffic" | "police" | "accident" | "protest";

const FILTERS: { key: FilterKey; label: string; match: (e: ReturnType<typeof eventToReport>) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  { key: "fire", label: "Fire", match: (e) => e.__event.event_type === "fire" },
  { key: "flood", label: "Flood", match: (e) => e.__event.event_type === "flood" },
  { key: "traffic", label: "Traffic", match: (e) => e.__event.event_type === "traffic" },
  { key: "police", label: "Police", match: (e) => e.__event.event_type === "police" },
  { key: "accident", label: "Accident", match: (e) => e.__event.event_type === "accident" },
  { key: "protest", label: "Protest", match: (e) => e.__event.event_type === "protest" },
];

function FeedPage() {
  const fetchEvents = useServerFn(listActiveEvents);
  const fetchReports = useServerFn(listReports);
  const qc = useQueryClient();
  const { data, dataUpdatedAt } = useQuery({
    queryKey: ["live-events"],
    queryFn: () => fetchEvents({}),
    refetchInterval: 30_000,
  });
  const { data: reportsData } = useQuery({
    queryKey: ["user-reports"],
    queryFn: () => fetchReports(),
    refetchInterval: 30_000,
  });
  const [selected, setSelected] = useState<Report | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((p) =>
      setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
    );
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Realtime: refresh when events or user reports change
  useEffect(() => {
    const ch = supabase
      .channel("feed-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        qc.invalidateQueries({ queryKey: ["live-events"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => {
        qc.invalidateQueries({ queryKey: ["user-reports"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const events = useMemo(() => {
    const liveItems = (data?.events ?? []).map(eventToReport);
    const reportItems = (reportsData?.reports ?? []).map(reportToFeedItem);
    const merged = [...reportItems, ...liveItems].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const f = FILTERS.find((x) => x.key === filter)!;
    return merged.filter(f.match);
  }, [data, reportsData, filter]);

  const activeCount = (data?.events?.length ?? 0) + (reportsData?.reports?.length ?? 0);
  const updatedLabel = dataUpdatedAt ? timeAgo(new Date(dataUpdatedAt).toISOString()) : "just now";
  void tick;

  return (
    <main className="mx-auto max-w-md pb-28 pt-8 safe-top">
      <header className="px-5 pb-3 pt-6">

        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <span className="relative grid h-2 w-2 place-items-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Live · Updated {updatedLabel}
        </div>
        <h1 className="mt-1.5 font-display text-[34px] font-bold leading-[1.05] tracking-tight">
          Live in Tirana
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          <span className="font-semibold text-foreground">{activeCount}</span> active events ·
          sourced from Albanian news in the last hours
        </p>
      </header>

      <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto px-5 pb-1">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold uppercase tracking-wider transition ${
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-white/10 bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-3 px-4">
        {events.map((r, i) => (
          <EventCard key={r.id} report={r} index={i} onOpen={() => setSelected(r)} />
        ))}
        {events.length === 0 && (
          <div className="rounded-3xl border border-white/[0.06] bg-card p-10 text-center text-sm text-muted-foreground">
            No live events yet. The ingestion pipeline runs every 5 minutes.
          </div>
        )}
      </div>

      <ReportDetailSheet report={selected} userLocation={userLocation} onClose={() => setSelected(null)} enableLocateOnMap />
    </main>
  );
}

function EventCard({
  report,
  index,
  onOpen,
}: {
  report: ReturnType<typeof eventToReport>;
  index: number;
  onOpen: () => void;
}) {
  const sevColor = `var(--color-severity-${report.severity})`;
  const typeMeta = REPORT_TYPES[report.type];
  const TypeIcon = typeMeta.icon;
  const ev = report.__event;
  const isCritical = report.severity === "critical";
  const sources = ev.source_count;
  const ageH = (Date.now() - new Date(report.created_at).getTime()) / 3_600_000;
  const fading = ageH > 6;

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: fading ? 0.55 : 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      onClick={onOpen}
      className="group relative flex w-full gap-3 overflow-hidden rounded-2xl border border-white/[0.06] bg-card p-3 pl-4 text-left shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)] transition-[transform,background] duration-150 active:scale-[0.99] hover:bg-card/80"
    >
      <span
        aria-hidden
        className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
        style={{ background: sevColor, boxShadow: isCritical ? `0 0 12px ${sevColor}` : undefined }}
      />

      <div
        className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl bg-muted"
        style={{ background: ev.image_url ? undefined : `color-mix(in oklab, ${sevColor} 22%, var(--color-muted))` }}
      >
        {ev.image_url ? (
          <>
            <img
              src={ev.image_url}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" />
          </>
        ) : (
          <div className="grid h-full w-full place-items-center">
            <TypeIcon className="h-7 w-7" style={{ color: sevColor }} strokeWidth={2.2} />
          </div>
        )}
        {sources > 1 && (
          <span className="absolute bottom-1 left-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            +{sources - 1} sources
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] shadow-sm ${SEVERITY_META[report.severity].className}`}
          >
            {isCritical && (
              <span className="relative grid h-1.5 w-1.5 place-items-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-80" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-current" />
              </span>
            )}
            {SEVERITY_META[report.severity].label}
          </span>
          {ev.status === "confirmed" && (
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-emerald-400">
              Confirmed
            </span>
          )}
        </div>

        <h3 className="mt-1.5 line-clamp-2 text-[15.5px] font-semibold leading-tight">
          {report.title}
        </h3>

        {ev.summary && (
          <p className="mt-1 line-clamp-2 text-[12.5px] text-muted-foreground">{ev.summary}</p>
        )}

        <div className="mt-1.5 flex items-center gap-1 text-[12px] text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{ev.location_name}</span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">
          {timeAgo(report.created_at)}
        </span>
        <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-foreground">
          {typeMeta.label}
        </span>
      </div>
    </motion.button>
  );
}
