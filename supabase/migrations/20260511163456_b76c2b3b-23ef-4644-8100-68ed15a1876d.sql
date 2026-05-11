-- Multi-proxy-key support with optional scopes and rate limits

CREATE TABLE public.proxy_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Key',
  api_key text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  allowed_models text[] NOT NULL DEFAULT '{}',
  rate_limit_per_min integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE INDEX idx_proxy_keys_user_id ON public.proxy_keys(user_id);
CREATE INDEX idx_proxy_keys_api_key ON public.proxy_keys(api_key);

ALTER TABLE public.proxy_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pk select own" ON public.proxy_keys
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pk insert own" ON public.proxy_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pk update own" ON public.proxy_keys
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "pk delete own" ON public.proxy_keys
  FOR DELETE USING (auth.uid() = user_id);

-- Seed: copy each user's existing proxy_api_key into the new table as "Default"
INSERT INTO public.proxy_keys (user_id, name, api_key, is_active, created_at)
SELECT user_id, 'Default', proxy_api_key, true, created_at
FROM public.user_settings
WHERE proxy_api_key IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.proxy_keys pk WHERE pk.api_key = user_settings.proxy_api_key
  );

-- Auto-create a "Default" proxy key when a new user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));

  INSERT INTO public.user_settings (user_id) VALUES (new.id);

  INSERT INTO public.proxy_keys (user_id, name, api_key)
  VALUES (
    new.id,
    'Default',
    'lvp_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  );

  RETURN new;
END;
$$;