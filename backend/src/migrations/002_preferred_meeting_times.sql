-- Add preferred meeting times to user_settings table
ALTER TABLE user_settings 
ADD COLUMN preferred_meeting_times JSONB DEFAULT '{
    "monday": [],
    "tuesday": [],
    "wednesday": [],
    "thursday": [],
    "friday": [],
    "saturday": [],
    "sunday": []
}';

-- Update existing records with default empty preferred times
UPDATE user_settings 
SET preferred_meeting_times = '{
    "monday": [],
    "tuesday": [],
    "wednesday": [],
    "thursday": [],
    "friday": [],
    "saturday": [],
    "sunday": []
}'
WHERE preferred_meeting_times IS NULL;

-- Example of preferred_meeting_times structure:
-- {
--   "monday": [
--     {"start": "09:00", "end": "11:00", "label": "Morning Focus"},
--     {"start": "14:00", "end": "16:00", "label": "Afternoon Meetings"}
--   ],
--   "tuesday": [
--     {"start": "10:00", "end": "12:00", "label": "Mid-Morning"}
--   ],
--   "wednesday": [],
--   "thursday": [
--     {"start": "13:00", "end": "17:00", "label": "Afternoon Block"}
--   ],
--   "friday": [],
--   "saturday": [],
--   "sunday": []
-- }