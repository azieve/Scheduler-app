-- Add missing columns to meeting_types table
ALTER TABLE meeting_types 
ADD COLUMN IF NOT EXISTS location VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS meeting_link VARCHAR(1000) DEFAULT '',
ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#4285F4';