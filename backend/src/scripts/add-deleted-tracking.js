#!/usr/bin/env node

/**
 * Add deleted calendar tracking to prevent recreating intentionally deleted calendars
 */

const { query } = require('../config/database');

async function addDeletedTracking() {
  console.log('🗑️ Adding deleted calendar tracking...');
  
  try {
    // Add a table to track deleted calendars
    console.log('📋 Creating deleted_calendars table...');
    await query(`
      CREATE TABLE IF NOT EXISTS deleted_calendars (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL,
        account_id INTEGER NOT NULL,
        google_calendar_id VARCHAR(255) NOT NULL,
        calendar_name VARCHAR(255) NOT NULL,
        deleted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_by_user BOOLEAN DEFAULT true,
        
        -- Constraints
        CONSTRAINT unique_user_google_calendar_deleted UNIQUE(user_id, google_calendar_id),
        
        -- Foreign keys (optional, for cleanup)
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      );
    `);
    console.log('✅ deleted_calendars table created');

    // Create index for performance
    console.log('📋 Creating indexes...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_deleted_calendars_user_id ON deleted_calendars(user_id);
      CREATE INDEX IF NOT EXISTS idx_deleted_calendars_google_id ON deleted_calendars(user_id, google_calendar_id);
    `);
    console.log('✅ Indexes created');

    console.log('✅ Deleted calendar tracking setup completed!');
    
  } catch (error) {
    console.error('❌ Failed to add deleted tracking:', error);
    throw error;
  }
}

// Run the script
addDeletedTracking()
  .then(() => {
    console.log('✨ Setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  });