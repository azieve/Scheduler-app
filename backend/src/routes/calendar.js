const express = require('express');
const calendarService = require('../services/calendarService');

const router = express.Router();

// Middleware to authenticate JWT token (copied from auth.js)
function authenticateToken(req, res, next) {
  const token = req.cookies.auth_token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Get user's calendars
router.get('/calendars', authenticateToken, async (req, res) => {
  try {
    const calendars = await calendarService.getUserCalendars(req.user.id);
    
    res.json({
      success: true,
      data: {
        calendars,
        count: calendars.length
      }
    });
  } catch (error) {
    console.error('Calendar list error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calendars',
      message: error.message
    });
  }
});

// Get events from a specific calendar
router.get('/events', authenticateToken, async (req, res) => {
  try {
    const { 
      calendarId = 'primary',
      timeMin,
      timeMax,
      maxResults = 50
    } = req.query;

    const options = {
      maxResults: parseInt(maxResults),
    };

    if (timeMin) options.timeMin = timeMin;
    if (timeMax) options.timeMax = timeMax;

    const events = await calendarService.getCalendarEvents(
      req.user.id, 
      calendarId, 
      options
    );
    
    res.json({
      success: true,
      data: {
        events,
        count: events.length,
        calendarId
      }
    });
  } catch (error) {
    console.error('Calendar events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calendar events',
      message: error.message
    });
  }
});

// Get user's availability (free/busy)
router.get('/availability', authenticateToken, async (req, res) => {
  try {
    const { 
      startTime,
      endTime,
      calendarIds
    } = req.query;

    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'startTime and endTime are required'
      });
    }

    const calendars = calendarIds ? calendarIds.split(',') : ['primary'];
    
    const availability = await calendarService.getUserAvailability(
      req.user.id,
      startTime,
      endTime,
      calendars
    );
    
    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('Availability error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch availability',
      message: error.message
    });
  }
});

// Create a new calendar event
router.post('/events', authenticateToken, async (req, res) => {
  try {
    const { calendarId = 'primary', ...eventData } = req.body;

    if (!eventData.summary || !eventData.start || !eventData.end) {
      return res.status(400).json({
        success: false,
        error: 'Event must have summary, start, and end times'
      });
    }

    const event = await calendarService.createEvent(
      req.user.id,
      calendarId,
      eventData
    );
    
    res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create calendar event',
      message: error.message
    });
  }
});

// Update an existing calendar event
router.put('/events/:eventId', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { calendarId = 'primary', ...eventData } = req.body;

    const event = await calendarService.updateEvent(
      req.user.id,
      calendarId,
      eventId,
      eventData
    );
    
    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update calendar event',
      message: error.message
    });
  }
});

// Delete a calendar event
router.delete('/events/:eventId', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { calendarId = 'primary' } = req.query;

    await calendarService.deleteEvent(req.user.id, calendarId, eventId);
    
    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete calendar event',
      message: error.message
    });
  }
});

module.exports = router;