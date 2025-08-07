-- Enhanced Meeting Types with Advanced Features
-- Add new columns for advanced meeting type functionality

-- Meeting type categories and options
ALTER TABLE meeting_types 
ADD COLUMN IF NOT EXISTS meeting_type VARCHAR(50) DEFAULT 'video_call', -- 'video_call', 'phone_call', 'in_person'
ADD COLUMN IF NOT EXISTS video_provider VARCHAR(50) DEFAULT 'google_meet', -- 'google_meet', 'zoom', 'teams', 'custom'
ADD COLUMN IF NOT EXISTS custom_meeting_link VARCHAR(1000) DEFAULT '',
ADD COLUMN IF NOT EXISTS auto_generate_link BOOLEAN DEFAULT true,

-- Phone call settings
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50) DEFAULT '',
ADD COLUMN IF NOT EXISTS dial_in_number VARCHAR(50) DEFAULT '',
ADD COLUMN IF NOT EXISTS phone_instructions TEXT DEFAULT '',

-- In-person meeting settings  
ADD COLUMN IF NOT EXISTS meeting_address TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS meeting_room VARCHAR(255) DEFAULT '',
ADD COLUMN IF NOT EXISTS parking_instructions TEXT DEFAULT '',

-- Meeting instructions and preparation
ADD COLUMN IF NOT EXISTS pre_meeting_instructions TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS post_meeting_instructions TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS attendee_questions JSONB DEFAULT '[]', -- Array of custom questions for attendees
ADD COLUMN IF NOT EXISTS require_confirmation BOOLEAN DEFAULT false,

-- Gmail notification customization
ADD COLUMN IF NOT EXISTS gmail_notifications JSONB DEFAULT '{
    "enabled": true,
    "reminder_minutes": [60, 15],
    "custom_title": "",
    "custom_description": "",
    "include_meeting_link": true,
    "include_agenda": true,
    "include_preparation_notes": true
}'::jsonb,

-- Additional settings
ADD COLUMN IF NOT EXISTS max_attendees INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS allow_guests BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS calendar_visibility VARCHAR(20) DEFAULT 'busy', -- 'busy', 'free', 'private'
ADD COLUMN IF NOT EXISTS booking_cancellation_policy TEXT DEFAULT '';

-- Create index for meeting type filtering
CREATE INDEX IF NOT EXISTS idx_meeting_types_type ON meeting_types(meeting_type, is_active);
CREATE INDEX IF NOT EXISTS idx_meeting_types_video_provider ON meeting_types(video_provider) WHERE meeting_type = 'video_call';

-- Create trigger to validate meeting type settings
CREATE OR REPLACE FUNCTION validate_meeting_type_settings()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate video call settings
    IF NEW.meeting_type = 'video_call' THEN
        IF NEW.auto_generate_link = false AND (NEW.custom_meeting_link IS NULL OR NEW.custom_meeting_link = '') THEN
            RAISE EXCEPTION 'Video call meetings must have either auto-generated links or custom meeting links';
        END IF;
    END IF;
    
    -- Validate phone call settings
    IF NEW.meeting_type = 'phone_call' THEN
        IF NEW.phone_number IS NULL OR NEW.phone_number = '' THEN
            RAISE EXCEPTION 'Phone call meetings must have a phone number';
        END IF;
    END IF;
    
    -- Validate in-person settings
    IF NEW.meeting_type = 'in_person' THEN
        IF NEW.meeting_address IS NULL OR NEW.meeting_address = '' THEN
            RAISE EXCEPTION 'In-person meetings must have a meeting address';
        END IF;
    END IF;
    
    -- Validate attendee limits
    IF NEW.max_attendees < 1 THEN
        RAISE EXCEPTION 'Maximum attendees must be at least 1';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER validate_meeting_type_settings_trigger
    BEFORE INSERT OR UPDATE ON meeting_types
    FOR EACH ROW
    EXECUTE FUNCTION validate_meeting_type_settings();

-- Update existing meeting_types to have default advanced settings
UPDATE meeting_types 
SET 
    meeting_type = 'video_call',
    video_provider = 'google_meet',
    auto_generate_link = true,
    gmail_notifications = '{
        "enabled": true,
        "reminder_minutes": [60, 15],
        "custom_title": "",
        "custom_description": "",
        "include_meeting_link": true,
        "include_agenda": true,
        "include_preparation_notes": true
    }'::jsonb
WHERE meeting_type IS NULL;