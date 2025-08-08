const calendarService = require('./calendarService');
const UserSettings = require('../models/UserSettings');
const BlockedTime = require('../models/BlockedTime');

class AvailabilityService {
  // Generate available time slots for a given date and meeting type
  static async getAvailableSlots(userId, meetingType, date) {
    try {
      // Get user's settings for working hours and preferences
      const userSettings = await UserSettings.findByUserId(userId);
      
      // Parse the date and get day of week
      const targetDate = new Date(date);
      const dayOfWeek = targetDate.getDay();
      
      // Check if user is available on this day
      if (!userSettings.isAvailableOnDay(dayOfWeek)) {
        return []; // No availability on this day
      }
      
      // Get working hours for this day
      const workingHours = userSettings.getWorkingHoursForDay(dayOfWeek);
      if (!workingHours) {
        return [];
      }

      // Parse working hours (format: "09:00")
      const [startHour, startMin] = workingHours.start.split(':').map(Number);
      const [endHour, endMin] = workingHours.end.split(':').map(Number);

      // Get start and end of the day in user's timezone
      const startOfDay = new Date(date);
      startOfDay.setHours(startHour, startMin, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(endHour, endMin, 0, 0);

      // Fetch busy times from Google Calendar
      const busyTimes = await this.getBusyTimes(userId, startOfDay, endOfDay);
      
      // Fetch blocked times from user settings
      const blockedTimes = await BlockedTime.findByUserIdAndDateRange(
        userId, 
        startOfDay, 
        endOfDay
      );

      // Generate all possible slots using user's minimum notice and preferences
      const allSlots = this.generateTimeSlots(
        startOfDay, 
        endOfDay, 
        meetingType.durationMinutes,
        userSettings.minimumNoticeMinutes
      );

      // Combine busy times from calendar and blocked times
      const allBlockedTimes = [
        ...busyTimes.map(bt => ({ start: bt.start, end: bt.end })),
        ...blockedTimes.map(bt => ({ start: bt.startTime, end: bt.endTime }))
      ];

      // Filter out busy times and blocked times, and add preferred time information
      const availableSlots = allSlots.filter(slot => {
        const slotStart = new Date(slot.start);
        const slotEnd = new Date(slot.end);
        
        // Use global buffer settings if meeting type doesn't specify
        const bufferBefore = meetingType.bufferBeforeMinutes || userSettings.defaultBufferBefore;
        const bufferAfter = meetingType.bufferAfterMinutes || userSettings.defaultBufferAfter;
        
        const bufferStart = new Date(slotStart.getTime() - (bufferBefore * 60000));
        const bufferEnd = new Date(slotEnd.getTime() + (bufferAfter * 60000));

        // Check if this slot conflicts with any busy/blocked time
        return !allBlockedTimes.some(blockedTime => {
          const blockedStart = new Date(blockedTime.start);
          const blockedEnd = new Date(blockedTime.end);
          
          // Check for overlap including buffer times
          return (bufferStart < blockedEnd && bufferEnd > blockedStart);
        });
      }).map(slot => {
        // Add preferred time information to each available slot
        // Convert the slot start time to 24-hour format for comparison
        const slotTimeHour = slot.start.getHours();
        const slotTimeMinute = slot.start.getMinutes();
        const slotTime24h = `${slotTimeHour.toString().padStart(2, '0')}:${slotTimeMinute.toString().padStart(2, '0')}`;
        const preferredInfo = userSettings.isPreferredTime(dayOfWeek, slotTime24h);
        
        return {
          ...slot,
          isPreferred: preferredInfo.isPreferred,
          preferredLabel: preferredInfo.label
        };
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

      // Get events from all active calendars using the new calendar system
      const Calendar = require('../models/Calendar');
      const Account = require('../models/Account');
      
      const activeCalendars = await Calendar.findByUserId(userId, true); // active only
      let allEvents = [];
      
      for (const calendar of activeCalendars) {
        try {
          // Get the account for this calendar to access tokens
          const account = await Account.findById(calendar.accountId);
          if (!account || !account.isActive) {
            continue;
          }
          
          const events = await calendarService.getEvents(
            account.googleAccessToken,
            account.googleRefreshToken,
            calendar.googleCalendarId,
            startTime.toISOString(),
            endTime.toISOString()
          );
          
          allEvents = allEvents.concat(events);
        } catch (error) {
          console.error(`Error fetching events from calendar ${calendar.calendarName}:`, error);
          // Continue with other calendars even if one fails
        }
      }
      
      const events = allEvents;

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
  static generateTimeSlots(startTime, endTime, durationMinutes, minimumNoticeMinutes = 30) {
    const slots = [];
    const slotDuration = durationMinutes * 60000; // Convert to milliseconds
    const intervalMinutes = 15; // 15-minute intervals
    const interval = intervalMinutes * 60000;
    const now = new Date();

    let currentTime = new Date(startTime);

    // If the date is today, start from the next available slot after current time + minimum notice
    if (startTime.toDateString() === now.toDateString()) {
      const minimumTime = new Date(now.getTime() + (minimumNoticeMinutes * 60000));
      if (currentTime < minimumTime) {
        // Round up to next 15-minute interval
        const nextSlot = new Date(minimumTime);
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