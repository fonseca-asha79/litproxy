ALTER TABLE public.request_logs
  ADD COLUMN IF NOT EXISTS request_body jsonb,
  ADD COLUMN IF NOT EXISTS caller_user_agent text;