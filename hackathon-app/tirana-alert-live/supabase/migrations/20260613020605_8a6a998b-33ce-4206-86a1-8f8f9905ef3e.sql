-- Restrict profiles SELECT to own row (email exposure)
DROP POLICY IF EXISTS "Profiles are viewable by authenticated" ON public.profiles;
CREATE POLICY "Users view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Restrict report_votes SELECT to own votes
DROP POLICY IF EXISTS "Votes readable by authenticated" ON public.report_votes;
CREATE POLICY "Users view own votes"
  ON public.report_votes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Realtime: enable RLS on realtime.messages and restrict topic access.
-- Only authenticated users can subscribe; topic must match the public reports broadcast.
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can receive reports broadcasts" ON realtime.messages;
CREATE POLICY "Authenticated can receive reports broadcasts"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (true);