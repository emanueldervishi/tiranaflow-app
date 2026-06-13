ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS ai_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source text;

-- Allow authenticated users to read AI-generated reports (they already can read all reports)
-- Service role bypasses RLS so the server can insert AI reports freely.
CREATE INDEX IF NOT EXISTS reports_ai_generated_created_at_idx
  ON public.reports (ai_generated, created_at DESC);