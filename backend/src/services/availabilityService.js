const calendarService = require('./calendarService');

class AvailabilityService {
  // Generate available time slots for a given date and meeting type
  static async getAvailableSlots(userId, meetingType, date) {
    try {
      // Default working hours (9 AM to 5 PM)
      const workingHours = {
        start: 9, // 9 AM
        end: 17   // 5 PM
      };

      // Get start and end of the day in user's timezone
      const startOfDay = new Date(date);
      startOfDay.setHours(workingHours.start, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(workingHours.end, 0, 0, 0);

      // Fetch busy times from Google Calendar
      const busyTimes = await this.getBusyTimes(userId, startOfDay, endOfDay);

      // Generate all possible slots
      const allSlots = this.generateTimeSlots(
        startOfDay, 
        endOfDay, 
        meetingType.durationMinutes
      );

      // Filter out busy times
      const availableSlots = allSlots.filter(slot => {
        const slotStart = new Date(slot.start);
        const slotEnd = new Date(slot.end);
        
        // Add buffer time before and after
        const bufferStart = new Date(slotStart.getTime() - (meetingType.bufferBeforeMinutes * 60000));
        const bufferEnd = new Date(slotEnd.getTime() + (meetingType.bufferAfterMinutes * 60000));

        // Check if this slot conflicts with any busy time
        return !busyTimes.some(busyTime => {
          const busyStart = new Date(busyTime.start);
          const busyEnd = new Date(busyTime.end);
          
          // Check for overlap including buffer times
          return (bufferStart < busyEnd && bufferEnd > busyStart);
        });
      });

      return availableSlots;
    } catch (error) {
      console.error('Error getting available slots:', error);
      throw error;
    }
  }

  // Get busy times from user's calendar
  static async getBusyTimes(userId, startTime, endTime) {
    try {
      const User = require('../models/User');
      const user = await User.findById(userId);
      
      if (!user || !user.hasGoogleAuth()) {
        throw new Error('User not authenticated with Google Calendar');
      }

      // Get events from primary calendar
      const events = await calendarService.getEvents(
        user.googleAccessToken,
        user.googleRefreshToken,
        'primary',
        startTime.toISOString(),
        endTime.toISOString()
      );

      // Convert events to busy time periods
      const busyTimes = events
        .filter(event => event.start && event.end)
        .map(event => ({
          start: event.start.dateTime || event.start.date,
          end: event.end.dateTime || event.end.date,
          summary: event.summary
        }));

      return busyTimes;
    } catch (error) {
      console.error('Error getting busy times:', error);
      throw error;
    }
  }

  // Generate time slots for a given day
  static generateTimeSlots(startTime, endTime, durationMinutes) {
    const slots = [];
    const slotDuration = durationMinutes * 60000; // Convert to milliseconds
    const intervalMinutes = 15; // 15-minute intervals
    const interval = intervalMinutes * 60000;
    const now = new Date();

    let currentTime = new Date(startTime);

    // If the date is today, start from the next available slot after current time
    if (startTime.toDateString() === now.toDateString()) {
      const nowPlus30Min = new Date(now.getTime() + (30 * 60000)); // 30 min buffer
      if (currentTime < nowPlus30Min) {
        // Round up to next 15-minute interval
        const nextSlot = new Date(nowPlus30Min);
        const minutes = nextSlot.getMinutes();
        const roundedMinutes = Math.ceil(minutes / 15) * 15;
        nextSlot.setMinutes(roundedMinutes, 0, 0);
        
        if (nextSlot > currentTime) {
          currentTime = nextSlot;
        }
      }
    }

    while (currentTime.getTime() + slotDuration <= endTime.getTime()) {
      const slotEnd = new Date(currentTime.getTime() + slotDuration);
      
      slots.push({
        start: new Date(currentTime),
        end: slotEnd,
        startTime: this.formatTime(currentTime),
        endTime: this.formatTime(slotEnd)
      });

      currentTime = new Date(currentTime.getTime() + interval);
    }

    return slots;
  }

  // Format time for display (e.g., "2:30 PM")
  static formatTime(date) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  // Format date for display
  static formatDate(date) {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}

module.exports = AvailabilityService;