-- Store Web Push subscriptions per user/device
CREATE TABLE public.push_subscriptions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint     TEXT NOT NULL UNIQUE,
  p256dh       TEXT NOT NULL,
  auth_key     TEXT NOT NULL,
  user_agent   TEXT,
  is_ios       BOOLEAN DEFAULT FALSE NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_used_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Fast lookups when sending to all of a user's devices
CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
