-- Audit log for all notifications sent (or attempted)
CREATE TABLE public.notifications_log (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  body         TEXT,
  url          TEXT,
  trigger_type TEXT CHECK (trigger_type IN ('user_action', 'server_event', 'scheduled')),
  status       TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_notifications_log_user_id ON public.notifications_log(user_id);
CREATE INDEX idx_notifications_log_status ON public.notifications_log(status);
