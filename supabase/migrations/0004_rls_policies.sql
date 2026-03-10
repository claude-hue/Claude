-- Row Level Security policies

-- profiles: users can read and update their own profile
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- push_subscriptions: users manage their own subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON public.push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- notifications_log: fully restricted — only accessible via service_role
-- (Edge Functions and server Route Handlers use the service_role key)
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct user access to notification log"
  ON public.notifications_log FOR ALL
  USING (FALSE);
