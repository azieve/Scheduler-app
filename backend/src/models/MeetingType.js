const { query } = require('../config/database');
const crypto = require('crypto');

class MeetingType {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.name = data.name;
    this.description = data.description;
    this.durationMinutes = data.duration_minutes;
    this.bufferBeforeMinutes = data.buffer_before_minutes;
    this.bufferAfterMinutes = data.buffer_after_minutes;
    this.isActive = data.is_active;
    this.publicSlug = data.public_slug;
    this.location = data.location;
    this.meetingLink = data.meeting_link;
    this.color = data.color;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // Find meeting type by ID
  static async findById(id) {
    try {
      const result = await query(
        'SELECT * FROM meeting_types WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new MeetingType(result.rows[0]);
    } catch (error) {
      console.error('Error finding meeting type by ID:', error);
      throw error;
    }
  }

  // Find meeting type by public slug
  static async findBySlug(slug) {
    try {
      const result = await query(
        'SELECT * FROM meeting_types WHERE public_slug = $1 AND is_active = true',
        [slug]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new MeetingType(result.rows[0]);
    } catch (error) {
      console.error('Error finding meeting type by slug:', error);
      throw error;
    }
  }

  // Get all meeting types for a user
  static async findByUserId(userId, includeInactive = false) {
    try {
      const whereClause = includeInactive 
        ? 'WHERE user_id = $1' 
        : 'WHERE user_id = $1 AND is_active = true';
      
      const result = await query(
        `SELECT * FROM meeting_types ${whereClause} ORDER BY created_at DESC`,
        [userId]
      );
      
      return result.rows.map(row => new MeetingType(row));
    } catch (error) {
      console.error('Error finding meeting types by user ID:', error);
      throw error;
    }
  }

  // Generate unique slug
  static generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim('-'); // Remove leading/trailing hyphens
  }

  // Check if slug is available
  static async isSlugAvailable(slug, excludeId = null) {
    try {
      const params = [slug];
      let whereClause = 'WHERE public_slug = $1';
      
      if (excludeId) {
        whereClause += ' AND id != $2';
        params.push(excludeId);
      }
      
      const result = await query(
        `SELECT id FROM meeting_types ${whereClause}`,
        params
      );
      
      return result.rows.length === 0;
    } catch (error) {
      console.error('Error checking slug availability:', error);
      throw error;
    }
  }

  // Create new meeting type
  static async create(userId, meetingData) {
    try {
      const {
        name,
        description = '',
        durationMinutes = 30,
        bufferBeforeMinutes = 0,
        bufferAfterMinutes = 0,
        location = '',
        meetingLink = '',
        color = '#4285F4'
      } = meetingData;

      // Generate unique slug
      let baseSlug = this.generateSlug(name);
      let slug = baseSlug;
      let counter = 1;
      
      while (!(await this.isSlugAvailable(slug))) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      const result = await query(
        `INSERT INTO meeting_types (
          user_id, name, description, duration_minutes, 
          buffer_before_minutes, buffer_after_minutes, 
          public_slug, location, meeting_link, color, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
        RETURNING *`,
        [
          userId,
          name,
          description,
          durationMinutes,
          bufferBeforeMinutes,
          bufferAfterMinutes,
          slug,
          location,
          meetingLink,
          color,
          true
        ]
      );

      return new MeetingType(result.rows[0]);
    } catch (error) {
      console.error('Error creating meeting type:', error);
      throw error;
    }
  }

  // Update meeting type
  async update(updateData) {
    try {
      const allowedFields = [
        'name', 'description', 'duration_minutes', 
        'buffer_before_minutes', 'buffer_after_minutes',
        'location', 'meeting_link', 'color', 'is_active'
      ];
      
      const updates = [];
      const values = [];
      let paramCount = 1;

      // Handle slug update if name changed
      if (updateData.name && updateData.name !== this.name) {
        const newSlug = MeetingType.generateSlug(updateData.name);
        if (await MeetingType.isSlugAvailable(newSlug, this.id)) {
          updateData.public_slug = newSlug;
          allowedFields.push('public_slug');
        }
      }

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
        `UPDATE meeting_types SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      if (result.rows.length > 0) {
        Object.assign(this, result.rows[0]);
      }

      return this;
    } catch (error) {
      console.error('Error updating meeting type:', error);
      throw error;
    }
  }

  // Delete meeting type (soft delete)
  async delete() {
    try {
      await this.update({ is_active: false });
      return true;
    } catch (error) {
      console.error('Error deleting meeting type:', error);
      throw error;
    }
  }

  // Get booking URL
  getBookingUrl(baseUrl = 'http://localhost:3000') {
    return `${baseUrl}/book/${this.publicSlug}`;
  }

  // Convert to JSON
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      name: this.name,
      description: this.description,
      durationMinutes: this.durationMinutes,
      bufferBeforeMinutes: this.bufferBeforeMinutes,
      bufferAfterMinutes: this.bufferAfterMinutes,
      isActive: this.isActive,
      publicSlug: this.publicSlug,
      location: this.location,
      meetingLink: this.meetingLink,
      color: this.color,
      bookingUrl: this.getBookingUrl(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Get total meeting duration including buffers
  getTotalDuration() {
    return this.durationMinutes + this.bufferBeforeMinutes + this.bufferAfterMinutes;
  }

  // Format duration for display
  getFormattedDuration() {
    const hours = Math.floor(this.durationMinutes / 60);
    const minutes = this.durationMinutes % 60;
    
    if (hours === 0) {
      return `${minutes}min`;
    } else if (minutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${minutes}min`;
    }
  }
}

module.exports = MeetingType;