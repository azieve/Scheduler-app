const { query } = require('../config/database');

class Calendar {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.googleCalendarId = data.google_calendar_id;
    this.calendarName = data.calendar_name;
    this.calendarDescription = data.calendar_description;
    this.isPrimary = data.is_primary;
    this.isActive = data.is_active;
    this.backgroundColor = data.background_color;
    this.foregroundColor = data.foreground_color;
    this.accessRole = data.access_role;
    this.timezone = data.timezone;
    this.googleAccountId = data.google_account_id;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // Find calendar by ID
  static async findById(id) {
    try {
      const result = await query(
        'SELECT * FROM user_calendars WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new Calendar(result.rows[0]);
    } catch (error) {
      console.error('Error finding calendar by ID:', error);
      throw error;
    }
  }

  // Find calendars by user ID
  static async findByUserId(userId, activeOnly = false) {
    try {
      let sql = 'SELECT * FROM user_calendars WHERE user_id = $1';
      const params = [userId];
      
      if (activeOnly) {
        sql += ' AND is_active = true';
      }
      
      // Order by: 1) Primary first, 2) Active status, 3) Alphabetical
      sql += ' ORDER BY is_primary DESC, is_active DESC, calendar_name ASC';
      
      const result = await query(sql, params);
      
      return result.rows.map(row => new Calendar(row));
    } catch (error) {
      console.error('Error finding calendars by user ID:', error);
      throw error;
    }
  }

  // Find user's primary calendar
  static async findPrimaryByUserId(userId) {
    try {
      const result = await query(
        'SELECT * FROM user_calendars WHERE user_id = $1 AND is_primary = true AND is_active = true',
        [userId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new Calendar(result.rows[0]);
    } catch (error) {
      console.error('Error finding primary calendar:', error);
      throw error;
    }
  }

  // Find calendar by Google calendar ID and user ID
  static async findByGoogleCalendarId(userId, googleCalendarId) {
    try {
      const result = await query(
        'SELECT * FROM user_calendars WHERE user_id = $1 AND google_calendar_id = $2',
        [userId, googleCalendarId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new Calendar(result.rows[0]);
    } catch (error) {
      console.error('Error finding calendar by Google ID:', error);
      throw error;
    }
  }

  // Create new calendar
  static async create(calendarData) {
    try {
      const {
        userId,
        googleCalendarId,
        calendarName,
        calendarDescription = null,
        isPrimary = false,
        isActive = true,
        backgroundColor = null,
        foregroundColor = null,
        accessRole = 'owner',
        timezone = null
      } = calendarData;

      const result = await query(
        `INSERT INTO user_calendars (
          user_id, google_calendar_id, calendar_name, calendar_description,
          is_primary, is_active, background_color, foreground_color,
          access_role, timezone
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
        RETURNING *`,
        [
          userId,
          googleCalendarId,
          calendarName,
          calendarDescription,
          isPrimary,
          isActive,
          backgroundColor,
          foregroundColor,
          accessRole,
          timezone
        ]
      );

      return new Calendar(result.rows[0]);
    } catch (error) {
      console.error('Error creating calendar:', error);
      throw error;
    }
  }

  // Update calendar
  async update(updateData) {
    try {
      const allowedFields = [
        'calendar_name', 'calendar_description', 'is_primary', 'is_active',
        'background_color', 'foreground_color', 'access_role', 'timezone'
      ];
      
      const updates = [];
      const values = [];
      let paramCount = 1;

      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          updates.push(`${key} = $${paramCount}`);
          values.push(updateData[key]);
          paramCount++;
        }
      });

      if (updates.length === 0) {
        return this;
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(this.id);

      const result = await query(
        `UPDATE user_calendars SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      if (result.rows.length > 0) {
        Object.assign(this, new Calendar(result.rows[0]));
      }

      return this;
    } catch (error) {
      console.error('Error updating calendar:', error);
      throw error;
    }
  }

  // Delete calendar (hard delete)
  async delete() {
    try {
      console.log(`🗑️  Starting calendar deletion: "${this.calendarName}"`);
      console.log(`   Calendar ID: ${this.id}, User ID: ${this.userId}, Is Active: ${this.isActive}, Is Primary: ${this.isPrimary}`);
      
      // Only prevent deletion if this is an active calendar and it's the only active one
      if (this.isActive) {
        const userActiveCalendars = await Calendar.findByUserId(this.userId, true);
        if (userActiveCalendars.length <= 1) {
          throw new Error('Cannot delete the only active calendar. Please add another calendar first.');
        }
      }

      // If deleting the primary calendar, set another active calendar as primary
      if (this.isPrimary) {
        const userActiveCalendars = await Calendar.findByUserId(this.userId, true);
        const otherActiveCalendar = userActiveCalendars.find(cal => cal.id !== this.id);
        if (otherActiveCalendar) {
          await otherActiveCalendar.update({ is_primary: true });
        }
      }

      await query('DELETE FROM user_calendars WHERE id = $1', [this.id]);
      return { success: true };
    } catch (error) {
      console.error('Error deleting calendar:', error);
      throw error;
    }
  }

  // Set as primary calendar
  async setPrimary() {
    try {
      // This will automatically unset other primary calendars due to the trigger
      return await this.update({ is_primary: true });
    } catch (error) {
      console.error('Error setting primary calendar:', error);
      throw error;
    }
  }

  // Toggle active status
  async toggleActive() {
    try {
      return await this.update({ is_active: !this.isActive });
    } catch (error) {
      console.error('Error toggling calendar active status:', error);
      throw error;
    }
  }

  // Sync calendar data from Google Calendar API
  async syncFromGoogle(googleCalendarData) {
    try {
      const updateData = {
        calendar_name: googleCalendarData.summary || this.calendarName,
        calendar_description: googleCalendarData.description || this.calendarDescription,
        background_color: googleCalendarData.backgroundColor || this.backgroundColor,
        foreground_color: googleCalendarData.foregroundColor || this.foregroundColor,
        access_role: googleCalendarData.accessRole || this.accessRole,
        timezone: googleCalendarData.timeZone || this.timezone
      };

      return await this.update(updateData);
    } catch (error) {
      console.error('Error syncing calendar from Google:', error);
      throw error;
    }
  }

  // Sync all calendars for a user from Google Calendar API
  static async syncUserCalendarsFromGoogle(userId, googleCalendars) {
    try {
      const existingCalendars = await Calendar.findByUserId(userId);
      const existingGoogleIds = existingCalendars.map(cal => cal.googleCalendarId);
      
      // First, identify which calendar should be primary
      const googlePrimary = googleCalendars.find(cal => cal.primary === true);
      const userEmailCalendar = googleCalendars.find(cal => 
        cal.id && cal.id.includes('@gmail.com') && !cal.id.includes('#')
      );
      
      // Priority: 1) Google primary calendar 2) User's main email calendar 3) First calendar
      const shouldBePrimary = googlePrimary || userEmailCalendar || googleCalendars[0];
      
      // Create or update calendars from Google
      const syncedCalendars = [];
      for (const googleCal of googleCalendars) {
        let calendar = existingCalendars.find(cal => cal.googleCalendarId === googleCal.id);
        
        if (calendar) {
          // Update existing calendar, but don't change primary status during sync
          await calendar.syncFromGoogle(googleCal);
          syncedCalendars.push(calendar);
        } else {
          // Create new calendar - only set as primary if it's the identified primary
          const newCalendar = await Calendar.create({
            userId,
            googleCalendarId: googleCal.id,
            calendarName: googleCal.summary || 'Untitled Calendar',
            calendarDescription: googleCal.description,
            isPrimary: googleCal.id === shouldBePrimary?.id,
            backgroundColor: googleCal.backgroundColor,
            foregroundColor: googleCal.foregroundColor,
            accessRole: googleCal.accessRole || 'owner',
            timezone: googleCal.timeZone
          });
          syncedCalendars.push(newCalendar);
        }
      }

      // If no existing calendars had primary set, ensure the identified primary is set
      const currentPrimary = await Calendar.findPrimaryByUserId(userId);
      if (!currentPrimary && shouldBePrimary) {
        const primaryCalendar = syncedCalendars.find(cal => 
          cal.googleCalendarId === shouldBePrimary.id
        );
        if (primaryCalendar) {
          await primaryCalendar.setPrimary();
        }
      }

      // Optionally deactivate calendars that are no longer in Google
      const currentGoogleIds = googleCalendars.map(cal => cal.id);
      for (const existingCal of existingCalendars) {
        if (!currentGoogleIds.includes(existingCal.googleCalendarId)) {
          console.log(`Calendar ${existingCal.calendarName} no longer found in Google, deactivating`);
          await existingCal.update({ is_active: false });
        }
      }

      // Sort results so primary calendar appears first
      syncedCalendars.sort((a, b) => {
        if (a.isPrimary && !b.isPrimary) return -1;
        if (!a.isPrimary && b.isPrimary) return 1;
        return a.calendarName.localeCompare(b.calendarName);
      });

      console.log(`✅ Synced ${syncedCalendars.length} calendars for user`);
      return syncedCalendars;
    } catch (error) {
      console.error('Error syncing user calendars from Google:', error);
      throw error;
    }
  }

  // Get active calendar IDs for availability checking
  static async getActiveCalendarIds(userId) {
    try {
      const calendars = await Calendar.findByUserId(userId, true);
      return calendars.map(cal => cal.googleCalendarId);
    } catch (error) {
      console.error('Error getting active calendar IDs:', error);
      throw error;
    }
  }

  // Convert to JSON
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      googleCalendarId: this.googleCalendarId,
      calendarName: this.calendarName,
      calendarDescription: this.calendarDescription,
      isPrimary: this.isPrimary,
      isActive: this.isActive,
      backgroundColor: this.backgroundColor,
      foregroundColor: this.foregroundColor,
      accessRole: this.accessRole,
      timezone: this.timezone,
      googleAccountId: this.googleAccountId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Get formatted display name
  getDisplayName() {
    if (this.isPrimary) {
      return `${this.calendarName} (Primary)`;
    }
    return this.calendarName;
  }

  // Check if user has write access to this calendar
  canCreateEvents() {
    return ['owner', 'writer'].includes(this.accessRole);
  }

  // Get calendar color for display
  getDisplayColor() {
    return this.backgroundColor || '#4285f4';
  }
}

module.exports = Calendar;