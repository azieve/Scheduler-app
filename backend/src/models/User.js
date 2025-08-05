const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.username = data.username;
    this.firstName = data.first_name;
    this.lastName = data.last_name;
    this.googleId = data.google_id;
    this.googleAccessToken = data.google_access_token;
    this.googleRefreshToken = data.google_refresh_token;
    this.timezone = data.timezone;
    this.isVerified = data.is_verified;
    this.isActive = data.is_active;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // Find user by ID
  static async findById(id) {
    try {
      const result = await query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new User(result.rows[0]);
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  // Find user by Google ID
  static async findByGoogleId(googleId) {
    try {
      const result = await query(
        'SELECT * FROM users WHERE google_id = $1',
        [googleId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new User(result.rows[0]);
    } catch (error) {
      console.error('Error finding user by Google ID:', error);
      throw error;
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      const result = await query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new User(result.rows[0]);
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  // Find user by username
  static async findByUsername(username) {
    try {
      const result = await query(
        'SELECT * FROM users WHERE username = $1',
        [username]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new User(result.rows[0]);
    } catch (error) {
      console.error('Error finding user by username:', error);
      throw error;
    }
  }

  // Generate username from email
  static generateUsername(email) {
    return email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  // Check if username is available
  static async isUsernameAvailable(username, excludeId = null) {
    try {
      const params = [username];
      let whereClause = 'WHERE username = $1';
      
      if (excludeId) {
        whereClause += ' AND id != $2';
        params.push(excludeId);
      }
      
      const result = await query(
        `SELECT id FROM users ${whereClause}`,
        params
      );
      
      return result.rows.length === 0;
    } catch (error) {
      console.error('Error checking username availability:', error);
      throw error;
    }
  }

  // Create new user
  static async create(userData) {
    try {
      const {
        email,
        firstName,
        lastName,
        googleId,
        googleAccessToken,
        googleRefreshToken,
        timezone = 'UTC'
      } = userData;

      // Generate unique username
      let baseUsername = this.generateUsername(email);
      let username = baseUsername;
      let counter = 1;
      
      while (!(await this.isUsernameAvailable(username))) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      const result = await query(
        `INSERT INTO users (
          email, username, first_name, last_name, google_id, 
          google_access_token, google_refresh_token, timezone, 
          is_verified, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
        RETURNING *`,
        [
          email,
          username,
          firstName,
          lastName,
          googleId,
          googleAccessToken,
          googleRefreshToken,
          timezone,
          true, // is_verified (since Google OAuth)
          true  // is_active
        ]
      );

      return new User(result.rows[0]);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Update user
  async update(updateData) {
    try {
      const allowedFields = [
        'first_name', 'last_name', 'google_access_token', 
        'google_refresh_token', 'timezone', 'is_active'
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
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      if (result.rows.length > 0) {
        Object.assign(this, result.rows[0]);
      }

      return this;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Update Google tokens
  async updateGoogleTokens(accessToken, refreshToken = null) {
    try {
      const updateData = { google_access_token: accessToken };
      if (refreshToken) {
        updateData.google_refresh_token = refreshToken;
      }

      return await this.update(updateData);
    } catch (error) {
      console.error('Error updating Google tokens:', error);
      throw error;
    }
  }

  // Get user's full name
  getFullName() {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim() || this.email;
  }

  // Convert to JSON (remove sensitive data)
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      username: this.username,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.getFullName(),
      timezone: this.timezone,
      isVerified: this.isVerified,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Check if user has valid Google tokens
  hasGoogleAuth() {
    return !!(this.googleId && this.googleAccessToken);
  }
}

module.exports = User;