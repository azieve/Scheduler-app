const express = require('express');
const MeetingType = require('../models/MeetingType');
const User = require('../models/User');

const router = express.Router();

// Get meeting type by username and slug for booking page
router.get('/:username/:slug', async (req, res) => {
  try {
    const { username, slug } = req.params;
    
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
    
    // Return public meeting type info and user info
    res.json({
      success: true,
      data: {
        meetingType: {
          id: meetingType.id,
          name: meetingType.name,
          description: meetingType.description,
          durationMinutes: meetingType.durationMinutes,
          formattedDuration: meetingType.getFormattedDuration(),
          location: meetingType.location,
          color: meetingType.color,
          publicSlug: meetingType.publicSlug
        },
        user: {
          username: user.username,
          fullName: user.getFullName(),
          email: user.email
        }
      }
    });
  } catch (error) {
    console.error('Error fetching booking page data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch meeting type',
      message: error.message
    });
  }
});

module.exports = router;