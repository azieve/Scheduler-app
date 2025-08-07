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
    
    // Advanced meeting type settings
    this.meetingType = data.meeting_type || 'video_call';
    this.videoProvider = data.video_provider || 'google_meet';
    this.customMeetingLink = data.custom_meeting_link || '';
    this.autoGenerateLink = data.auto_generate_link !== false;
    
    // Phone call settings
    this.phoneNumber = data.phone_number || '';
    this.dialInNumber = data.dial_in_number || '';
    this.phoneInstructions = data.phone_instructions || '';
    
    // In-person meeting settings
    this.meetingAddress = data.meeting_address || '';
    this.meetingRoom = data.meeting_room || '';
    this.parkingInstructions = data.parking_instructions || '';
    
    // Meeting instructions
    this.preMeetingInstructions = data.pre_meeting_instructions || '';
    this.postMeetingInstructions = data.post_meeting_instructions || '';
    this.attendeeQuestions = data.attendee_questions || [];
    this.requireConfirmation = data.require_confirmation || false;
    
    // Gmail notifications
    this.gmailNotifications = data.gmail_notifications || {
      enabled: true,
      reminder_minutes: [60, 15],
      custom_title: '',
      custom_description: '',
      include_meeting_link: true,
      include_agenda: true,
      include_preparation_notes: true
    };
    
    // Additional settings
    this.maxAttendees = data.max_attendees || 1;
    this.allowGuests = data.allow_guests || false;
    this.calendarVisibility = data.calendar_visibility || 'busy';
    this.bookingCancellationPolicy = data.booking_cancellation_policy || '';
    
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
        color = '#4285F4',
        
        // Advanced settings
        meetingType = 'video_call',
        videoProvider = 'google_meet',
        customMeetingLink = '',
        autoGenerateLink = true,
        
        // Phone settings
        phoneNumber = '',
        dialInNumber = '',
        phoneInstructions = '',
        
        // In-person settings
        meetingAddress = '',
        meetingRoom = '',
        parkingInstructions = '',
        
        // Instructions
        preMeetingInstructions = '',
        postMeetingInstructions = '',
        attendeeQuestions = [],
        requireConfirmation = false,
        
        // Gmail notifications
        gmailNotifications = {
          enabled: true,
          reminder_minutes: [60, 15],
          custom_title: '',
          custom_description: '',
          include_meeting_link: true,
          include_agenda: true,
          include_preparation_notes: true
        },
        
        // Additional settings
        maxAttendees = 1,
        allowGuests = false,
        calendarVisibility = 'busy',
        bookingCancellationPolicy = ''
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
          public_slug, location, meeting_link, color, is_active,
          meeting_type, video_provider, custom_meeting_link, auto_generate_link,
          phone_number, dial_in_number, phone_instructions,
          meeting_address, meeting_room, parking_instructions,
          pre_meeting_instructions, post_meeting_instructions, 
          attendee_questions, require_confirmation, gmail_notifications,
          max_attendees, allow_guests, calendar_visibility, booking_cancellation_policy
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
                 $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30) 
        RETURNING *`,
        [
          userId, name, description, durationMinutes, bufferBeforeMinutes, bufferAfterMinutes,
          slug, location, meetingLink, color, true,
          meetingType, videoProvider, customMeetingLink, autoGenerateLink,
          phoneNumber, dialInNumber, phoneInstructions,
          meetingAddress, meetingRoom, parkingInstructions,
          preMeetingInstructions, postMeetingInstructions, 
          JSON.stringify(attendeeQuestions), requireConfirmation, JSON.stringify(gmailNotifications),
          maxAttendees, allowGuests, calendarVisibility, bookingCancellationPolicy
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
        'location', 'meeting_link', 'color', 'is_active',
        'meeting_type', 'video_provider', 'custom_meeting_link', 'auto_generate_link',
        'phone_number', 'dial_in_number', 'phone_instructions',
        'meeting_address', 'meeting_room', 'parking_instructions',
        'pre_meeting_instructions', 'post_meeting_instructions', 
        'attendee_questions', 'require_confirmation', 'gmail_notifications',
        'max_attendees', 'allow_guests', 'calendar_visibility', 'booking_cancellation_policy'
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
          // Handle JSON fields
          if (key === 'attendee_questions' || key === 'gmail_notifications') {
            values.push(JSON.stringify(updateData[key]));
          } else {
            values.push(updateData[key]);
          }
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

  // Get booking URL (requires user object)
  getBookingUrl(user, baseUrl = 'http://localhost:3000') {
    if (!user || !user.username) {
      return `${baseUrl}/book/[username]/${this.publicSlug}`;
    }
    return `${baseUrl}/${user.username}/${this.publicSlug}`;
  }

  // Convert to JSON (requires user object for booking URL)
  toJSON(user = null) {
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
      
      // Advanced meeting type settings
      meetingType: this.meetingType,
      videoProvider: this.videoProvider,
      customMeetingLink: this.customMeetingLink,
      autoGenerateLink: this.autoGenerateLink,
      
      // Phone call settings
      phoneNumber: this.phoneNumber,
      dialInNumber: this.dialInNumber,
      phoneInstructions: this.phoneInstructions,
      
      // In-person meeting settings
      meetingAddress: this.meetingAddress,
      meetingRoom: this.meetingRoom,
      parkingInstructions: this.parkingInstructions,
      
      // Meeting instructions
      preMeetingInstructions: this.preMeetingInstructions,
      postMeetingInstructions: this.postMeetingInstructions,
      attendeeQuestions: this.attendeeQuestions,
      requireConfirmation: this.requireConfirmation,
      
      // Gmail notifications
      gmailNotifications: this.gmailNotifications,
      
      // Additional settings
      maxAttendees: this.maxAttendees,
      allowGuests: this.allowGuests,
      calendarVisibility: this.calendarVisibility,
      bookingCancellationPolicy: this.bookingCancellationPolicy,
      
      bookingUrl: this.getBookingUrl(user),
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

  // Get meeting type display name
  getMeetingTypeDisplayName() {
    const typeNames = {
      'video_call': 'Video Call',
      'phone_call': 'Phone Call',
      'in_person': 'In-Person Meeting'
    };
    return typeNames[this.meetingType] || 'Video Call';
  }

  // Get video provider display name
  getVideoProviderDisplayName() {
    const providerNames = {
      'google_meet': 'Google Meet',
      'zoom': 'Zoom',
      'teams': 'Microsoft Teams',
      'custom': 'Custom Link'
    };
    return providerNames[this.videoProvider] || 'Google Meet';
  }

  // Get the effective meeting link for booking
  getEffectiveMeetingLink(generatedLink = null) {
    if (this.meetingType !== 'video_call') {
      return null;
    }
    
    if (!this.autoGenerateLink) {
      return this.customMeetingLink || this.meetingLink;
    }
    
    return generatedLink || this.meetingLink;
  }

  // Get location details for display
  getLocationDetails() {
    switch (this.meetingType) {
      case 'video_call':
        return {
          type: 'video',
          display: `${this.getVideoProviderDisplayName()} Video Call`,
          details: this.customMeetingLink || 'Link will be provided'
        };
      case 'phone_call':
        return {
          type: 'phone',
          display: 'Phone Call',
          details: this.phoneNumber || 'Phone number will be provided'
        };
      case 'in_person':
        return {
          type: 'in_person',
          display: 'In-Person Meeting',
          details: this.meetingAddress || this.location || 'Location will be provided'
        };
      default:
        return {
          type: 'video',
          display: 'Video Call',
          details: 'Meeting details will be provided'
        };
    }
  }

  // Validate meeting type configuration
  validateConfiguration() {
    const errors = [];

    if (this.meetingType === 'video_call' && !this.autoGenerateLink && !this.customMeetingLink) {
      errors.push('Video call meetings must have either auto-generated links or custom meeting links');
    }

    if (this.meetingType === 'phone_call' && !this.phoneNumber) {
      errors.push('Phone call meetings must have a phone number');
    }

    if (this.meetingType === 'in_person' && !this.meetingAddress && !this.location) {
      errors.push('In-person meetings must have a meeting address');
    }

    if (this.maxAttendees < 1) {
      errors.push('Maximum attendees must be at least 1');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get calendar event details for Gmail integration
  getCalendarEventDetails(booking = {}) {
    const location = this.getLocationDetails();
    const notifications = this.gmailNotifications;
    
    let eventDetails = {
      summary: notifications.custom_title || `${this.name} with ${booking.attendeeName || 'Guest'}`,
      description: this.buildEventDescription(booking),
      location: location.details,
      visibility: this.calendarVisibility,
      reminders: {
        useDefault: false,
        overrides: notifications.reminder_minutes.map(minutes => ({
          method: 'email',
          minutes: minutes
        }))
      }
    };

    return eventDetails;
  }

  // Build event description for calendar
  buildEventDescription(booking = {}) {
    const notifications = this.gmailNotifications;
    let description = [];

    // Custom description or default
    if (notifications.custom_description) {
      description.push(notifications.custom_description);
    } else if (this.description) {
      description.push(this.description);
    }

    // Meeting type specific details
    const location = this.getLocationDetails();
    if (notifications.include_meeting_link && location.type === 'video' && booking.meetingLink) {
      description.push(`\n🔗 Join the meeting: ${booking.meetingLink}`);
    }

    if (location.type === 'phone') {
      description.push(`\n📞 Phone: ${this.phoneNumber}`);
      if (this.dialInNumber) {
        description.push(`\n📞 Dial-in: ${this.dialInNumber}`);
      }
    }

    if (location.type === 'in_person') {
      description.push(`\n📍 Location: ${this.meetingAddress || this.location}`);
      if (this.meetingRoom) {
        description.push(`\n🏢 Room: ${this.meetingRoom}`);
      }
    }

    // Pre-meeting instructions
    if (notifications.include_preparation_notes && this.preMeetingInstructions) {
      description.push(`\n📋 Preparation:\n${this.preMeetingInstructions}`);
    }

    // Additional instructions
    if (location.type === 'phone' && this.phoneInstructions) {
      description.push(`\n📱 Phone Instructions:\n${this.phoneInstructions}`);
    }

    if (location.type === 'in_person' && this.parkingInstructions) {
      description.push(`\n🚗 Parking:\n${this.parkingInstructions}`);
    }

    // Cancellation policy
    if (this.bookingCancellationPolicy) {
      description.push(`\n❌ Cancellation Policy:\n${this.bookingCancellationPolicy}`);
    }

    return description.join('\n');
  }
}

module.exports = MeetingType;