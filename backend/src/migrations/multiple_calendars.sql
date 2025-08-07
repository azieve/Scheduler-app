-- Multiple Calendars Support Migration
-- Add support for users to connect and manage multiple Google calendars

-- Create calendars table to store user's connected calendars
CREATE TABLE IF NOT EXISTS user_calendars (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    google_calendar_id VARCHAR(255) NOT NULL,
    calendar_name VARCHAR(255) NOT NULL,
    calendar_description TEXT,
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    background_color VARCHAR(7),  -- Hex color code
    foreground_color VARCHAR(7),  -- Hex color code
    access_role VARCHAR(50) DEFAULT 'owner',
    timezone VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique combination of user and Google calendar ID
    UNIQUE(user_id, google_calendar_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_calendars_user_id ON user_calendars(user_id);
CREATE INDEX IF NOT EXISTS idx_user_calendars_primary ON user_calendars(user_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_user_calendars_active ON user_calendars(user_id, is_active);

-- Create function to ensure only one primary calendar per user
CREATE OR REPLACE FUNCTION ensure_single_primary_calendar()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting a calendar as primary, unset all other primary calendars for this user
    IF NEW.is_primary = true THEN
        UPDATE user_calendars 
        SET is_primary = false, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = NEW.user_id 
        AND id != COALESCE(NEW.id, -1)
        AND is_primary = true;
    END IF;
    
    -- If this is the first calendar for the user, automatically make it primary
    IF NOT EXISTS (
        SELECT 1 FROM user_calendars 
        WHERE user_id = NEW.user_id 
        AND id != COALESCE(NEW.id, -1)
    ) THEN
        NEW.is_primary = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce single primary calendar
DROP TRIGGER IF EXISTS trigger_ensure_single_primary_calendar ON user_calendars;
CREATE TRIGGER trigger_ensure_single_primary_calendar
    BEFORE INSERT OR UPDATE ON user_calendars
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_primary_calendar();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_calendar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_calendar_updated_at ON user_calendars;
CREATE TRIGGER trigger_update_calendar_updated_at
    BEFORE UPDATE ON user_calendars
    FOR EACH ROW
    EXECUTE FUNCTION update_calendar_updated_at();

-- Add calendar_id to bookings table to track which calendar was used for booking
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS calendar_id INTEGER REFERENCES user_calendars(id) ON DELETE SET NULL;

-- Create index for calendar_id in bookings
CREATE INDEX IF NOT EXISTS idx_bookings_calendar_id ON bookings(calendar_id);

-- Insert sample data for testing (optional - can be removed in production)
-- This will be populated dynamically when users connect their Google calendars

COMMENT ON TABLE user_calendars IS 'Stores users connected Google calendars with primary calendar designation';
COMMENT ON COLUMN user_calendars.google_calendar_id IS 'Google Calendar ID from Google Calendar API';
COMMENT ON COLUMN user_calendars.is_primary IS 'Designates the primary calendar where new bookings will be created';
COMMENT ON COLUMN user_calendars.is_active IS 'Controls whether this calendar is checked for availability';
COMMENT ON COLUMN user_calendars.access_role IS 'Users access role for this calendar (owner, reader, writer)';