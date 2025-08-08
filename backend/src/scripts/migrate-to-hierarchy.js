#!/usr/bin/env node

/**
 * Migration Script: Convert existing user data to User -> Account -> Calendar hierarchy
 * 
 * This script:
 * 1. Runs the database schema migration
 * 2. Migrates existing users to have primary accounts
 * 3. Migrates existing calendar data to the new structure
 */

const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');

async function runMigration() {
  console.log('🚀 Starting hierarchy migration...');
  
  try {
    // Step 1: Read and execute the schema migration
    const migrationSQLPath = path.join(__dirname, '../migrations/001_hierarchy_schema.sql');
    const migrationSQL = fs.readFileSync(migrationSQLPath, 'utf8');
    
    console.log('📋 Applying database schema changes...');
    await query(migrationSQL);
    console.log('✅ Database schema updated');
    
    // Step 2: Check for existing users who need migration
    console.log('🔍 Checking for users needing migration...');
    
    const usersResult = await query(`
      SELECT u.id, u.email, u.google_id, u.google_access_token, u.google_refresh_token, u.first_name, u.last_name
      FROM users u 
      LEFT JOIN accounts a ON u.id = a.user_id AND a.is_primary = true
      WHERE u.google_id IS NOT NULL 
        AND u.google_access_token IS NOT NULL
        AND a.id IS NULL
    `);
    
    const usersToMigrate = usersResult.rows;
    console.log(`📊 Found ${usersToMigrate.length} users needing migration`);
    
    if (usersToMigrate.length === 0) {
      console.log('✅ No users need migration - all users already have accounts');
      return;
    }
    
    // Step 3: Migrate each user
    for (const user of usersToMigrate) {
      console.log(`👤 Migrating user: ${user.email}`);
      
      try {
        // Create primary account for the user
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
        
        const accountId = accountResult.rows[0].id;
        console.log(`  ✅ Created primary account (ID: ${accountId})`);
        
        // Check if there are any old calendar entries to migrate
        const oldCalendarsResult = await query(`
          SELECT * FROM user_calendars 
          WHERE user_id = $1 OR google_account_id = $2
        `, [user.id, user.google_id]);
        
        if (oldCalendarsResult.rows.length > 0) {
          console.log(`  📅 Migrating ${oldCalendarsResult.rows.length} calendars`);
          
          for (const oldCalendar of oldCalendarsResult.rows) {
            try {
              // Create new calendar entry
              await query(`
                INSERT INTO calendars (
                  account_id, user_id, google_calendar_id, calendar_name,
                  calendar_description, background_color, foreground_color,
                  access_role, timezone, is_primary, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT DO NOTHING
              `, [
                accountId,
                user.id,
                oldCalendar.google_calendar_id,
                oldCalendar.calendar_name,
                oldCalendar.calendar_description,
                oldCalendar.background_color,
                oldCalendar.foreground_color,
                oldCalendar.access_role,
                oldCalendar.timezone,
                oldCalendar.is_primary || false,
                oldCalendar.is_active !== false
              ]);
              
              console.log(`    ✅ Migrated calendar: ${oldCalendar.calendar_name}`);
            } catch (calError) {
              console.log(`    ⚠️  Failed to migrate calendar ${oldCalendar.calendar_name}: ${calError.message}`);
            }
          }
        } else {
          console.log(`  📅 No old calendars found for user`);
        }
        
      } catch (userError) {
        console.error(`❌ Failed to migrate user ${user.email}: ${userError.message}`);
      }
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`  • Users migrated: ${usersToMigrate.length}`);
    console.log(`  • New accounts created: ${usersToMigrate.length}`);
    console.log('\n🎉 Your system is now ready to use the new calendar management features!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('\n✨ Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };