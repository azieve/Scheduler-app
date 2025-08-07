const { query } = require('../config/database');

class Booking {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.meetingTypeId = data.meeting_type_id;
    this.attendeeName = data.attendee_name;
    this.attendeeEmail = data.attendee_email;
    this.attendeePhone = data.attendee_phone;
    this.startTime = data.start_time;
    this.endTime = data.end_time;
    this.timezone = data.timezone;
    this.status = data.status;
    this.googleEventId = data.google_event_id;
    this.meetingLink = data.meeting_link;
    this.notes = data.notes;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // Find booking by ID
  static async findById(id) {
    try {
      const result = await query(
        'SELECT * FROM bookings WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new Booking(result.rows[0]);
    } catch (error) {
      console.error('Error finding booking by ID:', error);
      throw error;
    }
  }

  // Find bookings by user ID
  static async findByUserId(userId) {
    try {
      const result = await query(
        `SELECT b.*, mt.name as meeting_type_name, mt.duration_minutes
         FROM bookings b 
         JOIN meeting_types mt ON b.meeting_type_id = mt.id 
         WHERE b.user_id = $1 
         ORDER BY b.start_time DESC`,
        [userId]
      );
      
      return result.rows.map(row => new Booking(row));
    } catch (error) {
      console.error('Error finding bookings by user ID:', error);
      throw error;
    }
  }

  // Create new booking
  static async create(bookingData) {
    try {
      const {
        userId,
        meetingTypeId,
        attendeeName,
        attendeeEmail,
        attendeePhone = null,
        startTime,
        endTime,
        timezone = 'UTC',
        notes = '',
        googleEventId = null,
        meetingLink = ''
      } = bookingData;

      const result = await query(
        `INSERT INTO bookings (
          user_id, meeting_type_id, attendee_name, attendee_email, 
          attendee_phone, start_time, end_time, timezone, 
          status, google_event_id, meeting_link, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
        RETURNING *`,
        [
          userId,
          meetingTypeId,
          attendeeName,
          attendeeEmail,
          attendeePhone,
          startTime,
          endTime,
          timezone,
          'confirmed',
          googleEventId,
          meetingLink,
          notes
        ]
      );

      return new Booking(result.rows[0]);
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }

  // Update booking
  async update(updateData) {
    try {
      const allowedFields = [
        'attendee_name', 'attendee_email', 'attendee_phone',
        'start_time', 'end_time', 'timezone', 'status', 
        'google_event_id', 'meeting_link', 'notes'
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
        `UPDATE bookings SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      if (result.rows.length > 0) {
        Object.assign(this, result.rows[0]);
      }

      return this;
    } catch (error) {
      console.error('Error updating booking:', error);
      throw error;
    }
  }

  // Cancel booking (soft delete)
  async cancel() {
    try {
      return await this.update({ status: 'cancelled' });
    } catch (error) {
      console.error('Error cancelling booking:', error);
      throw error;
    }
  }

  // Convert to JSON
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      meetingTypeId: this.meetingTypeId,
      attendeeName: this.attendeeName,
      attendeeEmail: this.attendeeEmail,
      attendeePhone: this.attendeePhone,
      startTime: this.startTime,
      endTime: this.endTime,
      timezone: this.timezone,
      status: this.status,
      googleEventId: this.googleEventId,
      meetingLink: this.meetingLink,
      notes: this.notes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Get formatted time range
  getFormattedTimeRange() {
    const start = new Date(this.startTime);
    const end = new Date(this.endTime);
    
    return `${start.toLocaleString()} - ${end.toLocaleTimeString()}`;
  }
}

module.exports = Booking;