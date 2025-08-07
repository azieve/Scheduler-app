const express = require('express');
const router = express.Router();
const calendarService = require('../services/calendarService');
const Calendar = require('../models/Calendar');
const orphanedCleanupService = require('../services/orphanedCalendarCleanup');
const jwt = require('jsonwebtoken');

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

// Get user's calendars with automatic orphaned calendar cleanup
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { sync, skipCleanup } = req.query;
    
    // Step 1: Automatic orphaned calendar cleanup (unless explicitly skipped)
    let cleanupResult = null;
    if (skipCleanup !== 'true') {
      try {
        console.log(`🧹 Running automatic orphaned calendar cleanup for user ${userId}`);
        cleanupResult = await orphanedCleanupService.cleanupOrphanedCalendars(userId);
        
        if (cleanupResult.orphansFound > 0) {
          console.log(`✅ Cleanup completed: ${cleanupResult.orphansRemoved} removed, ${cleanupResult.orphansKept} kept`);
        }
      } catch (cleanupError) {
        console.error('Warning: Orphaned calendar cleanup failed:', cleanupError);
        // Continue with normal flow even if cleanup fails
      }
    }
    
    // Step 2: Get stored calendars, optionally sync from Google first
    const calendars = await calendarService.getUserStoredCalendars(userId, sync === 'true');
    
    // Step 3: Build response with cleanup information
    const response = {
      success: true,
      data: {
        calendars: calendars.map(cal => cal.toJSON())
      }
    };

    // Include cleanup results if any cleanup was performed
    if (cleanupResult && cleanupResult.orphansFound > 0) {
      response.cleanup = {
        orphansFound: cleanupResult.orphansFound,
        orphansRemoved: cleanupResult.orphansRemoved,
        orphansKept: cleanupResult.orphansKept,
        details: cleanupResult.details
      };
      
      // Add user-friendly message
      if (cleanupResult.orphansRemoved > 0) {
        response.message = `Automatically removed ${cleanupResult.orphansRemoved} orphaned calendar(s) from deleted Google accounts`;
      }
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching user calendars:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calendars'
    });
  }
});

// Sync calendars from Google
router.post('/sync', async (req, res) => {
  try {
    const userId = req.user.id;
    
    let syncedCalendars = [];
    let syncedCount = 0;
    
    try {
      syncedCalendars = await calendarService.syncAllUserCalendars(userId);
      syncedCount = syncedCalendars.length;
    } catch (syncError) {
      console.error('Sync failed, falling back to existing calendars:', syncError);
      syncedCount = 0; // No new calendars were synced
    }
    
    // Always ensure we have calendars to return - get stored calendars if sync returned 0
    if (syncedCalendars.length === 0) {
      console.log('Sync returned 0 calendars, getting stored calendars as fallback');
      syncedCalendars = await calendarService.getUserStoredCalendars(userId, false);
    }
    
    res.json({
      success: true,
      data: {
        calendars: syncedCalendars.map(cal => cal.toJSON()),
        syncedCount: syncedCount
      },
      message: syncedCount > 0 
        ? `Successfully synced ${syncedCount} calendars from all connected Google accounts`
        : 'Calendar sync completed - all calendars are up to date!'
    });
  } catch (error) {
    console.error('Error in sync endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync calendars from Google'
    });
  }
});

// Get available Google calendars (from Google Calendar API)
router.get('/google', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const googleCalendars = await calendarService.getUserCalendars(userId);
    
    res.json({
      success: true,
      data: {
        calendars: googleCalendars
      }
    });
  } catch (error) {
    console.error('Error fetching Google calendars:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Google calendars'
    });
  }
});

// Update calendar settings
router.put('/:calendarId', async (req, res) => {
  try {
    const userId = req.user.id;
    const calendarId = parseInt(req.params.calendarId);
    const { isPrimary, isActive, calendarName, calendarDescription } = req.body;
    
    // Find the calendar
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
    
    // Update calendar
    const updateData = {};
    if (typeof isPrimary === 'boolean') updateData.is_primary = isPrimary;
    if (typeof isActive === 'boolean') updateData.is_active = isActive;
    if (calendarName) updateData.calendar_name = calendarName;
    if (calendarDescription !== undefined) updateData.calendar_description = calendarDescription;
    
    await calendar.update(updateData);
    
    res.json({
      success: true,
      data: {
        calendar: calendar.toJSON()
      },
      message: 'Calendar updated successfully'
    });
  } catch (error) {
    console.error('Error updating calendar:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update calendar'
    });
  }
});

