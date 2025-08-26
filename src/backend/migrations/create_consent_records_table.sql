-- Create the consent_records table
CREATE TABLE IF NOT EXISTS public.consent_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    consent_type TEXT NOT NULL, -- e.g., 'privacy_policy', 'terms_of_service'
    consent_version TEXT NOT NULL, -- e.g., '1.0'
    consent_given_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT
);

-- Create an index on user_id for faster lookups
-- CREATE INDEX IF NOT EXISTS consent_records_user_id_idx ON public.consent_records (user_id);

-- Set up Row Level Security (RLS) policies
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

-- Users can read their own consent records
CREATE POLICY consent_records_select_policy
    ON public.consent_records
    FOR SELECT
    USING (auth.uid() = user_id);
    
-- Users can only create their own consent records
CREATE POLICY consent_records_insert_policy
    ON public.consent_records
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT ON public.consent_records TO authenticated;
