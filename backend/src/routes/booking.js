const express = require('express');
const MeetingType = require('../models/MeetingType');
const User = require('../models/User');
const Booking = require('../models/Booking');
const calendarService = require('../services/calendarService');

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

// Create a new booking
router.post('/:username/:slug', async (req, res) => {
  try {
    const { username, slug } = req.params;
    const {
      attendeeName,
      attendeeEmail,
      attendeePhone,
      startTime,
      notes,
      timezone = 'UTC'
    } = req.body;

    // Validate required fields
    if (!attendeeName || !attendeeEmail || !startTime) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: attendeeName, attendeeEmail, startTime'
      });
    }

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

    // Calculate end time
    const start = new Date(startTime);
    const end = new Date(start.getTime() + (meetingType.durationMinutes * 60000));

    // Create the booking
    const booking = await Booking.create({
      userId: user.id,
      meetingTypeId: meetingType.id,
      attendeeName,
      attendeeEmail,
      attendeePhone,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      timezone,
      notes
    });

    // Create Google Calendar event
    let googleEventId = null;
    try {
      if (user.hasGoogleAuth()) {
        const event = {
          summary: `${meetingType.name} - ${attendeeName}`,
          description: `Meeting booked via ReadyToMeet.me\n\nAttendee: ${attendeeName} (${attendeeEmail})\nMeeting Type: ${meetingType.name}\n\n${notes ? `Notes: ${notes}` : ''}`,
          start: {
            dateTime: start.toISOString(),
            timeZone: timezone
          },
          end: {
            dateTime: end.toISOString(),
            timeZone: timezone
          },
          attendees: [
            { email: attendeeEmail },
            { email: user.email }
          ],
          location: meetingType.location || meetingType.meetingLink || '',
          conferenceData: meetingType.meetingLink ? {
            createRequest: {
              conferenceSolutionKey: { type: 'hangoutsMeet' }
            }
          } : undefined
        };

        const createdEvent = await calendarService.createEvent(
          user.googleAccessToken,
          user.googleRefreshToken,
          'primary',
          event
        );

        googleEventId = createdEvent.id;
        await booking.update({ google_event_id: googleEventId });
      }
    } catch (calError) {
      console.error('Failed to create Google Calendar event:', calError);
      // Don't fail the booking creation if calendar event fails
    }

    res.status(201).json({
      success: true,
      data: {
        booking: booking.toJSON(),
        meetingType: {
          name: meetingType.name,
          durationMinutes: meetingType.durationMinutes,
          location: meetingType.location,
          meetingLink: meetingType.meetingLink
        },
        user: {
          fullName: user.getFullName(),
          email: user.email
        },
        googleEventCreated: !!googleEventId
      }
    });

  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create booking',
      message: error.message
    });
  }
});

module.exports = router;