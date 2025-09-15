# Database Schema Implementation Guide

*Low-level implementation guidance for enterprise-scale database operations*

## Audit Tables for Enterprise Scale

### Administrative Audit Trail

```sql
-- Administrative actions (publish, create, delete)
CREATE TABLE IF NOT EXISTS audit_admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  admin_user_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- 'policy_publish', 'policy_create', 'notice_create', etc.
  resource_type TEXT NOT NULL, -- 'privacy_policy', 'notice', etc.
  resource_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT
);

-- Index for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_admin_actions_user_time 
ON audit_admin_actions (admin_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_admin_actions_resource 
ON audit_admin_actions (resource_type, resource_id, created_at DESC);
```

### User Events Analytics

```sql
-- User events (privacy-aware usage analytics)
CREATE TABLE IF NOT EXISTS audit_user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL, -- Pseudonymous, no direct PII
  event_type TEXT NOT NULL, -- 'page_view', 'session_start', 'simulation_run', etc.
  page_path TEXT, -- Whitelisted paths only
  session_id UUID,
  details JSONB DEFAULT '{}',
  -- No IP storage for privacy
  retention_expires_at TIMESTAMPTZ -- Auto-cleanup field
);

-- Composite index for user analytics
CREATE INDEX IF NOT EXISTS idx_audit_user_events_user_time 
ON audit_user_events (user_id, created_at DESC);

-- Index for cleanup operations
CREATE INDEX IF NOT EXISTS idx_audit_user_events_cleanup 
ON audit_user_events (retention_expires_at) 
WHERE retention_expires_at IS NOT NULL;
```

### Simulation Results History

```sql
-- Optional: store historical simulation outputs if multiple versions need retention beyond latest
CREATE TABLE IF NOT EXISTS simulation_results_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  simulation_id UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  results_version INTEGER NOT NULL DEFAULT 1,
  engine_version TEXT NOT NULL, -- Track simulation engine version
  simulation_results JSONB NOT NULL,
  computation_duration_ms INTEGER,
  -- Retention policy
  archived_at TIMESTAMPTZ,
  retention_expires_at TIMESTAMPTZ
);

-- Index for historical queries
CREATE INDEX IF NOT EXISTS idx_simulation_results_history_sim_version 
ON simulation_results_history (simulation_id, results_version DESC);
```

## Performance Optimization Indexes

### Phone OTP Table Optimization

```sql
-- Composite index for OTP lookup optimization
CREATE INDEX IF NOT EXISTS idx_phone_otps_lookup 
ON phone_otps (phone, used, expires_at) 
WHERE NOT used AND expires_at > now();

-- Index for cleanup of expired OTPs
CREATE INDEX IF NOT EXISTS idx_phone_otps_cleanup 
ON phone_otps (expires_at) 
WHERE expires_at < now();

-- Index for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_phone_otps_rate_limit 
ON phone_otps (phone, created_at DESC);
```

### Simulations Performance Indexes

```sql
-- User simulation listing optimization
CREATE INDEX IF NOT EXISTS idx_simulations_user_recent 
ON simulations (user_id, created_at DESC);

-- Admin monitoring and retention operations
CREATE INDEX IF NOT EXISTS idx_simulations_created_at 
ON simulations (created_at);

-- Plan type analytics
CREATE INDEX IF NOT EXISTS idx_simulations_plan_type 
ON simulations (plan_id, created_at DESC);
```

## Database Triggers and Automation

### Updated Timestamp Triggers

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to relevant tables
CREATE TRIGGER update_privacy_policies_updated_at 
    BEFORE UPDATE ON privacy_policies
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_simulations_updated_at 
    BEFORE UPDATE ON simulations
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_onboarding_updated_at 
    BEFORE UPDATE ON user_onboarding
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

### Audit Trail Triggers

