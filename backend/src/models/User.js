const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
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

      const result = await query(
        `INSERT INTO users (
          email, first_name, last_name, google_id, 
          google_access_token, google_refresh_token, timezone, 
          is_verified, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
        RETURNING *`,
        [
          email,
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