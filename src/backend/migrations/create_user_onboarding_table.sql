-- Create a mapping table to link pre-auth identifiers (user_hash/phone) to Supabase user_id
-- and persist onboarding completion flags.

create table if not exists public.user_onboarding (
  user_id uuid primary key,
  user_hash text,
  phone_last4 text,
  whitelist_passed boolean default false,
  otp_verified boolean default false,
  consent_version text,
  consent_given_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_user_onboarding_user_hash on public.user_onboarding (user_hash);
