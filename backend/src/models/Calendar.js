const { query } = require('../config/database');

/**
 * Calendar Model - Bottom level of hierarchy (User -> Account -> Calendar)
 * Represents individual calendars from Google accounts
 */
class Calendar {
  constructor(data) {
    this.id = data.id;
    this.accountId = data.account_id;
    this.userId = data.user_id;
    this.googleCalendarId = data.google_calendar_id;
    this.calendarName = data.calendar_name;
    this.calendarDescription = data.calendar_description;
    this.backgroundColor = data.background_color;
    this.foregroundColor = data.foreground_color;
    this.accessRole = data.access_role;
    this.timezone = data.timezone;
    this.isPrimary = data.is_primary;
    this.isActive = data.is_active;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // ==============================================================================
  // STATIC METHODS (FINDERS)
  // ==============================================================================

  /**
   * Find calendar by ID
   */
  static async findById(id) {
    try {
      const result = await query(
        'SELECT * FROM calendars WHERE id = $1',
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

  /**
   * Find all calendars for a user (across all their accounts)
   */
  static async findByUserId(userId, activeOnly = false) {
    try {
      let sql = `
        SELECT c.*, a.google_email as account_email, a.is_primary as account_is_primary
        FROM calendars c
        JOIN accounts a ON c.account_id = a.id
        WHERE c.user_id = $1
      `;
      const params = [userId];
      
      if (activeOnly) {
        sql += ' AND c.is_active = true AND a.is_active = true';
      }
      
      // Order by: 1) Primary calendar first, 2) Account primary status, 3) Active status, 4) Name
      sql += ' ORDER BY c.is_primary DESC, a.is_primary DESC, c.is_active DESC, c.calendar_name ASC';
      
      const result = await query(sql, params);
      
      return result.rows.map(row => {
        const calendar = new Calendar(row);
        calendar.accountEmail = row.account_email; // Add account context
        calendar.accountIsPrimary = row.account_is_primary;
        return calendar;
      });
    } catch (error) {
      console.error('Error finding calendars by user ID:', error);
      throw error;
    }
  }

  /**
   * Find all calendars for a specific account
   */
  static async findByAccountId(accountId, activeOnly = false) {
    try {
      let sql = 'SELECT * FROM calendars WHERE account_id = $1';
      const params = [accountId];
      
      if (activeOnly) {
        sql += ' AND is_active = true';
      }
      
      // Order by: 1) Primary calendar first, 2) Active status, 3) Name
      sql += ' ORDER BY is_primary DESC, is_active DESC, calendar_name ASC';
      
      const result = await query(sql, params);
      
      return result.rows.map(row => new Calendar(row));
    } catch (error) {
      console.error('Error finding calendars by account ID:', error);
      throw error;
    }
  }

  /**
   * Find the primary calendar for a user
   */
  static async findPrimaryByUserId(userId) {
    try {
      const result = await query(`
        SELECT c.*, a.google_email as account_email 
        FROM calendars c
        JOIN accounts a ON c.account_id = a.id
        WHERE c.user_id = $1 AND c.is_primary = true AND c.is_active = true AND a.is_active = true
      `, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const calendar = new Calendar(result.rows[0]);
      calendar.accountEmail = result.rows[0].account_email;
      return calendar;
    } catch (error) {
      console.error('Error finding primary calendar:', error);
      throw error;
    }
  }

  /**
   * Find calendar by Google Calendar ID and user ID
   */
  static async findByGoogleCalendarId(userId, googleCalendarId) {
    try {
      const result = await query(
        'SELECT * FROM calendars WHERE user_id = $1 AND google_calendar_id = $2',
        [userId, googleCalendarId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new Calendar(result.rows[0]);
    } catch (error) {
      console.error('Error finding calendar by Google Calendar ID:', error);
      throw error;
    }
  }

  // ==============================================================================
  // STATIC METHODS (CREATORS)
  // ==============================================================================

  /**
   * Create a new calendar
   */
  static async create(calendarData) {
    try {
      const {
        accountId,
        userId,
        googleCalendarId,
        calendarName,
        calendarDescription = null,
        backgroundColor = null,
        foregroundColor = null,
        accessRole,
        timezone = null,
        isPrimary = false,
        isActive = true
      } = calendarData;

      const result = await query(`
        INSERT INTO calendars (
          account_id, user_id, google_calendar_id, calendar_name,
          calendar_description, background_color, foreground_color,
          access_role, timezone, is_primary, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
        RETURNING *
      `, [
        accountId, userId, googleCalendarId, calendarName,
        calendarDescription, backgroundColor, foregroundColor,
        accessRole, timezone, isPrimary, isActive
      ]);

      console.log(`✅ Created calendar: ${calendarName} (Account ID: ${accountId})`);
      return new Calendar(result.rows[0]);
    } catch (error) {
      console.error('Error creating calendar:', error);
      throw error;
    }
  }

  /**
   * Create or update calendar from Google Calendar data
   * @param {boolean} allowReinstateDeleted - Whether to reinstate previously deleted calendars (default: false)
   */
  static async createOrUpdateFromGoogle(accountId, userId, googleCalendarData, allowReinstateDeleted = false) {
    try {
      const {
        id: googleCalendarId,
        summary: calendarName,
        description: calendarDescription,
        backgroundColor,
        foregroundColor,
        accessRole,
        timeZone: timezone,
        primary = false
      } = googleCalendarData;

      // Check if this calendar was intentionally deleted by the user
      const deletedCalendar = await query(`
        SELECT * FROM deleted_calendars 
        WHERE user_id = $1 AND google_calendar_id = $2 AND deleted_by_user = true
      `, [userId, googleCalendarId]);

      if (deletedCalendar.rows.length > 0) {
        if (allowReinstateDeleted) {
          // Clear the deletion record to allow reinstatement
          console.log(`🔄 Reinstating previously deleted calendar: "${calendarName}"`);
          await query(`
            DELETE FROM deleted_calendars 
            WHERE user_id = $1 AND google_calendar_id = $2 AND deleted_by_user = true
          `, [userId, googleCalendarId]);
        } else {
          console.log(`🚫 Skipping calendar "${calendarName}" - was intentionally deleted by user`);
          return null; // Don't recreate intentionally deleted calendars
        }
      }

      // Check if calendar already exists
      const existingCalendar = await Calendar.findByGoogleCalendarId(userId, googleCalendarId);
      
      if (existingCalendar) {
        // Update existing calendar
        console.log(`🔄 Updating existing calendar: ${calendarName}`);
        return await existingCalendar.update({
          calendar_name: calendarName,
          calendar_description: calendarDescription,
          background_color: backgroundColor,
          foreground_color: foregroundColor,
          access_role: accessRole,
          timezone: timezone,
          account_id: accountId // Update account association
        });
      } else {
        // Create new calendar
        console.log(`➕ Creating new calendar: ${calendarName}`);
        return await Calendar.create({
          accountId,
          userId,
          googleCalendarId,
          calendarName,
          calendarDescription,
          backgroundColor,
          foregroundColor,
          accessRole,
          timezone,
          isPrimary: primary, // Google's primary calendar
          isActive: true
        });
      }
    } catch (error) {
      console.error('Error creating/updating calendar from Google data:', error);
      throw error;
    }
  }

  // ==============================================================================
  // INSTANCE METHODS (MODIFIERS)
  // ==============================================================================

  /**
   * Update calendar data
   */
  async update(updateData) {
    try {
      const allowedFields = [
        'calendar_name', 'calendar_description', 'background_color', 
        'foreground_color', 'access_role', 'timezone', 'is_active',
        'account_id' // Allow updating account association
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

      // Note: is_primary is not in allowedFields - use setPrimary() method instead
      
      if (updates.length === 0) {
        return this;
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(this.id);

      const result = await query(`
        UPDATE calendars 
        SET ${updates.join(', ')} 
        WHERE id = $${paramCount} 
        RETURNING *
      `, values);

      if (result.rows.length > 0) {
        Object.assign(this, new Calendar(result.rows[0]));
        console.log(`✅ Updated calendar: ${this.calendarName}`);
      }

      return this;
    } catch (error) {
      console.error('Error updating calendar:', error);
      throw error;
    }
  }

  /**
   * Set this calendar as the primary calendar for the user
   */
  async setPrimary() {
    try {
      console.log(`👑 Setting calendar as primary: ${this.calendarName}`);

      // The database trigger will handle unsetting other primary calendars
      const result = await query(`
        UPDATE calendars 
        SET is_primary = true, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 
        RETURNING *
      `, [this.id]);

      if (result.rows.length > 0) {
        Object.assign(this, new Calendar(result.rows[0]));
        console.log(`✅ Set primary calendar: ${this.calendarName}`);
      }

      return this;
    } catch (error) {
      console.error('Error setting primary calendar:', error);
      throw error;
    }
  }

  /**
   * Activate/deactivate calendar
   */
  async setActive(isActive) {
    try {
      console.log(`${isActive ? '✅' : '⏸️'} ${isActive ? 'Activating' : 'Deactivating'} calendar: ${this.calendarName}`);
      
      return await this.update({ is_active: isActive });
    } catch (error) {
      console.error('Error setting calendar active status:', error);
      throw error;
    }
  }

  /**
   * Toggle active status
   */
  async toggleActive() {
    try {
      return await this.setActive(!this.isActive);
    } catch (error) {
      console.error('Error toggling calendar active status:', error);
      throw error;
    }
  }

  /**
   * Delete calendar
   */
  async delete() {
    try {
      console.log(`🗑️  Attempting to delete calendar: ${this.calendarName}`);

      // If this is the primary calendar, we should warn but allow deletion
      // (the user can set another calendar as primary later)
      if (this.isPrimary) {
        console.log('⚠️  Deleting primary calendar - user should select a new primary calendar');
      }

      // Record this calendar as intentionally deleted to prevent recreation during sync
      console.log(`📝 Recording calendar deletion to prevent sync recreation`);
      await query(`
        INSERT INTO deleted_calendars (user_id, account_id, google_calendar_id, calendar_name, deleted_by_user)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, google_calendar_id) DO UPDATE SET
          deleted_at = CURRENT_TIMESTAMP,
          deleted_by_user = $5
      `, [this.userId, this.accountId, this.googleCalendarId, this.calendarName, true]);

      const result = await query(
        'DELETE FROM calendars WHERE id = $1 RETURNING calendar_name',
        [this.id]
      );

      if (result.rows.length === 0) {
        throw new Error('Calendar not found or already deleted');
      }

      console.log(`✅ Deleted calendar: ${result.rows[0].calendar_name}`);
      
      return { 
        success: true, 
        deletedCalendar: result.rows[0].calendar_name,
        wasPrimary: this.isPrimary,
        message: 'Calendar deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting calendar:', error);
      throw error;
    }
  }

  // ==============================================================================
  // INSTANCE METHODS (GETTERS)
  // ==============================================================================

  /**
   * Get the account that owns this calendar
   */
  async getAccount() {
    try {
      const Account = require('./Account'); // Avoid circular dependency
      return await Account.findById(this.accountId);
    } catch (error) {
      console.error('Error getting calendar account:', error);
      throw error;
    }
  }

  /**
   * Check if this calendar belongs to the primary account
   */
  async belongsToPrimaryAccount() {
    try {
      const account = await this.getAccount();
      return account ? account.isPrimary : false;
    } catch (error) {
      console.error('Error checking if calendar belongs to primary account:', error);
      return false;
    }
  }

  /**
   * Get formatted calendar name with context
   */
  getDisplayName() {
    let name = this.calendarName;
    if (this.isPrimary) {
      name += ' (Primary)';
    }
    return name;
  }

  /**
   * Get access role display text
   */
  getAccessRoleText() {
    const roleMap = {
      'owner': 'Owner',
      'writer': 'Can Edit', 
      'reader': 'Read Only'
    };
    return roleMap[this.accessRole] || this.accessRole;
  }

  /**
   * Get calendar status
   */
  getStatus() {
    if (this.isPrimary) return 'primary';
    if (this.isActive) return 'active';
    return 'inactive';
  }

  // ==============================================================================
  // SERIALIZATION
  // ==============================================================================

  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      id: this.id,
      accountId: this.accountId,
      userId: this.userId,
      googleCalendarId: this.googleCalendarId,
      calendarName: this.calendarName,
      calendarDescription: this.calendarDescription,
      backgroundColor: this.backgroundColor,
      foregroundColor: this.foregroundColor,
      accessRole: this.accessRole,
      timezone: this.timezone,
      isPrimary: this.isPrimary,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      // Include computed fields if available
      ...(this.accountEmail && { accountEmail: this.accountEmail }),
      ...(this.accountIsPrimary !== undefined && { accountIsPrimary: this.accountIsPrimary })
    };
  }

  /**
   * Convert to JSON with additional context
   */
  toJSONWithContext() {
    return {
      ...this.toJSON(),
      displayName: this.getDisplayName(),
      accessRoleText: this.getAccessRoleText(),
      status: this.getStatus()
    };
  }

  // ==============================================================================
  // STATIC METHODS (DELETION MANAGEMENT)
  // ==============================================================================

  /**
   * Remove a calendar from the deleted list (allow it to be synced again)
   */
  static async unmarkAsDeleted(userId, googleCalendarId) {
    try {
      console.log(`♻️  Unmarking calendar as deleted: ${googleCalendarId}`);
      
      const result = await query(`
        DELETE FROM deleted_calendars 
        WHERE user_id = $1 AND google_calendar_id = $2
        RETURNING calendar_name
      `, [userId, googleCalendarId]);

      if (result.rows.length > 0) {
        console.log(`✅ Calendar unmarked as deleted: ${result.rows[0].calendar_name}`);
        return { success: true, calendarName: result.rows[0].calendar_name };
      } else {
        console.log(`ℹ️  Calendar was not marked as deleted: ${googleCalendarId}`);
        return { success: false, message: 'Calendar was not marked as deleted' };
      }
    } catch (error) {
      console.error('Error unmarking calendar as deleted:', error);
      throw error;
    }
  }

  /**
   * Get list of deleted calendars for a user
   */
  static async getDeletedCalendars(userId) {
    try {
      const result = await query(`
        SELECT google_calendar_id, calendar_name, deleted_at, account_id
        FROM deleted_calendars 
        WHERE user_id = $1 AND deleted_by_user = true
        ORDER BY deleted_at DESC
      `, [userId]);

      return result.rows;
    } catch (error) {
      console.error('Error fetching deleted calendars:', error);
      throw error;
    }
  }
}

module.exports = Calendar;