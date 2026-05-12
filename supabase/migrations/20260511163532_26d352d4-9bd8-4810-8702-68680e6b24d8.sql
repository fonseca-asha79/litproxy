ALTER TABLE public.request_logs
  ADD COLUMN proxy_key_id uuid;

CREATE INDEX idx_request_logs_proxy_key_id ON public.request_logs(proxy_key_id);
CREATE INDEX idx_request_logs_proxy_key_created ON public.request_logs(proxy_key_id, created_at DESC);