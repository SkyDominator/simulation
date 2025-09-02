-- Create table for versioned privacy policies
create table if not exists privacy_policies (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  locale text not null default 'ko-KR',
  content text not null,
  published boolean not null default false,
  effective_date date null,
  last_updated date not null default current_date,
  created_by text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unique version per locale
create unique index if not exists privacy_policies_version_locale_uidx
  on privacy_policies (version, locale);

-- -- Helpful lookup indexes
-- create index if not exists privacy_policies_published_locale_idx
--   on privacy_policies (published, locale, effective_date desc, updated_at desc);

-- Trigger to update updated_at automatically (Postgres function assumed present in Supabase)
-- If not present, you can create it:
-- create or replace function set_updated_at()
-- returns trigger as $$ begin new.updated_at = now(); return new; end; $$ language plpgsql;
do $$ begin
  create trigger privacy_policies_set_updated_at
  before update on privacy_policies
  for each row
  execute function set_updated_at();
exception when duplicate_object then null; end $$;
