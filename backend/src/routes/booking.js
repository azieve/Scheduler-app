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
    const locationDetails = meetingType.getLocationDetails();
    
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
          publicSlug: meetingType.publicSlug,
          
          // Advanced meeting type info for booking page
          meetingType: meetingType.meetingType,
          meetingTypeDisplay: meetingType.getMeetingTypeDisplayName(),
          videoProvider: meetingType.videoProvider,
          videoProviderDisplay: meetingType.getVideoProviderDisplayName(),
          locationDetails: locationDetails,
          preMeetingInstructions: meetingType.preMeetingInstructions,
          attendeeQuestions: meetingType.attendeeQuestions,
          maxAttendees: meetingType.maxAttendees,
          allowGuests: meetingType.allowGuests,
          requireConfirmation: meetingType.requireConfirmation,
          bookingCancellationPolicy: meetingType.bookingCancellationPolicy
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

    // Create Google Calendar event with enhanced meeting type support
    let googleEventId = null;
    let meetingLink = null;
    
    try {
      if (user.hasGoogleAuth()) {
        // Build event data using meeting type's calendar event details
        const bookingData = {
          attendeeName,
          attendeeEmail,
          notes
        };
        
        const eventDetails = meetingType.getCalendarEventDetails(bookingData);
        
        const event = {
          summary: eventDetails.summary,
          description: eventDetails.description,
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
          location: eventDetails.location,
          visibility: eventDetails.visibility,
          reminders: eventDetails.reminders
        };

        // Use the enhanced createEvent method
        const createdEvent = await calendarService.createEvent(
          user.id,
          'primary',
          event,
          meetingType
        );

        googleEventId = createdEvent.id;
        
        // Extract meeting link if it was generated (Google Meet)
        meetingLink = calendarService.extractMeetingLink(createdEvent) || 
                     meetingType.getEffectiveMeetingLink(createdEvent.conferenceData?.entryPoints?.[0]?.uri);
        
        await booking.update({ 
          google_event_id: googleEventId,
          meeting_link: meetingLink 
        });
      }
    } catch (calError) {
      console.error('Failed to create Google Calendar event:', calError);
      // Don't fail the booking creation if calendar event fails
    }

    const locationDetails = meetingType.getLocationDetails();
    
    res.status(201).json({
      success: true,
      data: {
        booking: booking.toJSON(),
        meetingType: {
          name: meetingType.name,
          durationMinutes: meetingType.durationMinutes,
          meetingType: meetingType.meetingType,
          meetingTypeDisplay: meetingType.getMeetingTypeDisplayName(),
          location: meetingType.location,
          locationDetails: locationDetails,
          meetingLink: meetingLink || meetingType.getEffectiveMeetingLink(),
          preMeetingInstructions: meetingType.preMeetingInstructions,
          postMeetingInstructions: meetingType.postMeetingInstructions
        },
        user: {
          fullName: user.getFullName(),
          email: user.email
        },
        googleEventCreated: !!googleEventId,
        meetingLink: meetingLink,
        instructions: {
          preMeeting: meetingType.preMeetingInstructions,
          postMeeting: meetingType.postMeetingInstructions,
          location: locationDetails,
          cancellationPolicy: meetingType.bookingCancellationPolicy
        }
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