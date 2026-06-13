
-- ENUMS
CREATE TYPE public.report_type AS ENUM (
  'traffic_accident','road_block','protest','heavy_traffic','construction',
  'police_activity','fire','flood','dangerous_area','broken_road','other'
);
CREATE TYPE public.severity_level AS ENUM ('low','serious','critical');
CREATE TYPE public.vote_kind AS ENUM ('confirm','inaccurate');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  trusted_reporter_score INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- REPORTS
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type public.report_type NOT NULL,
  severity public.severity_level NOT NULL,
  description TEXT,
  image_url TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmations INT NOT NULL DEFAULT 0,
  inaccurate_count INT NOT NULL DEFAULT 0
);
CREATE INDEX reports_created_at_idx ON public.reports (created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reports readable by authenticated" ON public.reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own reports" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own reports" ON public.reports FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Users delete own reports" ON public.reports FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- REPORT VOTES
CREATE TABLE public.report_votes (
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote public.vote_kind NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (report_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_votes TO authenticated;
GRANT ALL ON public.report_votes TO service_role;
ALTER TABLE public.report_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Votes readable by authenticated" ON public.report_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own votes" ON public.report_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own votes" ON public.report_votes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own votes" ON public.report_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- TRIGGER: auto profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- TRIGGER: update counters on vote
CREATE OR REPLACE FUNCTION public.handle_report_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  reporter UUID;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF NEW.vote = 'confirm' THEN
      UPDATE public.reports SET confirmations = confirmations + 1 WHERE id = NEW.report_id RETURNING created_by INTO reporter;
      IF reporter IS NOT NULL THEN
        UPDATE public.profiles SET trusted_reporter_score = trusted_reporter_score + 1 WHERE id = reporter;
      END IF;
    ELSE
      UPDATE public.reports SET inaccurate_count = inaccurate_count + 1 WHERE id = NEW.report_id;
    END IF;
  ELSIF (TG_OP = 'UPDATE') AND (OLD.vote <> NEW.vote) THEN
    IF NEW.vote = 'confirm' THEN
      UPDATE public.reports SET confirmations = confirmations + 1, inaccurate_count = GREATEST(inaccurate_count - 1, 0) WHERE id = NEW.report_id;
    ELSE
      UPDATE public.reports SET inaccurate_count = inaccurate_count + 1, confirmations = GREATEST(confirmations - 1, 0) WHERE id = NEW.report_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_report_vote
  AFTER INSERT OR UPDATE ON public.report_votes
  FOR EACH ROW EXECUTE FUNCTION public.handle_report_vote();

-- STORAGE policies for report-photos
CREATE POLICY "Authenticated can read report photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'report-photos');
CREATE POLICY "Users upload to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'report-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'report-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
