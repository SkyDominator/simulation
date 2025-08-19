-- Adds memo column for user-defined notes on simulations
ALTER TABLE public.simulations ADD COLUMN IF NOT EXISTS memo text;
