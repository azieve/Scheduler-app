-- Multiple Google Accounts Support Migration
-- Allow users to connect multiple Google accounts (personal, work, etc.)

-- Create google_accounts table to store multiple Google account tokens
CREATE TABLE IF NOT EXISTS user_google_accounts (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    google_id VARCHAR(255) NOT NULL,
    google_email VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    google_access_token TEXT NOT NULL,
    google_refresh_token TEXT NOT NULL,
    account_type VARCHAR(50) DEFAULT 'personal', -- personal, work, other
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique combination of user and Google account
    UNIQUE(user_id, google_id),
    UNIQUE(user_id, google_email)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_google_accounts_user_id ON user_google_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_google_accounts_primary ON user_google_accounts(user_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_user_google_accounts_active ON user_google_accounts(user_id, is_active);

-- Create function to ensure only one primary Google account per user
CREATE OR REPLACE FUNCTION ensure_single_primary_google_account()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting a Google account as primary, unset all other primary accounts for this user
    IF NEW.is_primary = true THEN
        UPDATE user_google_accounts 
        SET is_primary = false, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = NEW.user_id 
        AND id != COALESCE(NEW.id, -1)
        AND is_primary = true;
    END IF;
    
    -- If this is the first Google account for the user, automatically make it primary
    IF NOT EXISTS (
        SELECT 1 FROM user_google_accounts 
        WHERE user_id = NEW.user_id 
        AND id != COALESCE(NEW.id, -1)
    ) THEN
        NEW.is_primary = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce single primary Google account
DROP TRIGGER IF EXISTS trigger_ensure_single_primary_google_account ON user_google_accounts;
CREATE TRIGGER trigger_ensure_single_primary_google_account
    BEFORE INSERT OR UPDATE ON user_google_accounts
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_primary_google_account();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_google_account_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_google_account_updated_at ON user_google_accounts;
CREATE TRIGGER trigger_update_google_account_updated_at
    BEFORE UPDATE ON user_google_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_google_account_updated_at();

-- Add google_account_id to user_calendars to track which Google account each calendar belongs to
ALTER TABLE user_calendars 
ADD COLUMN IF NOT EXISTS google_account_id INTEGER REFERENCES user_google_accounts(id) ON DELETE CASCADE;

-- Create index for google_account_id in user_calendars
CREATE INDEX IF NOT EXISTS idx_user_calendars_google_account_id ON user_calendars(google_account_id);

-- Migrate existing Google auth data from users table to user_google_accounts table
-- This will copy the existing Google tokens to the new table structure
INSERT INTO user_google_accounts (user_id, google_id, google_email, display_name, google_access_token, google_refresh_token, is_primary)
SELECT 
    u.id,
    u.google_id,
    u.email,
    CONCAT(u.first_name, ' ', u.last_name),
    u.google_access_token,
    u.google_refresh_token,
    true
FROM users u
WHERE u.google_id IS NOT NULL 
AND u.google_access_token IS NOT NULL 
AND u.google_refresh_token IS NOT NULL
ON CONFLICT (user_id, google_id) DO NOTHING;

-- Update existing calendars to link to the migrated Google account
UPDATE user_calendars 
SET google_account_id = (
    SELECT uga.id 
    FROM user_google_accounts uga 
    WHERE uga.user_id = user_calendars.user_id 
    AND uga.is_primary = true
    LIMIT 1
)
WHERE google_account_id IS NULL;

COMMENT ON TABLE user_google_accounts IS 'Stores multiple Google account credentials per user for accessing different sets of calendars';
COMMENT ON COLUMN user_calendars.google_account_id IS 'Links each calendar to its originating Google account';
COMMENT ON COLUMN user_google_accounts.account_type IS 'User-defined label for account type (personal, work, etc.)';
COMMENT ON COLUMN user_google_accounts.is_primary IS 'Designates which Google account is used by default for new operations';