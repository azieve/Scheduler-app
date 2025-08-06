const { query } = require('../config/database');

class UserSettings {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.workingHours = data.working_hours;
    this.timezone = data.timezone;
    this.defaultBufferBefore = data.default_buffer_before;
    this.defaultBufferAfter = data.default_buffer_after;
    this.minimumNoticeMinutes = data.minimum_notice_minutes;
    this.maxAdvanceDays = data.max_advance_days;
    this.allowBackToBackBookings = data.allow_back_to_back_bookings;
    this.autoConfirmBookings = data.auto_confirm_bookings;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // Find user settings by user ID
  static async findByUserId(userId) {
    try {
      const result = await query(
        'SELECT * FROM user_settings WHERE user_id = $1',
        [userId]
      );
      
      if (result.rows.length === 0) {
        // Create default settings if none exist
        return await this.createDefault(userId);
      }
      
      return new UserSettings(result.rows[0]);
    } catch (error) {
      console.error('Error finding user settings:', error);
      throw error;
    }
  }

  // Create default settings for a user
  static async createDefault(userId) {
    try {
      const result = await query(
        `INSERT INTO user_settings (user_id) VALUES ($1) RETURNING *`,
        [userId]
      );

      return new UserSettings(result.rows[0]);
    } catch (error) {
      console.error('Error creating default user settings:', error);
      throw error;
    }
  }

  // Update user settings
  async update(updateData) {
    try {
      const allowedFields = [
        'working_hours', 'timezone', 'default_buffer_before', 
        'default_buffer_after', 'minimum_notice_minutes', 'max_advance_days',
        'allow_back_to_back_bookings', 'auto_confirm_bookings'
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
      values.push(this.userId);

      const result = await query(
        `UPDATE user_settings SET ${updates.join(', ')} WHERE user_id = $${paramCount} RETURNING *`,
        values
      );

      if (result.rows.length > 0) {
        Object.assign(this, this.constructor.parseRow(result.rows[0]));
      }

      return this;
    } catch (error) {
      console.error('Error updating user settings:', error);
      throw error;
    }
  }

  // Helper to parse database row
  static parseRow(row) {
    return {
      id: row.id,
      userId: row.user_id,
      workingHours: row.working_hours,
      timezone: row.timezone,
      defaultBufferBefore: row.default_buffer_before,
      defaultBufferAfter: row.default_buffer_after,
      minimumNoticeMinutes: row.minimum_notice_minutes,
      maxAdvanceDays: row.max_advance_days,
      allowBackToBackBookings: row.allow_back_to_back_bookings,
      autoConfirmBookings: row.auto_confirm_bookings,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // Check if user is available on a specific day
  isAvailableOnDay(dayOfWeek) {
    const day = this.getDayName(dayOfWeek);
    return this.workingHours[day]?.enabled || false;
  }

  // Get working hours for a specific day
  getWorkingHoursForDay(dayOfWeek) {
    const day = this.getDayName(dayOfWeek);
    if (!this.isAvailableOnDay(dayOfWeek)) {
      return null;
    }
    
    return {
      start: this.workingHours[day].start,
      end: this.workingHours[day].end
    };
  }

  // Helper to get day name from day index (0 = Sunday)
  getDayName(dayIndex) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[dayIndex];
  }

  // Get minimum booking time (current time + minimum notice)
  getMinimumBookingTime() {
    const now = new Date();
    return new Date(now.getTime() + (this.minimumNoticeMinutes * 60000));
  }

  // Get maximum booking time (current time + max advance days)
  getMaximumBookingTime() {
    const now = new Date();
    return new Date(now.getTime() + (this.maxAdvanceDays * 24 * 60 * 60 * 1000));
  }

  // Convert to JSON
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      workingHours: this.workingHours,
      timezone: this.timezone,
      defaultBufferBefore: this.defaultBufferBefore,
      defaultBufferAfter: this.defaultBufferAfter,
      minimumNoticeMinutes: this.minimumNoticeMinutes,
      maxAdvanceDays: this.maxAdvanceDays,
      allowBackToBackBookings: this.allowBackToBackBookings,
      autoConfirmBookings: this.autoConfirmBookings,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = UserSettings;