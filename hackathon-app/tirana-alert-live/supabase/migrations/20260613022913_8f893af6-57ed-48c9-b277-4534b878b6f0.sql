
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Events
CREATE TYPE public.event_type AS ENUM ('accident','traffic','fire','flood','protest','police','power_outage','weather','other');
CREATE TYPE public.event_severity AS ENUM ('critical','warning','info');
CREATE TYPE public.event_status AS ENUM ('unconfirmed','confirmed','resolved');

CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type public.event_type NOT NULL,
  severity public.event_severity NOT NULL,
  title_sq TEXT NOT NULL,
  title_en TEXT NOT NULL,
  summary TEXT,
  location_name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  confidence REAL NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  source_count INTEGER NOT NULL DEFAULT 1,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_url TEXT,
  status public.event_status NOT NULL DEFAULT 'unconfirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX events_active_idx ON public.events (is_active, created_at DESC);
CREATE INDEX events_geo_idx ON public.events (lat, lng);
CREATE INDEX events_type_time_idx ON public.events (event_type, created_at DESC);
GRANT SELECT ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events readable by authenticated" ON public.events FOR SELECT TO authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER TABLE public.events REPLICA IDENTITY FULL;

-- Processed items
CREATE TABLE public.processed_items (
  link_hash TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.processed_items TO service_role;
ALTER TABLE public.processed_items ENABLE ROW LEVEL SECURITY;

-- Geocode cache
CREATE TABLE public.geocode_cache (
  query TEXT PRIMARY KEY,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.geocode_cache TO service_role;
ALTER TABLE public.geocode_cache ENABLE ROW LEVEL SECURITY;

-- Ingestion log
CREATE TABLE public.ingestion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  items_fetched INTEGER NOT NULL DEFAULT 0,
  events_created INTEGER NOT NULL DEFAULT 0,
  events_deduped INTEGER NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  duration_ms INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX ingestion_log_run_at_idx ON public.ingestion_log (run_at DESC);
GRANT SELECT ON public.ingestion_log TO authenticated;
GRANT ALL ON public.ingestion_log TO service_role;
ALTER TABLE public.ingestion_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view ingestion log" ON public.ingestion_log FOR SELECT TO authenticated USING (true);

-- Sources
CREATE TYPE public.source_kind AS ENUM ('rss','google_news');
CREATE TABLE public.sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kind public.source_kind NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sources TO authenticated;
GRANT ALL ON public.sources TO service_role;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sources readable by authenticated" ON public.sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage sources" ON public.sources FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed sources
INSERT INTO public.sources (url, name, kind) VALUES
  ('https://top-channel.tv/feed/', 'Top Channel', 'rss'),
  ('https://www.balkanweb.com/feed/', 'Balkanweb', 'rss'),
  ('https://www.reporter.al/feed/', 'Reporter.al', 'rss'),
  ('https://shqiptarja.com/feed', 'Shqiptarja', 'rss'),
  ('https://a2news.com/feed/', 'A2 News', 'rss'),
  ('https://www.panorama.com.al/feed/', 'Panorama', 'rss'),
  ('https://www.gazetatema.net/feed/', 'Gazeta Tema', 'rss'),
  ('https://opinion.al/feed/', 'Opinion.al', 'rss'),
  ('https://www.gsh.al/feed/', 'Gazeta Shqiptare', 'rss'),
  ('https://www.syri.net/feed/', 'Syri.net', 'rss'),
  ('https://www.tiranapost.al/feed/', 'Tirana Post', 'rss'),
  ('https://www.lapsi.al/feed/', 'Lapsi.al', 'rss'),
  ('https://news.google.com/rss/search?q=Tiran%C3%AB+aksident&hl=sq&gl=AL&ceid=AL:sq', 'Google News · aksident', 'google_news'),
  ('https://news.google.com/rss/search?q=Tiran%C3%AB+trafik&hl=sq&gl=AL&ceid=AL:sq', 'Google News · trafik', 'google_news'),
  ('https://news.google.com/rss/search?q=Tiran%C3%AB+zjarr&hl=sq&gl=AL&ceid=AL:sq', 'Google News · zjarr', 'google_news'),
  ('https://news.google.com/rss/search?q=Tiran%C3%AB+protest%C3%AB&hl=sq&gl=AL&ceid=AL:sq', 'Google News · protestë', 'google_news'),
  ('https://news.google.com/rss/search?q=Tiran%C3%AB+polici&hl=sq&gl=AL&ceid=AL:sq', 'Google News · polici', 'google_news'),
  ('https://news.google.com/rss/search?q=Tiran%C3%AB+p%C3%ABrmbytje&hl=sq&gl=AL&ceid=AL:sq', 'Google News · përmbytje', 'google_news'),
  ('https://news.google.com/rss/search?q=Tiran%C3%AB+rrug%C3%AB+e+bllokuar&hl=sq&gl=AL&ceid=AL:sq', 'Google News · rrugë e bllokuar', 'google_news');