// Set primary calendar
router.post('/:calendarId/set-primary', async (req, res) => {
  try {
    const userId = req.user.id;
    const calendarId = parseInt(req.params.calendarId);
    
    // Find the calendar
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
    
    // Set as primary
    await calendar.setPrimary();
    
    res.json({
      success: true,
      data: {
        calendar: calendar.toJSON()
      },
      message: 'Primary calendar set successfully'
    });
  } catch (error) {
    console.error('Error setting primary calendar:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set primary calendar'
    });
  }
});

// Toggle calendar active status
router.post('/:calendarId/toggle-active', async (req, res) => {
  try {
    const userId = req.user.id;
    const calendarId = parseInt(req.params.calendarId);
    
    // Find the calendar
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
        calendar: calendar.toJSON()
      },
      message: `Calendar ${calendar.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error toggling calendar status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle calendar status'
    });
  }
});

// Remove calendar from account
router.delete('/:calendarId', async (req, res) => {
  try {
    const userId = req.user.id;
    const calendarId = parseInt(req.params.calendarId);
    
    // Find the calendar
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
    
    // Delete calendar
    await calendar.delete();
    
    res.json({
      success: true,
      message: 'Calendar removed successfully'
    });
  } catch (error) {
    console.error('Error removing calendar:', error);
    
    if (error.message.includes('only active calendar')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    // Log the specific error for debugging
    console.error('Calendar deletion error details:', {
      message: error.message,
      stack: error.stack,
      calendarId,
      userId
    });
    
    res.status(500).json({
      success: false,
      error: `Failed to remove calendar: ${error.message}`
    });
  }
});

// Get events from user's calendars
router.get('/events', async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      timeMin, 
      timeMax, 
      maxResults = 100, 
      calendarIds 
    } = req.query;
    
    const options = {
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      maxResults: parseInt(maxResults)
    };
    
    // Parse calendar IDs if provided
    const targetCalendarIds = calendarIds ? 
      (Array.isArray(calendarIds) ? calendarIds : calendarIds.split(',')) : 
      null;
    
    const events = await calendarService.getEventsFromMultipleCalendars(
      userId, 
      targetCalendarIds, 
      options
    );
    
    res.json({
      success: true,
      data: {
        events,
        timeMin: options.timeMin,
        timeMax: options.timeMax
      }
    });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calendar events'
    });
  }
});

// Get orphaned calendar status and manual cleanup endpoint
router.get('/orphaned', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const healthCheck = await orphanedCleanupService.healthCheck(userId);
    const orphanedCalendars = await orphanedCleanupService.detectOrphanedCalendars(userId);
    
    res.json({
      success: true,
      data: {
        ...healthCheck,
        orphanedCalendars: orphanedCalendars,
        cleanupStats: orphanedCleanupService.getCleanupStats()
      }
    });
  } catch (error) {
    console.error('Error checking orphaned calendars:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check orphaned calendars'
    });
  }
});

// Manual cleanup of orphaned calendars
router.post('/orphaned/cleanup', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const cleanupResult = await orphanedCleanupService.cleanupOrphanedCalendars(userId);
    
    res.json({
      success: true,
      data: cleanupResult,
      message: cleanupResult.orphansRemoved > 0 
        ? `Successfully removed ${cleanupResult.orphansRemoved} orphaned calendar(s)`
        : 'No orphaned calendars found'
    });
  } catch (error) {
    console.error('Error cleaning up orphaned calendars:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup orphaned calendars'
    });
  }
});

// Remove specific orphaned calendar
router.delete('/orphaned/:calendarId', async (req, res) => {
  try {
    const userId = req.user.id;
    const calendarId = parseInt(req.params.calendarId);
    
    const result = await orphanedCleanupService.removeSpecificOrphanedCalendar(userId, calendarId);
    
    res.json({
      success: true,
      data: result,
      message: `Orphaned calendar "${result.calendarName}" removed successfully`
    });
  } catch (error) {
    console.error('Error removing specific orphaned calendar:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to remove orphaned calendar'
    });
  }
});

// Get user availability across all active calendars
router.get('/availability', async (req, res) => {
  try {
    const userId = req.user.id;
    const { startTime, endTime } = req.query;
    
    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'startTime and endTime are required'
      });
    }
    
    const availability = await calendarService.getUserAvailability(
      userId,
      startTime,
      endTime
    );
    
    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch availability'
    });
  }
});

module.exports = router;