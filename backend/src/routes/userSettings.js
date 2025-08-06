const express = require('express');
const UserSettings = require('../models/UserSettings');
const BlockedTime = require('../models/BlockedTime');
const jwt = require('jsonwebtoken');

const router = express.Router();

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

// Get user settings
router.get('/', authenticateToken, async (req, res) => {
  try {
    const settings = await UserSettings.findByUserId(req.user.id);
    
    res.json({
      success: true,
      data: settings.toJSON()
    });
  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user settings',
      message: error.message
    });
  }
});

// Update user settings
router.put('/', authenticateToken, async (req, res) => {
  try {
    const {
      workingHours,
      timezone,
      defaultBufferBefore,
      defaultBufferAfter,
      minimumNoticeMinutes,
      maxAdvanceDays,
      allowBackToBackBookings,
      autoConfirmBookings
    } = req.body;

    const settings = await UserSettings.findByUserId(req.user.id);
    
    const updateData = {};
    if (workingHours !== undefined) updateData.working_hours = workingHours;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (defaultBufferBefore !== undefined) updateData.default_buffer_before = defaultBufferBefore;
    if (defaultBufferAfter !== undefined) updateData.default_buffer_after = defaultBufferAfter;
    if (minimumNoticeMinutes !== undefined) updateData.minimum_notice_minutes = minimumNoticeMinutes;
    if (maxAdvanceDays !== undefined) updateData.max_advance_days = maxAdvanceDays;
    if (allowBackToBackBookings !== undefined) updateData.allow_back_to_back_bookings = allowBackToBackBookings;
    if (autoConfirmBookings !== undefined) updateData.auto_confirm_bookings = autoConfirmBookings;

    const updatedSettings = await settings.update(updateData);
    
    res.json({
      success: true,
      data: updatedSettings.toJSON()
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user settings',
      message: error.message
    });
  }
});

// Get blocked times
router.get('/blocked-times', authenticateToken, async (req, res) => {
  try {
    const { start, end } = req.query;
    
    let blockedTimes;
    if (start && end) {
      blockedTimes = await BlockedTime.findByUserIdAndDateRange(
        req.user.id,
        new Date(start),
        new Date(end)
      );
    } else {
      blockedTimes = await BlockedTime.findByUserId(req.user.id);
    }
    
    res.json({
      success: true,
      data: blockedTimes.map(bt => bt.toJSON())
    });
  } catch (error) {
    console.error('Error fetching blocked times:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blocked times',
      message: error.message
    });
  }
});

// Create blocked time
router.post('/blocked-times', authenticateToken, async (req, res) => {
  try {
    const {
      startTime,
      endTime,
      title,
      description,
      isRecurring,
      recurrencePattern,
      recurrenceEndDate
    } = req.body;

    // Validation
    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'Start time and end time are required'
      });
    }

    if (new Date(startTime) >= new Date(endTime)) {
      return res.status(400).json({
        success: false,
        error: 'End time must be after start time'
      });
    }

    const blockedTime = await BlockedTime.create(req.user.id, {
      startTime,
      endTime,
      title,
      description,
      isRecurring,
      recurrencePattern,
      recurrenceEndDate
    });

    res.status(201).json({
      success: true,
      data: blockedTime.toJSON()
    });
  } catch (error) {
    console.error('Error creating blocked time:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create blocked time',
      message: error.message
    });
  }
});

// Update blocked time
router.put('/blocked-times/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      startTime,
      endTime,
      title,
      description,
      isRecurring,
      recurrencePattern,
      recurrenceEndDate
    } = req.body;

    // Find blocked time and verify ownership
    const blockedTime = await BlockedTime.findById(id);
    if (!blockedTime) {
      return res.status(404).json({
        success: false,
        error: 'Blocked time not found'
      });
    }

    if (blockedTime.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const updateData = {};
    if (startTime !== undefined) updateData.start_time = startTime;
    if (endTime !== undefined) updateData.end_time = endTime;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (isRecurring !== undefined) updateData.is_recurring = isRecurring;
    if (recurrencePattern !== undefined) updateData.recurrence_pattern = recurrencePattern;
    if (recurrenceEndDate !== undefined) updateData.recurrence_end_date = recurrenceEndDate;

    const updatedBlockedTime = await blockedTime.update(updateData);

    res.json({
      success: true,
      data: updatedBlockedTime.toJSON()
    });
  } catch (error) {
    console.error('Error updating blocked time:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update blocked time',
      message: error.message
    });
  }
});

// Delete blocked time
router.delete('/blocked-times/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Find blocked time and verify ownership
    const blockedTime = await BlockedTime.findById(id);
    if (!blockedTime) {
      return res.status(404).json({
        success: false,
        error: 'Blocked time not found'
      });
    }

    if (blockedTime.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    await blockedTime.delete();

    res.json({
      success: true,
      message: 'Blocked time deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting blocked time:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete blocked time',
      message: error.message
    });
  }
});

module.exports = router;