# Real-time Tirana incident ingestion pipeline

A scheduled pipeline that pulls Albanian RSS feeds every 5 min, uses Lovable AI to extract real incidents, geocodes via Nominatim, dedupes, and pushes live to the map / feed / Ask AI via Supabase Realtime.

> Note: this stack is TanStack Start, so the two "Edge Functions" become public TanStack server routes under `src/routes/api/public/`. Same effect — `pg_cron` calls them on schedule. All AI runs through Lovable AI Gateway (no extra keys).

## 1. Database (one migration)

New tables, all RLS-enabled:

- **events** — `id, event_type, severity, title_sq, title_en, summary, location_name, lat, lng, confidence, is_active (bool, default true), source_count (int, default 1), sources (jsonb[]), image_url, status ('unconfirmed'|'confirmed'|'resolved'), created_at, expires_at`. Public SELECT for authenticated; writes via service role only.
- **processed_items** — `link_hash PK, processed_at`. Service-role only.
- **geocode_cache** — `query PK, lat, lng, created_at`. Service-role only.
- **ingestion_log** — `id, run_at, items_fetched, events_created, errors (jsonb), duration_ms`. Authenticated SELECT (so Profile can show last run); service-role write.
- **sources** — `id, url, name, kind ('rss'|'google_news'), enabled bool, created_at`. Authenticated SELECT; admin writes. Seeded with all 12 RSS feeds + 7 Google News queries from your list.
- **user_roles** + `app_role` enum + `has_role()` security-definer fn (proper admin model — required for the admin button + log view).

Enable `ALTER PUBLICATION supabase_realtime ADD TABLE public.events;` so the frontend gets live inserts/updates.

## 2. Server routes (the "edge functions")

`src/routes/api/public/ingest-events.ts` (POST):
1. Load enabled `sources`.
2. `Promise.allSettled` fetch every feed in parallel (10s timeout each). Parse with `fast-xml-parser`.
3. For each item: SHA-256 the link → skip if in `processed_items`; skip if older than 6h.
4. Call Lovable AI (`google/gemini-3-flash-preview`) with the exact extraction prompt from the brief, structured-output Zod schema.
5. Drop if `!is_event`, `confidence < 0.6`, or `location_name == null`.
6. **Geocode** via Nominatim (`User-Agent: TiranaAI/1.0`, 1 req/sec, cached in `geocode_cache`). Discard if outside bbox `lat 41.27–41.40, lng 19.72–19.91`.
7. **Dedupe** vs last 12h: same `event_type` + haversine <300m + word-overlap title similarity >0.65 → update existing row (`source_count += 1`, append to `sources` jsonb).
8. Otherwise insert with `expires_at = now() + interval` per type (traffic 2h, accident 4h, fire 8h, flood 24h, protest 12h, police 4h, power_outage 6h, weather 12h, other 4h).
9. Write to `processed_items` and one `ingestion_log` row at end. Per-feed errors logged but never abort the run.
10. Auth: header `x-cron-secret` matching `CRON_SECRET` env, OR an authenticated admin (for the manual button).

`src/routes/api/public/expire-events.ts` (POST): `UPDATE events SET is_active=false WHERE expires_at < now() AND is_active=true`. Same auth.

## 3. Cron (pg_cron + pg_net)

- `ingest-events` every 5 min
- `expire-events` every 15 min

Both posted with the shared `CRON_SECRET` header.

## 4. Frontend rewrite

- **`src/lib/events.functions.ts`** — new `listActiveEvents()` server fn (returns events ordered critical → warning → info, then `created_at desc`) and `triggerIngestion()` admin-only server fn.
- **Map** (`map.tsx`) and **Feed** (`feed.tsx`): switch from `listReports` / `refreshAIFeed` to the new events query. Subscribe to Realtime on `public.events` and invalidate the query on change. Render `+N sources` badge when `source_count > 1`. Severity mapping: critical → red, warning → amber, info → blue.
- **Ask AI** (`/api/chat`): replace the `reports` grounding query with `events where is_active=true` (last 24h). Update the system prompt to reference "live verified incidents".
- **Profile** (admin only): "Run ingestion now" button + latest `ingestion_log` card (run time, items fetched, events created, errors).
- **Remove all mock/fallback data**: delete `src/lib/ai-feed.functions.ts`, the `refreshAIFeed` interval in `map.tsx`, seed data in `src/lib/seed.functions.ts` that fabricates reports, the `TIRANA_AREAS` jitter generator. The old `reports` table stays (user-submitted reports still work) but the AI-generated path is gone.

## 5. Secrets

Need one new secret: **`CRON_SECRET`** (random string). `LOVABLE_API_KEY` already exists. No Nominatim key needed.

## Technical notes

- Nominatim 1 req/sec is enforced by a simple in-handler `await sleep(1000)` between cache-miss lookups; cache hits are free.
- Word-overlap similarity = `|A ∩ B| / |A ∪ B|` on lowercased tokens ≥3 chars.
- Haversine inline (no dep).
- `fast-xml-parser` handles both RSS and Atom; Google News RSS is RSS 2.0.
- Image: pull from `<enclosure url>` or `<media:content>` when present.
- Admin gate: `has_role(auth.uid(), 'admin')`. You'll need to grant yourself admin once via SQL after the migration (I'll include the grant in a follow-up insert once you tell me your user id, or you can run it).

## Out of scope (ask if you want it)

- Translating non-Albanian feeds (all sources are already Albanian).
- Push notifications for critical events.
- Per-source health dashboard beyond `ingestion_log`.
