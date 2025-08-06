-- Update bookings table to match the Booking model
ALTER TABLE bookings 
DROP COLUMN IF EXISTS scheduled_at,
DROP COLUMN IF EXISTS duration_minutes;

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS attendee_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'UTC';

-- Update the status check constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check 
CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no-show'));

-- Update indexes
DROP INDEX IF EXISTS idx_bookings_scheduled_at;
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time);