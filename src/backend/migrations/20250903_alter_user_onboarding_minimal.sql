-- Minimize user_onboarding to only required flags and consent_version
-- Safe to run repeatedly
alter table if exists public.user_onboarding
  drop column if exists user_hash,
  drop column if exists phone_last4,
  drop column if exists consent_given_at;

-- Drop legacy index if present
drop index if exists idx_user_onboarding_user_hash;
