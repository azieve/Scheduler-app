#!/usr/bin/env node

/**
 * Debug Script: Check existing users and accounts
 */

const { query } = require('../config/database');

async function debugUsers() {
  console.log('🔍 Debugging user and account data...');
  
  try {
    // Check users table
    console.log('\n👤 Users in database:');
    const usersResult = await query(`
      SELECT id, email, first_name, last_name, google_id, 
             CASE WHEN google_access_token IS NOT NULL THEN 'YES' ELSE 'NO' END as has_token,
             created_at
      FROM users 
      ORDER BY created_at DESC
    `);
    
    if (usersResult.rows.length === 0) {
      console.log('  No users found');
    } else {
      usersResult.rows.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} (${user.first_name} ${user.last_name})`);
        console.log(`     ID: ${user.id}`);
        console.log(`     Google ID: ${user.google_id || 'None'}`);
        console.log(`     Has Token: ${user.has_token}`);
        console.log(`     Created: ${user.created_at}`);
        console.log('');
      });
    }

    // Check accounts table
    console.log('\n🏢 Accounts in database:');
    const accountsResult = await query(`
      SELECT a.id, a.google_email, a.display_name, a.is_primary, a.is_active,
             u.email as user_email
      FROM accounts a
      JOIN users u ON a.user_id = u.id
      ORDER BY a.is_primary DESC, a.created_at DESC
    `);
    
    if (accountsResult.rows.length === 0) {
      console.log('  No accounts found');
    } else {
      accountsResult.rows.forEach((account, index) => {
        console.log(`  ${index + 1}. ${account.google_email} (${account.display_name})`);
        console.log(`     User: ${account.user_email}`);
        console.log(`     Primary: ${account.is_primary ? 'YES' : 'NO'}`);
        console.log(`     Active: ${account.is_active ? 'YES' : 'NO'}`);
        console.log('');
      });
    }

    // Check calendars table
    console.log('\n📅 Calendars in database:');
    const calendarsResult = await query(`
      SELECT c.id, c.calendar_name, c.is_primary, c.is_active,
             a.google_email as account_email, u.email as user_email
      FROM calendars c
      JOIN accounts a ON c.account_id = a.id
      JOIN users u ON c.user_id = u.id
      ORDER BY c.is_primary DESC, c.created_at DESC
    `);
    
    if (calendarsResult.rows.length === 0) {
      console.log('  No calendars found');
    } else {
      calendarsResult.rows.forEach((calendar, index) => {
        console.log(`  ${index + 1}. ${calendar.calendar_name}`);
        console.log(`     Account: ${calendar.account_email}`);
        console.log(`     User: ${calendar.user_email}`);
        console.log(`     Primary: ${calendar.is_primary ? 'YES' : 'NO'}`);
        console.log(`     Active: ${calendar.is_active ? 'YES' : 'NO'}`);
        console.log('');
      });
    }

    // Check if tables exist
    console.log('\n📋 Table structure check:');
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'accounts', 'calendars', 'user_calendars', 'user_google_accounts')
      ORDER BY table_name
    `);
    
    console.log('  Existing tables:', tablesResult.rows.map(r => r.table_name).join(', '));

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
debugUsers()
  .then(() => {
    console.log('✅ Debug completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Debug failed:', error);
    process.exit(1);
  });