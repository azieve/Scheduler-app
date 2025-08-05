const express = require('express');
const MeetingType = require('../models/MeetingType');
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

// Get all meeting types for authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { includeInactive = false } = req.query;
    
    const meetingTypes = await MeetingType.findByUserId(
      req.user.id, 
      includeInactive === 'true'
    );
    
    res.json({
      success: true,
      data: {
        meetingTypes: meetingTypes.map(mt => mt.toJSON()),
        count: meetingTypes.length
      }
    });
  } catch (error) {
    console.error('Error fetching meeting types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch meeting types',
      message: error.message
    });
  }
});

// Get specific meeting type by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const meetingType = await MeetingType.findById(id);
    
    if (!meetingType) {
      return res.status(404).json({
        success: false,
        error: 'Meeting type not found'
      });
    }

    // Check if user owns this meeting type
    if (meetingType.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    res.json({
      success: true,
      data: meetingType.toJSON()
    });
  } catch (error) {
    console.error('Error fetching meeting type:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch meeting type',
      message: error.message
    });
  }
});

// Get meeting type by public slug (public endpoint)
router.get('/public/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const meetingType = await MeetingType.findBySlug(slug);
    
    if (!meetingType) {
      return res.status(404).json({
        success: false,
        error: 'Meeting type not found or inactive'
      });
    }
    
    // Return limited public info
    res.json({
      success: true,
      data: {
        id: meetingType.id,
        name: meetingType.name,
        description: meetingType.description,
        durationMinutes: meetingType.durationMinutes,
        formattedDuration: meetingType.getFormattedDuration(),
        location: meetingType.location,
        color: meetingType.color,
        publicSlug: meetingType.publicSlug
      }
    });
  } catch (error) {
    console.error('Error fetching public meeting type:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch meeting type',
      message: error.message
    });
  }
});

// Create new meeting type
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      description,
      durationMinutes,
      bufferBeforeMinutes,
      bufferAfterMinutes,
      location,
      meetingLink,
      color
    } = req.body;

    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Meeting name is required'
      });
    }

    if (durationMinutes && (durationMinutes < 5 || durationMinutes > 480)) {
      return res.status(400).json({
        success: false,
        error: 'Duration must be between 5 and 480 minutes'
      });
    }

    const meetingType = await MeetingType.create(req.user.id, {
      name: name.trim(),
      description: description?.trim() || '',
      durationMinutes: parseInt(durationMinutes) || 30,
      bufferBeforeMinutes: parseInt(bufferBeforeMinutes) || 0,
      bufferAfterMinutes: parseInt(bufferAfterMinutes) || 0,
      location: location?.trim() || '',
      meetingLink: meetingLink?.trim() || '',
      color: color || '#4285F4'
    });
    
    res.status(201).json({
      success: true,
      data: meetingType.toJSON()
    });
  } catch (error) {
    console.error('Error creating meeting type:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create meeting type',
      message: error.message
    });
  }
});

// Update meeting type
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const meetingType = await MeetingType.findById(id);
    
    if (!meetingType) {
      return res.status(404).json({
        success: false,
        error: 'Meeting type not found'
      });
    }

    // Check if user owns this meeting type
    if (meetingType.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const {
      name,
      description,
      durationMinutes,
      bufferBeforeMinutes,
      bufferAfterMinutes,
      location,
      meetingLink,
      color,
      isActive
    } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (durationMinutes !== undefined) updateData.duration_minutes = parseInt(durationMinutes);
    if (bufferBeforeMinutes !== undefined) updateData.buffer_before_minutes = parseInt(bufferBeforeMinutes);
    if (bufferAfterMinutes !== undefined) updateData.buffer_after_minutes = parseInt(bufferAfterMinutes);
    if (location !== undefined) updateData.location = location.trim();
    if (meetingLink !== undefined) updateData.meeting_link = meetingLink.trim();
    if (color !== undefined) updateData.color = color;
    if (isActive !== undefined) updateData.is_active = Boolean(isActive);

    const updatedMeetingType = await meetingType.update(updateData);
    
    res.json({
      success: true,
      data: updatedMeetingType.toJSON()
    });
  } catch (error) {
    console.error('Error updating meeting type:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update meeting type',
      message: error.message
    });
  }
});

// Delete meeting type (soft delete)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const meetingType = await MeetingType.findById(id);
    
    if (!meetingType) {
      return res.status(404).json({
        success: false,
        error: 'Meeting type not found'
      });
    }

    // Check if user owns this meeting type
    if (meetingType.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    await meetingType.delete();
    
    res.json({
      success: true,
      message: 'Meeting type deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting meeting type:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete meeting type',
      message: error.message
    });
  }
});

module.exports = router;