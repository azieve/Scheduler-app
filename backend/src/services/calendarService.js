const { google } = require('googleapis');
const User = require('../models/User');

class CalendarService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  // Set up OAuth client with user's tokens
  async setupUserAuth(user) {
    if (!user.googleAccessToken) {
      throw new Error('User has no Google access token');
    }

    this.oauth2Client.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken,
    });

    // Handle token refresh automatically
    this.oauth2Client.on('tokens', async (tokens) => {
      console.log('🔄 Refreshing Google tokens for user:', user.email);
      
      // Update user's tokens in database
      if (tokens.access_token) {
        await user.updateGoogleTokens(
          tokens.access_token, 
          tokens.refresh_token || user.googleRefreshToken
        );
      }
    });

    return this.oauth2Client;
  }

  // Get user's calendar list
  async getUserCalendars(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      await this.setupUserAuth(user);
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      const response = await calendar.calendarList.list();
      
      const calendars = response.data.items?.map(cal => ({
        id: cal.id,
        summary: cal.summary,
        description: cal.description,
        primary: cal.primary,
        accessRole: cal.accessRole,
        backgroundColor: cal.backgroundColor,
        foregroundColor: cal.foregroundColor,
        selected: cal.selected,
        timeZone: cal.timeZone
      })) || [];

      console.log(`📅 Found ${calendars.length} calendars for user: ${user.email}`);
      return calendars;
    } catch (error) {
      console.error('Error fetching user calendars:', error);
      throw error;
    }
  }

  // Get events from a specific calendar
  async getCalendarEvents(userId, calendarId, options = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      await this.setupUserAuth(user);
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const {
        timeMin = new Date().toISOString(),
        timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        maxResults = 100,
        singleEvents = true,
        orderBy = 'startTime'
      } = options;

      const response = await calendar.events.list({
        calendarId: calendarId || 'primary',
        timeMin,
        timeMax,
        maxResults,
        singleEvents,
        orderBy,
      });

      const events = response.data.items?.map(event => ({
        id: event.id,
        summary: event.summary,
        description: event.description,
        start: event.start,
        end: event.end,
        status: event.status,
        created: event.created,
        updated: event.updated,
        creator: event.creator,
        organizer: event.organizer,
        attendees: event.attendees,
        htmlLink: event.htmlLink,
        location: event.location,
        recurrence: event.recurrence,
        transparency: event.transparency // 'transparent' for free time, 'opaque' for busy
      })) || [];

      console.log(`📅 Found ${events.length} events for user: ${user.email}`);
      return events;
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw error;
    }
  }

  // Get user's availability for a specific time range
  async getUserAvailability(userId, startTime, endTime, calendarIds = ['primary']) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      await this.setupUserAuth(user);
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      // Use freebusy query to check availability
      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: startTime,
          timeMax: endTime,
          items: calendarIds.map(id => ({ id }))
        }
      });

      const busyTimes = [];
      const calendars = response.data.calendars || {};

      // Extract busy periods from all calendars
      Object.keys(calendars).forEach(calendarId => {
        const calendarData = calendars[calendarId];
        if (calendarData.busy) {
          calendarData.busy.forEach(busyPeriod => {
            busyTimes.push({
              start: busyPeriod.start,
              end: busyPeriod.end,
              calendarId
            });
          });
        }
      });

      console.log(`⏰ Found ${busyTimes.length} busy periods for user: ${user.email}`);
      return {
        timeMin: startTime,
        timeMax: endTime,
        busy: busyTimes,
        calendars: Object.keys(calendars)
      };
    } catch (error) {
      console.error('Error fetching user availability:', error);
      throw error;
    }
  }

  // Create a new calendar event
  async createEvent(userId, calendarId = 'primary', eventData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      await this.setupUserAuth(user);
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const response = await calendar.events.insert({
        calendarId,
        requestBody: eventData
      });

      console.log(`✅ Created event for user: ${user.email}`, response.data.id);
      return response.data;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  // Update an existing calendar event
  async updateEvent(userId, calendarId = 'primary', eventId, eventData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      await this.setupUserAuth(user);
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const response = await calendar.events.update({
        calendarId,
        eventId,
        requestBody: eventData
      });

      console.log(`✅ Updated event for user: ${user.email}`, eventId);
      return response.data;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  }

  // Delete a calendar event
  async deleteEvent(userId, calendarId = 'primary', eventId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      await this.setupUserAuth(user);
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      await calendar.events.delete({
        calendarId,
        eventId
      });

      console.log(`✅ Deleted event for user: ${user.email}`, eventId);
      return { success: true };
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  }

  // Create a calendar event
  async createEvent(accessToken, refreshToken, calendarId, eventData) {
    try {
      this.oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const response = await calendar.events.insert({
        calendarId: calendarId || 'primary',
        resource: eventData,
        sendNotifications: true
      });

      console.log('✅ Calendar event created:', response.data.id);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating calendar event:', error.message);
      if (error.response) {
        console.error('API Error:', error.response.data);
      }
      throw error;
    }
  }

  // Get events from a calendar with date range
  async getEvents(accessToken, refreshToken, calendarId, timeMin, timeMax) {
    try {
      this.oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const response = await calendar.events.list({
        calendarId: calendarId || 'primary',
        timeMin: timeMin,
        timeMax: timeMax,
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.data.items || [];
    } catch (error) {
      console.error('❌ Error getting calendar events:', error.message);
      throw error;
    }
  }
}

module.exports = new CalendarService();