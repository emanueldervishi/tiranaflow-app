create extension if not exists pgcrypto;

do $$ begin
  create type public.report_type as enum (
    'traffic_accident','road_block','protest','heavy_traffic','construction',
    'police_activity','fire','flood','dangerous_area','broken_road','other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.severity_level as enum ('low','serious','critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.vote_kind as enum ('confirm','inaccurate');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.event_type as enum ('accident','traffic','fire','flood','protest','police','power_outage','weather','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.event_severity as enum ('critical','warning','info');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.event_status as enum ('unconfirmed','confirmed','resolved');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.app_role as enum ('admin','user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.source_kind as enum ('rss','google_news');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  avatar_url text,
  trusted_reporter_score integer not null default 0,
  confirmed_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists name text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists trusted_reporter_score integer not null default 0;
alter table public.profiles add column if not exists confirmed_count integer not null default 0;
alter table public.profiles add column if not exists created_at timestamptz not null default now();

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type public.report_type not null,
  severity public.severity_level not null,
  description text,
  image_url text,
  latitude double precision not null,
  longitude double precision not null,
  address text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  confirmations integer not null default 0,
  inaccurate_count integer not null default 0,
  ai_generated boolean not null default false,
  source text
);

alter table public.reports add column if not exists confirmations integer not null default 0;
alter table public.reports add column if not exists inaccurate_count integer not null default 0;
alter table public.reports add column if not exists ai_generated boolean not null default false;
alter table public.reports add column if not exists source text;

create index if not exists reports_created_at_idx on public.reports (created_at desc);
create index if not exists reports_geo_idx on public.reports (latitude, longitude);

create table if not exists public.report_votes (
  report_id uuid not null references public.reports(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vote public.vote_kind not null,
  created_at timestamptz not null default now(),
  primary key (report_id, user_id)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  event_type public.event_type not null,
  severity public.event_severity not null,
  title_sq text not null,
  title_en text not null,
  summary text,
  location_name text not null,
  lat double precision not null,
  lng double precision not null,
  confidence real not null default 0,
  is_active boolean not null default true,
  source_count integer not null default 1,
  sources jsonb not null default '[]'::jsonb,
  image_url text,
  status public.event_status not null default 'unconfirmed',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists events_active_idx on public.events (is_active, created_at desc);
create index if not exists events_geo_idx on public.events (lat, lng);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  name text not null,
  kind public.source_kind not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.processed_items (
  link_hash text primary key,
  processed_at timestamptz not null default now()
);

create table if not exists public.geocode_cache (
  query text primary key,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

create table if not exists public.ingestion_log (
  id uuid primary key default gen_random_uuid(),
  run_at timestamptz not null default now(),
  items_fetched integer not null default 0,
  events_created integer not null default 0,
  events_deduped integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  duration_ms integer not null default 0
);

insert into public.sources (url, name, kind) values
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
  ('https://news.google.com/rss/search?q=Tiran%C3%AB+aksident&hl=sq&gl=AL&ceid=AL:sq', 'Google News - accident', 'google_news'),
  ('https://news.google.com/rss/search?q=Tiran%C3%AB+trafik&hl=sq&gl=AL&ceid=AL:sq', 'Google News - traffic', 'google_news'),
  ('https://news.google.com/rss/search?q=Tiran%C3%AB+zjarr&hl=sq&gl=AL&ceid=AL:sq', 'Google News - fire', 'google_news'),
  ('https://news.google.com/rss/search?q=Tiran%C3%AB+protest%C3%AB&hl=sq&gl=AL&ceid=AL:sq', 'Google News - protest', 'google_news'),
  ('https://news.google.com/rss/search?q=Tiran%C3%AB+polici&hl=sq&gl=AL&ceid=AL:sq', 'Google News - police', 'google_news'),
  ('https://news.google.com/rss/search?q=Tiran%C3%AB+p%C3%ABrmbytje&hl=sq&gl=AL&ceid=AL:sq', 'Google News - flood', 'google_news')
on conflict (url) do update set name = excluded.name, kind = excluded.kind;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create or replace function public.handle_tiranaflow_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  ) on conflict (id) do update set
    email = excluded.email,
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);
  return new;
end;
$$;

drop trigger if exists on_tiranaflow_auth_user_created on auth.users;
create trigger on_tiranaflow_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_tiranaflow_new_user();

insert into public.profiles (id, name, email, avatar_url)
select id,
  coalesce(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  email,
  coalesce(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture')
from auth.users
on conflict (id) do nothing;

create or replace function public.handle_tiranaflow_report_vote()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare reporter uuid;
begin
  if tg_op = 'INSERT' then
    if new.vote = 'confirm' then
      update public.reports set confirmations = confirmations + 1 where id = new.report_id returning created_by into reporter;
      if reporter is not null then
        update public.profiles
        set trusted_reporter_score = trusted_reporter_score + 1,
            confirmed_count = confirmed_count + 1
        where id = reporter;
      end if;
    else
      update public.reports set inaccurate_count = inaccurate_count + 1 where id = new.report_id;
    end if;
  elsif tg_op = 'UPDATE' and old.vote <> new.vote then
    if new.vote = 'confirm' then
      update public.reports set confirmations = confirmations + 1, inaccurate_count = greatest(inaccurate_count - 1, 0) where id = new.report_id;
    else
      update public.reports set inaccurate_count = inaccurate_count + 1, confirmations = greatest(confirmations - 1, 0) where id = new.report_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_tiranaflow_report_vote on public.report_votes;
create trigger on_tiranaflow_report_vote
  after insert or update on public.report_votes
  for each row execute function public.handle_tiranaflow_report_vote();

alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.report_votes enable row level security;
alter table public.events enable row level security;
alter table public.user_roles enable row level security;
alter table public.sources enable row level security;
alter table public.processed_items enable row level security;
alter table public.geocode_cache enable row level security;
alter table public.ingestion_log enable row level security;

drop policy if exists "tiranaflow_profiles_select" on public.profiles;
create policy "tiranaflow_profiles_select" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "tiranaflow_profiles_update" on public.profiles;
create policy "tiranaflow_profiles_update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "tiranaflow_reports_select" on public.reports;
create policy "tiranaflow_reports_select" on public.reports for select to authenticated using (true);
drop policy if exists "tiranaflow_reports_insert" on public.reports;
create policy "tiranaflow_reports_insert" on public.reports for insert to authenticated with check (auth.uid() = created_by);
drop policy if exists "tiranaflow_reports_update" on public.reports;
create policy "tiranaflow_reports_update" on public.reports for update to authenticated using (auth.uid() = created_by) with check (auth.uid() = created_by);
drop policy if exists "tiranaflow_reports_delete" on public.reports;
create policy "tiranaflow_reports_delete" on public.reports for delete to authenticated using (auth.uid() = created_by);
drop policy if exists "tiranaflow_votes_select" on public.report_votes;
create policy "tiranaflow_votes_select" on public.report_votes for select to authenticated using (auth.uid() = user_id);
drop policy if exists "tiranaflow_votes_insert" on public.report_votes;
create policy "tiranaflow_votes_insert" on public.report_votes for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "tiranaflow_votes_update" on public.report_votes;
create policy "tiranaflow_votes_update" on public.report_votes for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "tiranaflow_events_select" on public.events;
create policy "tiranaflow_events_select" on public.events for select to authenticated using (true);
drop policy if exists "tiranaflow_roles_select" on public.user_roles;
create policy "tiranaflow_roles_select" on public.user_roles for select to authenticated using (auth.uid() = user_id);
drop policy if exists "tiranaflow_sources_select" on public.sources;
create policy "tiranaflow_sources_select" on public.sources for select to authenticated using (true);
drop policy if exists "tiranaflow_ingestion_log_select" on public.ingestion_log;
create policy "tiranaflow_ingestion_log_select" on public.ingestion_log for select to authenticated using (true);

grant select, insert, update, delete on public.reports to authenticated;
grant select, insert, update on public.report_votes to authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.events, public.user_roles to authenticated;
grant select on public.sources, public.ingestion_log to authenticated;
grant all on public.events, public.sources, public.processed_items, public.geocode_cache, public.ingestion_log to service_role;
grant all on public.profiles, public.reports, public.report_votes, public.user_roles to service_role;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos', 'report-photos', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "tiranaflow_report_photos_read" on storage.objects;
create policy "tiranaflow_report_photos_read" on storage.objects for select to authenticated
using (bucket_id = 'report-photos');
drop policy if exists "tiranaflow_report_photos_insert" on storage.objects;
create policy "tiranaflow_report_photos_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'report-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "tiranaflow_report_photos_delete" on storage.objects;
create policy "tiranaflow_report_photos_delete" on storage.objects for delete to authenticated
using (bucket_id = 'report-photos' and (storage.foldername(name))[1] = auth.uid()::text);

do $$ begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reports'
  ) then alter publication supabase_realtime add table public.reports; end if;
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'events'
  ) then alter publication supabase_realtime add table public.events; end if;
end $$;

alter table public.reports replica identity full;
alter table public.events replica identity full;
