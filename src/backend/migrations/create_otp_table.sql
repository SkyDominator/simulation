-- Migration script for Supabase
-- Create OTP table
CREATE TABLE IF NOT EXISTS phone_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  attempts SMALLINT NOT NULL DEFAULT 0,
  used BOOLEAN NOT NULL DEFAULT false,
  provider_msg_id TEXT,
  client_ip INET,
  user_agent TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS phone_otps_phone_idx ON phone_otps (phone);
CREATE INDEX IF NOT EXISTS phone_otps_created_at_idx ON phone_otps (created_at);
CREATE INDEX IF NOT EXISTS phone_otps_phone_used_expires_idx ON phone_otps (phone, used, expires_at);
