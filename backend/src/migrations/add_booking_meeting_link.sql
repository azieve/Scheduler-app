-- Add meeting_link field to bookings table for storing generated meeting links
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS meeting_link VARCHAR(1000) DEFAULT '';

-- Create index for performance when searching by meeting link
CREATE INDEX IF NOT EXISTS idx_bookings_meeting_link ON bookings(meeting_link);