-- ReadyToMeet.me Hierarchy Schema Migration
-- This migration establishes the proper User -> Account -> Calendar hierarchy

-- ==============================================================================
-- PHASE 1: CREATE CORE TABLES WITH PROPER HIERARCHY
-- ==============================================================================

-- Drop existing tables that conflict with new hierarchy (in correct order)
DROP TABLE IF EXISTS sync_locks CASCADE;
DROP TABLE IF EXISTS user_calendars CASCADE;
DROP TABLE IF EXISTS user_google_accounts CASCADE;

-- Users table (already exists, but ensure proper structure)
-- Note: We'll keep the existing users table and update it if needed
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255), -- For non-Google users in future
    google_id VARCHAR(255), -- For primary Google account link
    google_access_token TEXT, -- For primary account tokens
    google_refresh_token TEXT, -- For primary account tokens
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    username VARCHAR(50) -- Legacy field
);

-- Accounts table (Google accounts connected to user)
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    google_id VARCHAR(255) NOT NULL,
    google_email VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    google_access_token TEXT NOT NULL,
    google_refresh_token TEXT,
    account_type VARCHAR(50) DEFAULT 'personal', -- 'personal', 'work', 'other'
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints to ensure data integrity
    CONSTRAINT unique_user_google_email UNIQUE(user_id, google_email),
    CONSTRAINT unique_user_google_id UNIQUE(user_id, google_id)
);

-- Calendars table (belongs to accounts)
CREATE TABLE calendars (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    google_calendar_id VARCHAR(255) NOT NULL,
    calendar_name VARCHAR(255) NOT NULL,
    calendar_description TEXT,
    background_color VARCHAR(7), -- Hex color code
    foreground_color VARCHAR(7), -- Hex color code
    access_role VARCHAR(50), -- 'owner', 'writer', 'reader'
    timezone VARCHAR(50),
    is_primary BOOLEAN DEFAULT false, -- Primary calendar for new bookings
    is_active BOOLEAN DEFAULT true, -- Include in availability checks
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints to ensure data integrity
    CONSTRAINT unique_account_google_calendar UNIQUE(account_id, google_calendar_id),
    CONSTRAINT unique_user_google_calendar UNIQUE(user_id, google_calendar_id)
);

-- ==============================================================================
-- PHASE 2: CREATE INDEXES FOR PERFORMANCE
-- ==============================================================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;

