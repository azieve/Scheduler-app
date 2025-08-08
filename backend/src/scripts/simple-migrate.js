#!/usr/bin/env node

/**
 * Simple Migration Script: Ensure User -> Account hierarchy for existing users
 */

const { query } = require('../config/database');

async function simpleMigration() {
  console.log('🚀 Starting simple migration...');
  
  try {
    // Step 1: Create tables if they don't exist (simplified version)
    console.log('📋 Creating accounts table...');
    await query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL,
        google_id VARCHAR(255) NOT NULL,
        google_email VARCHAR(255) NOT NULL,
        display_name VARCHAR(255),
        google_access_token TEXT NOT NULL,
        google_refresh_token TEXT,
        account_type VARCHAR(50) DEFAULT 'personal',
        is_primary BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_user_google_email UNIQUE(user_id, google_email),
        CONSTRAINT unique_user_google_id UNIQUE(user_id, google_id)
      );
    `);
    console.log('✅ Accounts table ready');

    console.log('📋 Creating calendars table...');
    await query(`
      CREATE TABLE IF NOT EXISTS calendars (
        id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL,
        user_id UUID NOT NULL,
        google_calendar_id VARCHAR(255) NOT NULL,
        calendar_name VARCHAR(255) NOT NULL,
        calendar_description TEXT,
        background_color VARCHAR(7),
        foreground_color VARCHAR(7),
        access_role VARCHAR(50),
        timezone VARCHAR(50),
        is_primary BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_account_google_calendar UNIQUE(account_id, google_calendar_id),
        CONSTRAINT unique_user_google_calendar UNIQUE(user_id, google_calendar_id)
      );
    `);
    console.log('✅ Calendars table ready');

    // Step 2: Find users who need accounts created
    console.log('🔍 Checking for users needing accounts...');
    const usersResult = await query(`
      SELECT u.id, u.email, u.google_id, u.google_access_token, u.google_refresh_token, u.first_name, u.last_name
      FROM users u 
      LEFT JOIN accounts a ON u.id = a.user_id AND a.is_primary = true
      WHERE u.google_id IS NOT NULL 
        AND u.google_access_token IS NOT NULL
        AND a.id IS NULL
    `);

    const usersToMigrate = usersResult.rows;
    console.log(`📊 Found ${usersToMigrate.length} users needing accounts`);

    if (usersToMigrate.length === 0) {
      console.log('✅ All users already have accounts');
      return;
    }

    // Step 3: Create primary accounts for each user
    for (const user of usersToMigrate) {
      console.log(`👤 Creating account for user: ${user.email}`);
      
      try {
        const accountResult = await query(`
          INSERT INTO accounts (
            user_id, google_id, google_email, display_name,
            google_access_token, google_refresh_token,
            account_type, is_primary, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id
        `, [
          user.id,
          user.google_id,
          user.email,
          `${user.first_name} ${user.last_name}`.trim(),
          user.google_access_token,
          user.google_refresh_token,
          'personal',
          true, // is_primary
          true  // is_active
        ]);
        
        console.log(`  ✅ Created account (ID: ${accountResult.rows[0].id})`);
        
      } catch (error) {
        console.error(`  ❌ Failed to create account for ${user.email}: ${error.message}`);
      }
    }

    console.log('✅ Simple migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
simpleMigration()
  .then(() => {
    console.log('✨ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });