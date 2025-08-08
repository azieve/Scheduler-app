const express = require('express');
const router = express.Router();
const Calendar = require('../models/Calendar');
const Account = require('../models/Account');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const token = req.cookies.auth_token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Apply authentication middleware to all calendar routes
router.use(authenticateToken);

// ==============================================================================
// CALENDAR MANAGEMENT ENDPOINTS
// ==============================================================================

/**
 * GET /api/calendars - Get all calendars for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { activeOnly, accountId } = req.query;
    
    let calendars;
    if (accountId) {
      // Get calendars for specific account
      const account = await Account.findById(parseInt(accountId));
      if (!account || account.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to account'
        });
      }
      
      calendars = await Calendar.findByAccountId(account.id, activeOnly === 'true');
    } else {
      // Get all user calendars
      calendars = await Calendar.findByUserId(userId, activeOnly === 'true');
    }
    
    res.json({
      success: true,
      data: {
        calendars: calendars.map(cal => cal.toJSONWithContext())
      }
    });
  } catch (error) {
    console.error('Error fetching calendars:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calendars'
    });
  }
});

/**
 * GET /api/calendars/:id - Get specific calendar details
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const calendarId = parseInt(req.params.id);
    
    const calendar = await Calendar.findById(calendarId);
    if (!calendar) {
      return res.status(404).json({
        success: false,
        error: 'Calendar not found'
      });
    }
    
    // Verify ownership
    if (calendar.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Get account info
    const account = await calendar.getAccount();
    
    res.json({
      success: true,
      data: {
        calendar: calendar.toJSONWithContext(),
        account: account ? account.toJSON() : null
      }
    });
  } catch (error) {
    console.error('Error fetching calendar details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calendar details'
    });
  }
});

/**
 * PUT /api/calendars/:id - Update calendar settings
 */
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const calendarId = parseInt(req.params.id);
    const { calendarName, calendarDescription, isActive } = req.body;
    
    const calendar = await Calendar.findById(calendarId);
    if (!calendar) {
      return res.status(404).json({
        success: false,
        error: 'Calendar not found'
      });
    }
    
    // Verify ownership
    if (calendar.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Build update data
    const updateData = {};
    if (calendarName !== undefined) updateData.calendar_name = calendarName;
    if (calendarDescription !== undefined) updateData.calendar_description = calendarDescription;
    if (isActive !== undefined) updateData.is_active = isActive;
    
    // Update calendar
    await calendar.update(updateData);
    
    res.json({
      success: true,
      data: {
        calendar: calendar.toJSONWithContext()
      },
      message: 'Calendar updated successfully'
    });
  } catch (error) {
    console.error('Error updating calendar:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update calendar'
    });
  }
});

/**
 * POST /api/calendars/:id/set-primary - Set calendar as primary
 */
router.post('/:id/set-primary', async (req, res) => {
  try {
    const userId = req.user.id;
    const calendarId = parseInt(req.params.id);
    
    const calendar = await Calendar.findById(calendarId);
    if (!calendar) {
      return res.status(404).json({
        success: false,
        error: 'Calendar not found'
      });
    }
    
    // Verify ownership
    if (calendar.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Set as primary (database trigger will unset others)
    await calendar.setPrimary();
    
    res.json({
      success: true,
      data: {
        calendar: calendar.toJSONWithContext()
      },
      message: `Calendar "${calendar.calendarName}" set as primary`
    });
  } catch (error) {
    console.error('Error setting primary calendar:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to set primary calendar'
    });
  }
});

/**
 * POST /api/calendars/:id/toggle-active - Toggle calendar active status
 */
router.post('/:id/toggle-active', async (req, res) => {
  try {
    const userId = req.user.id;
    const calendarId = parseInt(req.params.id);
    
    const calendar = await Calendar.findById(calendarId);
    if (!calendar) {
      return res.status(404).json({
        success: false,
        error: 'Calendar not found'
      });
    }
    
    // Verify ownership
    if (calendar.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Toggle active status
    await calendar.toggleActive();
    
    res.json({
      success: true,
      data: {
        calendar: calendar.toJSONWithContext()
      },
      message: `Calendar "${calendar.calendarName}" ${calendar.isActive ? 'activated' : 'deactivated'}`
    });
  } catch (error) {
    console.error('Error toggling calendar active status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to toggle calendar status'
    });
  }
});