-- Account indexes
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_google_email ON accounts(google_email);
CREATE INDEX IF NOT EXISTS idx_accounts_active ON accounts(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_accounts_primary ON accounts(user_id, is_primary) WHERE is_primary = true;

-- Calendar indexes
CREATE INDEX IF NOT EXISTS idx_calendars_account_id ON calendars(account_id);
CREATE INDEX IF NOT EXISTS idx_calendars_user_id ON calendars(user_id);
CREATE INDEX IF NOT EXISTS idx_calendars_active ON calendars(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_calendars_primary ON calendars(user_id, is_primary) WHERE is_primary = true;

-- ==============================================================================
-- PHASE 3: CREATE CONSTRAINTS TO ENFORCE BUSINESS RULES
-- ==============================================================================

-- Ensure exactly one primary account per user
CREATE UNIQUE INDEX idx_one_primary_account_per_user 
ON accounts(user_id) WHERE is_primary = true;

-- Ensure at most one primary calendar per user
CREATE UNIQUE INDEX idx_one_primary_calendar_per_user 
ON calendars(user_id) WHERE is_primary = true;

-- ==============================================================================
-- PHASE 4: CREATE FUNCTIONS AND TRIGGERS
-- ==============================================================================

-- Function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-updating timestamps
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_calendars_updated_at
    BEFORE UPDATE ON calendars
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to prevent deletion of primary accounts
CREATE OR REPLACE FUNCTION prevent_primary_account_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_primary = true THEN
        RAISE EXCEPTION 'Cannot delete primary account. Primary accounts are protected and cannot be removed.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent primary account deletion
CREATE TRIGGER trigger_prevent_primary_account_deletion
    BEFORE DELETE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION prevent_primary_account_deletion();

-- Function to ensure primary account consistency
CREATE OR REPLACE FUNCTION ensure_primary_account_consistency()
RETURNS TRIGGER AS $$
BEGIN
    -- When setting an account as primary, unset all other primary accounts for this user
    IF NEW.is_primary = true AND (TG_OP = 'INSERT' OR OLD.is_primary = false) THEN
        UPDATE accounts 
        SET is_primary = false 
        WHERE user_id = NEW.user_id AND id != NEW.id AND is_primary = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for primary account consistency
CREATE TRIGGER trigger_ensure_primary_account_consistency
    BEFORE INSERT OR UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION ensure_primary_account_consistency();

-- Function to ensure primary calendar consistency
CREATE OR REPLACE FUNCTION ensure_primary_calendar_consistency()
RETURNS TRIGGER AS $$
BEGIN
    -- When setting a calendar as primary, unset all other primary calendars for this user
    IF NEW.is_primary = true AND (TG_OP = 'INSERT' OR OLD.is_primary = false) THEN
        UPDATE calendars 
        SET is_primary = false 
        WHERE user_id = NEW.user_id AND id != NEW.id AND is_primary = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for primary calendar consistency
CREATE TRIGGER trigger_ensure_primary_calendar_consistency
    BEFORE INSERT OR UPDATE ON calendars
    FOR EACH ROW
    EXECUTE FUNCTION ensure_primary_calendar_consistency();

-- ==============================================================================
-- PHASE 5: CREATE SYNC LOCKS TABLE (FOR CONCURRENCY CONTROL)
-- ==============================================================================

-- Recreate sync_locks table for the new hierarchy
CREATE TABLE sync_locks (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    operation VARCHAR(50) NOT NULL,
    locked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP + INTERVAL '5 minutes',
    
    -- Prevent multiple locks of same type for same user
    UNIQUE(user_id, operation)
);

-- Sync locks indexes
CREATE INDEX idx_sync_locks_user_operation ON sync_locks(user_id, operation);
CREATE INDEX idx_sync_locks_expires_at ON sync_locks(expires_at);

-- Function to cleanup expired locks
CREATE OR REPLACE FUNCTION cleanup_expired_locks() 
RETURNS void AS $$
BEGIN
    DELETE FROM sync_locks WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- PHASE 6: ADD COMMENTS FOR DOCUMENTATION
-- ==============================================================================

-- Table comments
COMMENT ON TABLE users IS 'ReadyToMeet.me user accounts (top level of hierarchy)';
COMMENT ON TABLE accounts IS 'Google accounts connected to users (middle level of hierarchy)';
COMMENT ON TABLE calendars IS 'Individual calendars from Google accounts (bottom level of hierarchy)';
COMMENT ON TABLE sync_locks IS 'Prevents concurrent operations during account/calendar management';

-- Column comments for key relationships
COMMENT ON COLUMN accounts.user_id IS 'References the ReadyToMeet.me user who owns this Google account';
COMMENT ON COLUMN accounts.is_primary IS 'True for the Google account used to log into ReadyToMeet.me (exactly one per user)';
COMMENT ON COLUMN accounts.account_type IS 'Type of account: personal, work, or other';

COMMENT ON COLUMN calendars.account_id IS 'References the Google account this calendar belongs to';
COMMENT ON COLUMN calendars.user_id IS 'References the ReadyToMeet.me user (denormalized for performance)';
COMMENT ON COLUMN calendars.is_primary IS 'True for the calendar where new bookings are created (at most one per user)';
COMMENT ON COLUMN calendars.is_active IS 'True if this calendar should be checked for availability conflicts';

-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================

-- Log successful migration
DO $$
BEGIN
    RAISE NOTICE 'ReadyToMeet.me hierarchy schema migration completed successfully!';
    RAISE NOTICE 'Created tables: users (updated), accounts, calendars, sync_locks';
    RAISE NOTICE 'Created triggers: timestamp updates, primary account/calendar consistency, account deletion protection';
    RAISE NOTICE 'Hierarchy: User -> Account -> Calendar';
END $$;