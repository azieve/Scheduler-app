-- Create sync_locks table for preventing concurrent operations
-- This ensures transactional integrity during account operations

CREATE TABLE IF NOT EXISTS sync_locks (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  operation VARCHAR(50) NOT NULL,
  locked_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '5 minutes',
  
  -- Prevent multiple locks of same type for same user
  UNIQUE(user_id, operation)
);

-- Index for efficient lock checking
CREATE INDEX IF NOT EXISTS idx_sync_locks_user_operation ON sync_locks(user_id, operation);
CREATE INDEX IF NOT EXISTS idx_sync_locks_expires_at ON sync_locks(expires_at);

-- Automatic cleanup of expired locks
CREATE OR REPLACE FUNCTION cleanup_expired_locks() RETURNS void AS $$
BEGIN
  DELETE FROM sync_locks WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE sync_locks IS 'Prevents concurrent calendar sync and account operations to ensure data consistency';
COMMENT ON COLUMN sync_locks.operation IS 'Type of operation: account_deletion, calendar_sync, account_addition';
COMMENT ON COLUMN sync_locks.expires_at IS 'Safety mechanism - locks expire after 5 minutes to prevent deadlocks';