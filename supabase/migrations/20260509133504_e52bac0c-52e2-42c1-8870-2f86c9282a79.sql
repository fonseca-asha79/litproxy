
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles self select" on public.profiles for select using (auth.uid() = id);
create policy "profiles self update" on public.profiles for update using (auth.uid() = id);

-- Lightning keys
create table public.lightning_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Key',
  api_key text not null,
  is_active boolean not null default true,
  failure_count int not null default 0,
  last_used_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);
alter table public.lightning_keys enable row level security;
create index on public.lightning_keys(user_id, is_active);
create policy "lk select own" on public.lightning_keys for select using (auth.uid() = user_id);
create policy "lk insert own" on public.lightning_keys for insert with check (auth.uid() = user_id);
create policy "lk update own" on public.lightning_keys for update using (auth.uid() = user_id);
create policy "lk delete own" on public.lightning_keys for delete using (auth.uid() = user_id);

-- User settings
create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_model text not null default 'openai/gpt-5-mini',
  proxy_api_key text not null unique default ('lvp_' || replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','')),
  created_at timestamptz not null default now()
);
alter table public.user_settings enable row level security;
create policy "us select own" on public.user_settings for select using (auth.uid() = user_id);
create policy "us update own" on public.user_settings for update using (auth.uid() = user_id);
create policy "us insert own" on public.user_settings for insert with check (auth.uid() = user_id);

-- Request logs
create table public.request_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  model_requested text,
  model_used text,
  lightning_key_id uuid references public.lightning_keys(id) on delete set null,
  lightning_key_label text,
  status text not null,           -- success | error
  http_status int,
  error_message text,
  prompt_tokens int,
  completion_tokens int,
  total_tokens int,
  cost_usd numeric(12,6),
  latency_ms int,
  attempts int default 1,
  attempt_details jsonb,
  created_at timestamptz not null default now()
);
alter table public.request_logs enable row level security;
create index on public.request_logs(user_id, created_at desc);
create policy "rl select own" on public.request_logs for select using (auth.uid() = user_id);
-- inserts happen via service role only

-- Trigger: on new user, create profile + settings
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
