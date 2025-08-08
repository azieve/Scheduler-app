#!/usr/bin/env node

/**
 * Test API endpoints to debug calendar page issues
 */

const fetch = require('node-fetch');

// Mock authentication - we'll need to manually get a token
async function testAPI() {
  console.log('🧪 Testing Calendar API endpoints...');
  
  const baseURL = 'http://localhost:3001';
  
  // Test endpoints without auth first
  console.log('\n📋 Testing endpoints without authentication:');
  
  try {
    // Test /api/accounts
    console.log('  Testing /api/accounts...');
    const accountsResponse = await fetch(`${baseURL}/api/accounts`);
    const accountsData = await accountsResponse.text();
    console.log(`    Status: ${accountsResponse.status}`);
    console.log(`    Response: ${accountsData}`);
    
    // Test /api/calendars
    console.log('  Testing /api/calendars...');
    const calendarsResponse = await fetch(`${baseURL}/api/calendars`);
    const calendarsData = await calendarsResponse.text();
    console.log(`    Status: ${calendarsResponse.status}`);
    console.log(`    Response: ${calendarsData}`);
    
    // Test old calendar endpoint for comparison
    console.log('  Testing /api/calendar/calendars...');
    const oldCalendarsResponse = await fetch(`${baseURL}/api/calendar/calendars`);
    const oldCalendarsData = await oldCalendarsResponse.text();
    console.log(`    Status: ${oldCalendarsResponse.status}`);
    console.log(`    Response: ${oldCalendarsData}`);
    
  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}

testAPI()
  .then(() => {
    console.log('\n✅ API test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 API test failed:', error);
    process.exit(1);
  });