-- Create user_settings table for availability management
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Working Hours (stored as JSON for flexibility)
    working_hours JSONB DEFAULT '{
        "monday": {"enabled": true, "start": "09:00", "end": "17:00"},
        "tuesday": {"enabled": true, "start": "09:00", "end": "17:00"},
        "wednesday": {"enabled": true, "start": "09:00", "end": "17:00"},
        "thursday": {"enabled": true, "start": "09:00", "end": "17:00"},
        "friday": {"enabled": true, "start": "09:00", "end": "17:00"},
        "saturday": {"enabled": false, "start": "09:00", "end": "17:00"},
        "sunday": {"enabled": false, "start": "09:00", "end": "17:00"}
    }',
    
    -- Timezone settings
    timezone VARCHAR(100) DEFAULT 'UTC',
    
    -- Global buffer time preferences (in minutes)
    default_buffer_before INTEGER DEFAULT 0,
    default_buffer_after INTEGER DEFAULT 0,
    
    -- Minimum notice required for bookings (in minutes)
    minimum_notice_minutes INTEGER DEFAULT 30,
    
    -- Maximum advance booking allowed (in days)
    max_advance_days INTEGER DEFAULT 60,
    
    -- Booking preferences
    allow_back_to_back_bookings BOOLEAN DEFAULT true,
    auto_confirm_bookings BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id)
);

-- Create blocked_times table for specific unavailable periods
CREATE TABLE IF NOT EXISTS blocked_times (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Time period
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    
    -- Optional details
    title VARCHAR(255),
    description TEXT,
    
    -- Recurrence settings (for recurring blocks)
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern JSONB, -- {"type": "weekly", "days": ["monday", "wednesday"]}
    recurrence_end_date TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_times_user_id ON blocked_times(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_times_date_range ON blocked_times(user_id, start_time, end_time);

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_settings_updated_at();

CREATE TRIGGER update_blocked_times_updated_at
    BEFORE UPDATE ON blocked_times
    FOR EACH ROW
    EXECUTE FUNCTION update_user_settings_updated_at();