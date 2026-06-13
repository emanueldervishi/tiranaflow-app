import { motion, AnimatePresence } from "motion/react";
import { Check, MapPin, Share2, ThumbsDown, X } from "lucide-react";
import { REPORT_TYPES, SEVERITY_META, haversineKm, timeAgo, type Report } from "@/lib/report-meta";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { voteReport } from "@/lib/reports.functions";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function ReportDetailSheet({
  report,
  userLocation,
  onClose,
  enableLocateOnMap = false,
}: {
  report: Report | null;
  userLocation: { lat: number; lng: number } | null;
  onClose: () => void;
  enableLocateOnMap?: boolean;
}) {
  const vote = useServerFn(voteReport);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [voting, setVoting] = useState(false);
  const [localConfirms, setLocalConfirms] = useState(report?.confirmations ?? 0);

  useEffect(() => {
    setLocalConfirms(report?.confirmations ?? 0);
  }, [report?.id, report?.confirmations]);

  return (
    <AnimatePresence>
      {report && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md overflow-hidden rounded-t-3xl bg-card shadow-elegant safe-bottom"
          >
            <div className="relative">
              {report.image_url ? (
                <img src={report.image_url} alt={report.title} className="h-56 w-full object-cover" />
              ) : (
                <div className="h-32 w-full bg-gradient-to-br from-muted to-secondary" />
              )}
              <button
                onClick={onClose}
                className="glass absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="absolute left-3 top-3 mx-auto h-1.5 w-12 rounded-full bg-white/60" />
            </div>

            <div className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <SeverityBadge severity={report.severity} />
                  <h2 className="mt-2 truncate text-xl font-bold">{report.title}</h2>
                  <TypeLine type={report.type} />
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div>{timeAgo(report.created_at)}</div>
                  {userLocation && (
                    <div className="mt-1 font-medium text-foreground">
                      {haversineKm(userLocation, { lat: report.latitude, lng: report.longitude }).toFixed(1)} km
                    </div>
                  )}
                </div>
              </div>

              {report.description && (
                <p className="text-sm leading-relaxed text-muted-foreground">{report.description}</p>
              )}

              {report.address && (
                <button
                  type="button"
                  onClick={() => {
                    if (!enableLocateOnMap) return;
                    onClose();
                    navigate({
                      to: "/map",
                      search: { focus: report.id },
                    });
                  }}
                  className={`flex w-full items-center gap-2 rounded-xl text-left text-xs text-muted-foreground ${enableLocateOnMap ? "transition hover:text-foreground" : "cursor-default"}`}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="truncate">{report.address}</span>
                  {enableLocateOnMap && (
                    <span className="ml-auto shrink-0 text-[11px] font-semibold uppercase tracking-wider text-foreground/70">
                      Show on map →
                    </span>
                  )}
                </button>
              )}

              <div className="flex items-center gap-2 pt-1">
                {(report as Report & { __source?: "event" | "report" }).__source !== "event" && (
                  <>
                    <Button
                      variant="secondary"
                      className="flex-1 rounded-2xl"
                      disabled={voting}
                      onClick={async () => {
                        setVoting(true);
                        setLocalConfirms((c) => c + 1);
                        try {
                          await vote({ data: { report_id: report.id, vote: "confirm" } });
                          toast.success("Thanks — confirmation recorded");
                          qc.invalidateQueries({ queryKey: ["user-reports"] });
                          qc.invalidateQueries({ queryKey: ["live-events"] });
                        } catch (e) {
                          setLocalConfirms((c) => Math.max(0, c - 1));
                          toast.error(e instanceof Error ? e.message : "Vote failed");
                        } finally {
                          setVoting(false);
                        }
                      }}
                    >
                      <Check className="mr-1 h-4 w-4" /> Confirm
                      <span className="ml-1 text-xs text-muted-foreground">({localConfirms})</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 rounded-2xl"
                      disabled={voting}
                      onClick={async () => {
                        setVoting(true);
                        try {
                          await vote({ data: { report_id: report.id, vote: "inaccurate" } });
                          toast.message("Marked as inaccurate");
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Vote failed");
                        } finally {
                          setVoting(false);
                        }
                      }}
                    >
                      <ThumbsDown className="mr-1 h-4 w-4" /> Not accurate
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-2xl"
                  onClick={async () => {
                    const text = `${report.title} — TiranaFlow`;
                    if (navigator.share) {
                      try {
                        await navigator.share({ title: "TiranaFlow", text, url: window.location.href });
                      } catch {/* dismissed */}
                    } else {
                      await navigator.clipboard.writeText(text);
                      toast.success("Copied to clipboard");
                    }
                  }}
                  aria-label="Share"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function SeverityBadge({ severity }: { severity: Report["severity"] }) {
  const meta = SEVERITY_META[severity];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${meta.className}`}>
      {severity === "critical" && (
        <span className="relative grid h-1.5 w-1.5 place-items-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-75" />
          <span className="relative h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {meta.label}
    </span>
  );
}

export function TypeLine({ type }: { type: Report["type"] }) {
  const meta = REPORT_TYPES[type];
  const Icon = meta.icon;
  return (
    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </div>
  );
}
