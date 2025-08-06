const express = require('express');
const AvailabilityService = require('../services/availabilityService');
const MeetingType = require('../models/MeetingType');
const User = require('../models/User');

const router = express.Router();

// Get available time slots for a meeting type
router.get('/:username/:slug/:date', async (req, res) => {
  try {
    const { username, slug, date } = req.params;
    
    // Find user by username
    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Find meeting type by slug and user
    const meetingType = await MeetingType.findBySlug(slug);
    if (!meetingType || meetingType.userId !== user.id) {
      return res.status(404).json({
        success: false,
        error: 'Meeting type not found or inactive'
      });
    }
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      });
    }
    
    // Check if date is in the future
    const requestedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (requestedDate < today) {
      return res.status(400).json({
        success: false,
        error: 'Cannot book appointments in the past'
      });
    }
    
    // Get available slots
    const availableSlots = await AvailabilityService.getAvailableSlots(
      user.id,
      meetingType,
      date
    );
    
    res.json({
      success: true,
      data: {
        date: date,
        formattedDate: AvailabilityService.formatDate(requestedDate),
        availableSlots: availableSlots,
        meetingType: {
          name: meetingType.name,
          durationMinutes: meetingType.durationMinutes,
          formattedDuration: meetingType.getFormattedDuration()
        },
        user: {
          username: user.username,
          fullName: user.getFullName()
        }
      }
    });
  } catch (error) {
    console.error('Error getting availability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get availability',
      message: error.message
    });
  }
});

module.exports = router;