```sql
-- Function to log administrative actions
CREATE OR REPLACE FUNCTION log_admin_action()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert audit record for privacy policy changes
    IF TG_TABLE_NAME = 'privacy_policies' THEN
        INSERT INTO audit_admin_actions (
            admin_user_id, 
            action_type, 
            resource_type, 
            resource_id, 
            details
        ) VALUES (
            COALESCE(NEW.updated_by, OLD.updated_by), -- Assumes updated_by field
            CASE 
                WHEN TG_OP = 'INSERT' THEN 'policy_create'
                WHEN TG_OP = 'UPDATE' AND NEW.published != OLD.published THEN 'policy_publish'
                ELSE 'policy_update'
            END,
            'privacy_policy',
            COALESCE(NEW.id, OLD.id),
            jsonb_build_object(
                'old_version', OLD.version,
                'new_version', NEW.version,
                'published', NEW.published
            )
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Apply audit trigger to privacy policies
CREATE TRIGGER audit_privacy_policy_changes
    AFTER INSERT OR UPDATE ON privacy_policies
    FOR EACH ROW
    EXECUTE FUNCTION log_admin_action();
```

## Data Retention and Cleanup

### Automated Cleanup Functions

```sql
-- Function to clean up expired OTPs
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM phone_otps 
    WHERE expires_at < now() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Function to archive old simulation results
CREATE OR REPLACE FUNCTION archive_old_simulation_results()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Archive simulation results older than 1 year to history table
    WITH archived AS (
        UPDATE simulations 
        SET archived_at = now()
        WHERE created_at < now() - INTERVAL '1 year'
        AND archived_at IS NULL
        RETURNING *
    )
    INSERT INTO simulation_results_history (
        simulation_id, results_version, engine_version, 
        simulation_results, archived_at
    )
    SELECT 
        id, 1, 'v1.0', simulation_results, archived_at
    FROM archived
    WHERE simulation_results IS NOT NULL;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    RETURN archived_count;
END;
$$ language 'plpgsql';
```

## Row Level Security (RLS) Policies

### User Data Protection

```sql
-- Enable RLS on user tables
ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own simulations
CREATE POLICY simulation_user_access ON simulations
    FOR ALL USING (
        user_id = (SELECT auth.uid())
    );

-- Policy: Users can only access their own onboarding data
CREATE POLICY onboarding_user_access ON user_onboarding
    FOR ALL USING (
        user_id = (SELECT auth.uid())
    );

-- Policy: Admins can access all data (requires admin check in application)
CREATE POLICY admin_full_access ON simulations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE user_id = (SELECT auth.uid())
        )
    );
```

### Audit Data Protection

```sql
-- Enable RLS on audit tables
ALTER TABLE audit_user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_admin_actions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own events (for transparency)
CREATE POLICY user_events_self_access ON audit_user_events
    FOR SELECT USING (
        user_id = (SELECT auth.uid())
    );

-- Policy: Only admins can view admin audit logs
CREATE POLICY admin_audit_access ON audit_admin_actions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE user_id = (SELECT auth.uid())
        )
    );
```

## Migration Best Practices

### Version-Safe Schema Changes

```sql
-- Example: Adding new metadata column safely
-- Step 1: Add column with default
ALTER TABLE simulations 
ADD COLUMN metadata JSONB DEFAULT '{}';

-- Step 2: Backfill existing data (if needed)
UPDATE simulations 
SET metadata = '{}'::jsonb 
WHERE metadata IS NULL;

-- Step 3: Add constraint (in later migration)
ALTER TABLE simulations 
ALTER COLUMN metadata SET NOT NULL;
```

### Index Creation Strategy

```sql
-- Create indexes concurrently to avoid blocking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_simulations_performance 
ON simulations (user_id, created_at DESC, plan_id);

-- Verify index creation succeeded before dropping old indexes
-- Check pg_stat_user_indexes for index usage before dropping
```

## Implementation Notes

- **Keep triggers simple and idempotent** - Avoid complex business logic in database triggers
- **Monitor index usage** - Use `pg_stat_user_indexes` to track index effectiveness
- **Partition large tables** - Consider partitioning audit tables by date for enterprise scale
- **Use materialized views** - For complex analytics queries that don't need real-time data
- **Implement connection pooling** - Use PgBouncer or similar for high-concurrency scenarios

## Supabase-Specific Considerations

- **RLS Policy Testing**: Test policies thoroughly in staging environment
- **Function Security**: Use `security definer` carefully for privileged operations
- **Real-time Subscriptions**: Consider performance impact of real-time features at scale
- **Storage Integration**: Use Supabase Storage for large simulation exports/imports
- **Edge Functions**: Consider Supabase Edge Functions for data processing pipelines


## For testing
- Use mock data generation tools to create realistic datasets for load testing
- Use mock DB tables to simulate high-concurrency scenarios
- Implement automated tests for RLS policies