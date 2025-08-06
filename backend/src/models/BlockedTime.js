const { query } = require('../config/database');

class BlockedTime {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.startTime = data.start_time;
    this.endTime = data.end_time;
    this.title = data.title;
    this.description = data.description;
    this.isRecurring = data.is_recurring;
    this.recurrencePattern = data.recurrence_pattern;
    this.recurrenceEndDate = data.recurrence_end_date;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // Find blocked times by user ID within a date range
  static async findByUserIdAndDateRange(userId, startDate, endDate) {
    try {
      const result = await query(
        `SELECT * FROM blocked_times 
         WHERE user_id = $1 
         AND ((start_time >= $2 AND start_time < $3) 
              OR (end_time > $2 AND end_time <= $3)
              OR (start_time < $2 AND end_time > $3))
         ORDER BY start_time`,
        [userId, startDate, endDate]
      );
      
      const blockedTimes = result.rows.map(row => new BlockedTime(row));
      
      // Expand recurring blocked times
      const expandedTimes = [];
      for (const blockedTime of blockedTimes) {
        if (blockedTime.isRecurring) {
          expandedTimes.push(...blockedTime.expandRecurring(startDate, endDate));
        } else {
          expandedTimes.push(blockedTime);
        }
      }
      
      return expandedTimes;
    } catch (error) {
      console.error('Error finding blocked times:', error);
      throw error;
    }
  }

  // Find blocked time by ID
  static async findById(id) {
    try {
      const result = await query(
        'SELECT * FROM blocked_times WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new BlockedTime(result.rows[0]);
    } catch (error) {
      console.error('Error finding blocked time by ID:', error);
      throw error;
    }
  }

  // Find all blocked times for a user
  static async findByUserId(userId) {
    try {
      const result = await query(
        'SELECT * FROM blocked_times WHERE user_id = $1 ORDER BY start_time',
        [userId]
      );
      
      return result.rows.map(row => new BlockedTime(row));
    } catch (error) {
      console.error('Error finding blocked times by user ID:', error);
      throw error;
    }
  }

  // Create new blocked time
  static async create(userId, blockedTimeData) {
    try {
      const {
        startTime,
        endTime,
        title = '',
        description = '',
        isRecurring = false,
        recurrencePattern = null,
        recurrenceEndDate = null
      } = blockedTimeData;

      const result = await query(
        `INSERT INTO blocked_times (
          user_id, start_time, end_time, title, description,
          is_recurring, recurrence_pattern, recurrence_end_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          userId, startTime, endTime, title, description,
          isRecurring, recurrencePattern, recurrenceEndDate
        ]
      );

      return new BlockedTime(result.rows[0]);
    } catch (error) {
      console.error('Error creating blocked time:', error);
      throw error;
    }
  }

  // Update blocked time
  async update(updateData) {
    try {
      const allowedFields = [
        'start_time', 'end_time', 'title', 'description',
        'is_recurring', 'recurrence_pattern', 'recurrence_end_date'
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
        `UPDATE blocked_times SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      if (result.rows.length > 0) {
        Object.assign(this, result.rows[0]);
      }

      return this;
    } catch (error) {
      console.error('Error updating blocked time:', error);
      throw error;
    }
  }

  // Delete blocked time
  async delete() {
    try {
      await query('DELETE FROM blocked_times WHERE id = $1', [this.id]);
      return true;
    } catch (error) {
      console.error('Error deleting blocked time:', error);
      throw error;
    }
  }

  // Expand recurring blocked times within a date range
  expandRecurring(startDate, endDate) {
    if (!this.isRecurring || !this.recurrencePattern) {
      return [this];
    }

    const expandedTimes = [];
    const pattern = this.recurrencePattern;
    const currentDate = new Date(this.startTime);
    const endDate_final = this.recurrenceEndDate ? 
      new Date(Math.min(new Date(this.recurrenceEndDate), new Date(endDate))) : 
      new Date(endDate);

    if (pattern.type === 'weekly' && pattern.days) {
      while (currentDate <= endDate_final) {
        const dayName = this.getDayName(currentDate.getDay());
        
        if (pattern.days.includes(dayName) && currentDate >= new Date(startDate)) {
          const duration = new Date(this.endTime) - new Date(this.startTime);
          const newStartTime = new Date(currentDate);
          const newEndTime = new Date(currentDate.getTime() + duration);
          
          expandedTimes.push(new BlockedTime({
            id: `${this.id}-${currentDate.toISOString().split('T')[0]}`,
            user_id: this.userId,
            start_time: newStartTime,
            end_time: newEndTime,
            title: this.title,
            description: this.description,
            is_recurring: false
          }));
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return expandedTimes;
  }

  // Helper to get day name from day index
  getDayName(dayIndex) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[dayIndex];
  }

  // Check if this blocked time conflicts with a given time range
  conflictsWith(startTime, endTime) {
    const blockStart = new Date(this.startTime);
    const blockEnd = new Date(this.endTime);
    const testStart = new Date(startTime);
    const testEnd = new Date(endTime);

    return (testStart < blockEnd && testEnd > blockStart);
  }

  // Convert to JSON
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      startTime: this.startTime,
      endTime: this.endTime,
      title: this.title,
      description: this.description,
      isRecurring: this.isRecurring,
      recurrencePattern: this.recurrencePattern,
      recurrenceEndDate: this.recurrenceEndDate,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = BlockedTime;