import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getReport, voteReport } from "@/lib/reports.functions";
import { REPORT_TYPES, SEVERITY_META, timeAgo, type Report } from "@/lib/report-meta";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Check, MapPin, Share2, ThumbsDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/report/$id")({
  head: () => ({ meta: [{ title: "Report · TiranaFlow" }] }),
  component: ReportDetailPage,
});

function ReportDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const fetchReport = useServerFn(getReport);
  const vote = useServerFn(voteReport);
  const [voting, setVoting] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["report", id],
    queryFn: () => fetchReport({ data: { id } }),
  });

  const report = data?.report as Report | null | undefined;

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl pb-36">
      <div className="relative">
        {report?.image_url ? (
          <img
            src={report.image_url}
            alt={report.title}
            className="h-[42vh] max-h-[420px] min-h-[260px] w-full object-cover sm:rounded-b-[32px]"
          />
        ) : (
          <div className="h-48 w-full bg-gradient-to-br from-muted to-secondary sm:rounded-b-[32px]" />
        )}
        <button
          onClick={() => navigate({ to: "/map" })}
          className="glass absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full safe-top"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>

      {isLoading || !report ? (
        <div className="grid place-items-center px-6 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <article className="space-y-6 px-5 pt-6 sm:px-8">
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Severity severity={report.severity} />
              <TypeLine type={report.type} />
              <span className="text-xs text-muted-foreground">· {timeAgo(report.created_at)}</span>
            </div>
            <h1 className="font-display text-[26px] font-bold leading-tight sm:text-3xl">{report.title}</h1>
          </header>

          {report.description && (
            <p className="text-[15px] leading-relaxed text-foreground/90">{report.description}</p>
          )}

          {report.address && (
            <div className="flex items-center gap-2 rounded-2xl bg-secondary/60 px-3.5 py-3 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{report.address}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="secondary"
              className="h-11 flex-1 rounded-2xl"
              disabled={voting}
              onClick={async () => {
                setVoting(true);
                try {
                  await vote({ data: { report_id: report.id, vote: "confirm" } });
                  toast.success("Confirmation recorded");
                  refetch();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Vote failed");
                } finally {
                  setVoting(false);
                }
              }}
            >
              <Check className="mr-1 h-4 w-4" /> Confirm
              <span className="ml-1 text-xs text-muted-foreground">({report.confirmations})</span>
            </Button>
            <Button
              variant="outline"
              className="h-11 flex-1 rounded-2xl"
              disabled={voting}
              onClick={async () => {
                setVoting(true);
                try {
                  await vote({ data: { report_id: report.id, vote: "inaccurate" } });
                  toast.message("Marked as inaccurate");
                  refetch();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Vote failed");
                } finally {
                  setVoting(false);
                }
              }}
            >
              <ThumbsDown className="mr-1 h-4 w-4" /> Inaccurate
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-2xl"
              onClick={async () => {
                const text = `${report.title} — TiranaFlow`;
                if (navigator.share) {
                  try { await navigator.share({ title: "TiranaFlow", text, url: window.location.href }); } catch {}
                } else {
                  await navigator.clipboard.writeText(text);
                  toast.success("Copied");
                }
              }}
              aria-label="Share"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </article>
      )}
    </main>
  );
}

function Severity({ severity }: { severity: Report["severity"] }) {
  const meta = SEVERITY_META[severity];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function TypeLine({ type }: { type: Report["type"] }) {
  const meta = REPORT_TYPES[type];
  const Icon = meta.icon;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <Icon className="h-4 w-4" style={{ color: meta.color }} />
      {meta.label}
    </span>
  );
}
