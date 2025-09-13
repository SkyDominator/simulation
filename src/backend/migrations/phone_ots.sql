CREATE TABLE phone_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,               -- E.164 normalized format
  code_hash TEXT NOT NULL,           -- HMAC(secret, phone|code)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,   -- usually now() + interval '5 minutes'
  attempts SMALLINT NOT NULL DEFAULT 0,
  used BOOLEAN NOT NULL DEFAULT false,
  provider_msg_id TEXT,              -- for troubleshooting with NHN Cloud
  client_ip INET,                    -- for rate limiting and security
  user_agent TEXT                    -- for troubleshooting
);
-- CREATE INDEX ON phone_otps (phone);
-- CREATE INDEX ON phone_otps (created_at);
-- CREATE INDEX ON phone_otps (phone, used, expires_at);