/**
 * DELETE /api/calendars/:id - Delete calendar
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const calendarId = parseInt(req.params.id);
    
    const calendar = await Calendar.findById(calendarId);
    if (!calendar) {
      return res.status(404).json({
        success: false,
        error: 'Calendar not found'
      });
    }
    
    // Verify ownership
    if (calendar.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Check if this is the only active calendar
    if (calendar.isActive) {
      const userActiveCalendars = await Calendar.findByUserId(userId, true);
      if (userActiveCalendars.length <= 1) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete the only active calendar. Please add another calendar first.'
        });
      }
    }
    
    // Delete calendar
    const result = await calendar.delete();
    
    res.json({
      success: true,
      data: result,
      message: result.wasPrimary 
        ? `Primary calendar "${result.deletedCalendar}" deleted. Please select a new primary calendar.`
        : `Calendar "${result.deletedCalendar}" deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting calendar:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete calendar'
    });
  }
});

// ==============================================================================
// CALENDAR SYNC ENDPOINTS
// ==============================================================================

/**
 * POST /api/calendars/sync - Sync all calendars for user
 */
router.post('/sync', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all active accounts for the user
    const accounts = await Account.findByUserId(userId, true);
    
    if (accounts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No active Google accounts found. Please connect a Google account first.'
      });
    }
    
    let syncResults = [];
    let totalSynced = 0;
    let errors = [];
    
    // Sync calendars for each account
    for (const account of accounts) {
      try {
        console.log(`🔄 Syncing calendars for account: ${account.googleEmail}`);
        
        // Setup OAuth2 client with account credentials
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET
        );
        
        oauth2Client.setCredentials({
          access_token: account.googleAccessToken,
          refresh_token: account.googleRefreshToken
        });
        
        // Get calendar list from Google
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        const response = await calendar.calendarList.list();
        
        const googleCalendars = response.data.items || [];
        console.log(`📅 Found ${googleCalendars.length} calendars for ${account.googleEmail}`);
        
        let accountSynced = 0;
        
        // Create or update each calendar
        for (const googleCalendar of googleCalendars) {
          try {
            await Calendar.createOrUpdateFromGoogle(account.id, userId, googleCalendar);
            accountSynced++;
            totalSynced++;
          } catch (calError) {
            console.error(`Error syncing calendar ${googleCalendar.summary}:`, calError);
            errors.push(`Failed to sync calendar "${googleCalendar.summary}": ${calError.message}`);
          }
        }
        
        syncResults.push({
          accountEmail: account.googleEmail,
          calendarsFound: googleCalendars.length,
          calendarsSynced: accountSynced,
          success: true
        });
        
      } catch (accountError) {
        console.error(`Error syncing account ${account.googleEmail}:`, accountError);
        syncResults.push({
          accountEmail: account.googleEmail,
          calendarsFound: 0,
          calendarsSynced: 0,
          success: false,
          error: accountError.message
        });
        errors.push(`Failed to sync account "${account.googleEmail}": ${accountError.message}`);
      }
    }
    
    console.log(`✅ Calendar sync complete. Total synced: ${totalSynced}`);
    
    res.json({
      success: true,
      data: {
        totalAccountsProcessed: accounts.length,
        totalCalendarsSynced: totalSynced,
        syncResults,
        errors: errors.length > 0 ? errors : undefined
      },
      message: `Successfully synced ${totalSynced} calendars from ${accounts.length} account(s)`
    });
    
  } catch (error) {
    console.error('Error during calendar sync:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync calendars'
    });
  }
});

/**
 * POST /api/calendars/sync/:accountId - Sync calendars for specific account
 */
router.post('/sync/:accountId', async (req, res) => {
  try {
    const userId = req.user.id;
    const accountId = parseInt(req.params.accountId);
    
    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }
    
    // Verify ownership
    if (account.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    if (!account.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Cannot sync calendars for inactive account'
      });
    }
    
    console.log(`🔄 Syncing calendars for specific account: ${account.googleEmail}`);
    
    // Setup OAuth2 client with account credentials
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    oauth2Client.setCredentials({
      access_token: account.googleAccessToken,
      refresh_token: account.googleRefreshToken
    });
    
    // Get calendar list from Google
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const response = await calendar.calendarList.list();
    
    const googleCalendars = response.data.items || [];
    console.log(`📅 Found ${googleCalendars.length} calendars for ${account.googleEmail}`);
    
    let syncedCount = 0;
    let errors = [];
    
    // Create or update each calendar
    for (const googleCalendar of googleCalendars) {
      try {
        await Calendar.createOrUpdateFromGoogle(account.id, userId, googleCalendar);
        syncedCount++;
      } catch (calError) {
        console.error(`Error syncing calendar ${googleCalendar.summary}:`, calError);
        errors.push(`Failed to sync calendar "${googleCalendar.summary}": ${calError.message}`);
      }
    }
    
    console.log(`✅ Account calendar sync complete. Synced: ${syncedCount}/${googleCalendars.length}`);
    
    res.json({
      success: true,
      data: {
        accountEmail: account.googleEmail,
        calendarsFound: googleCalendars.length,
        calendarsSynced: syncedCount,
        errors: errors.length > 0 ? errors : undefined
      },
      message: `Successfully synced ${syncedCount} calendars for account "${account.googleEmail}"`
    });
    
  } catch (error) {
    console.error('Error syncing account calendars:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync account calendars'
    });
  }
});

module.exports = router;