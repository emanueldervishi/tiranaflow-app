import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, ChevronLeft, Loader2, MapPin, Upload } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { REPORT_TYPES, SEVERITY_META, TIRANA_CENTER, type ReportType, type Severity } from "@/lib/report-meta";
import { useServerFn } from "@tanstack/react-start";
import { createReport } from "@/lib/reports.functions";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/report/")({
  head: () => ({ meta: [{ title: "New report · TiranaFlow" }] }),
  component: ReportPage,
});

function ReportPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [step, setStep] = useState<"photo" | "form">("photo");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ReportType>("traffic_accident");
  const [severity, setSeverity] = useState<Severity>("serious");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(TIRANA_CENTER);
  const [submitting, setSubmitting] = useState(false);

  const create = useServerFn(createReport);
  const qc = useQueryClient();

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((p) =>
      setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
    );
  }, []);

  function onPhoto(f: File) {
    setPhoto(f);
    setPreview(URL.createObjectURL(f));
    setStep("form");
  }

  async function submit() {
    if (!title.trim()) {
      toast.error("Add a short title");
      return;
    }
    setSubmitting(true);
    try {
      let image_path: string | null = null;
      if (photo) {
        const { data: u } = await supabase.auth.getUser();
        const uid = u.user?.id;
        const path = `${uid}/${Date.now()}-${photo.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error } = await supabase.storage.from("report-photos").upload(path, photo, { upsert: false });
        if (error) throw error;
        image_path = path;
      }
      await create({
        data: {
          title: title.trim(),
          type,
          severity,
          description: description.trim() || null,
          image_path,
          latitude: location.lat,
          longitude: location.lng,
          address: null,
        },
      });
      await qc.invalidateQueries({ queryKey: ["reports"] });
      toast.success("Report published");
      navigate({ to: "/map" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not publish");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pb-36 pt-4 safe-top">
      <header className="mb-4 flex items-center gap-2">
        <button
          onClick={() => (step === "form" ? setStep("photo") : navigate({ to: "/map" }))}
          className="glass grid h-10 w-10 place-items-center rounded-2xl"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-display text-xl font-bold">New report</h1>
          <p className="text-xs text-muted-foreground">{step === "photo" ? "Step 1 · Photo" : "Step 2 · Details"}</p>
        </div>
      </header>

      {step === "photo" && (
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-3xl bg-foreground px-6 py-12 text-background shadow-elegant active:scale-[0.99]"
          >
            <Camera className="h-10 w-10" strokeWidth={1.6} />
            <span className="font-display text-lg font-bold">Take a photo</span>
            <span className="text-xs opacity-80">Show others what's happening</span>
          </button>
          <button
            onClick={() => {
              if (fileRef.current) {
                fileRef.current.removeAttribute("capture");
                fileRef.current.click();
                setTimeout(() => fileRef.current?.setAttribute("capture", "environment"), 500);
              }
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-4 text-sm font-medium"
          >
            <Upload className="h-4 w-4" /> Upload from library
          </button>
          <button
            onClick={() => setStep("form")}
            className="w-full py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Skip photo
          </button>
        </motion.section>
      )}

      {step === "form" && (
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {preview && (
            <div className="overflow-hidden rounded-3xl shadow-elegant">
              <img src={preview} alt="preview" className="h-44 w-full object-cover" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Accident on Rruga e Kavajës"
              className="h-12 rounded-2xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(REPORT_TYPES) as ReportType[]).map((t) => {
                const meta = REPORT_TYPES[t];
                const Icon = meta.icon;
                const active = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex flex-col items-center gap-1 rounded-2xl border bg-card p-3 text-[11px] font-medium transition ${active ? "border-primary bg-accent text-accent-foreground" : "border-border text-muted-foreground"}`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-center leading-tight">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Severity</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["low", "serious", "critical"] as Severity[]).map((s) => {
                const meta = SEVERITY_META[s];
                const active = severity === s;
                return (
                  <button
                    key={s} type="button" onClick={() => setSeverity(s)}
                    className={`rounded-2xl py-3 text-sm font-bold transition ${active ? meta.className + " shadow-elegant" : "bg-card text-muted-foreground"}`}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="What should others know?"
              rows={3}
              className="rounded-2xl"
            />
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-secondary/60 p-3 text-xs text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            Location: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </div>

          <Button
            onClick={submit}
            disabled={submitting}
            className="h-14 w-full rounded-2xl text-base font-bold shadow-elegant"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Publish report"}
          </Button>
        </motion.section>
      )}
    </main>
  );
}
