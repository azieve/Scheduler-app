const { query } = require('../config/database');

/**
 * Account Model - Middle level of hierarchy (User -> Account -> Calendar)
 * Represents Google accounts connected to a ReadyToMeet.me user
 */
class Account {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.googleId = data.google_id;
    this.googleEmail = data.google_email;
    this.displayName = data.display_name;
    this.googleAccessToken = data.google_access_token;
    this.googleRefreshToken = data.google_refresh_token;
    this.accountType = data.account_type;
    this.isPrimary = data.is_primary;
    this.isActive = data.is_active;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // ==============================================================================
  // STATIC METHODS (FINDERS)
  // ==============================================================================

  /**
   * Find account by ID
   */
  static async findById(id) {
    try {
      const result = await query(
        'SELECT * FROM accounts WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new Account(result.rows[0]);
    } catch (error) {
      console.error('Error finding account by ID:', error);
      throw error;
    }
  }

  /**
   * Find all accounts for a user
   */
  static async findByUserId(userId, activeOnly = false) {
    try {
      let sql = 'SELECT * FROM accounts WHERE user_id = $1';
      const params = [userId];
      
      if (activeOnly) {
        sql += ' AND is_active = true';
      }
      
      // Order by: 1) Primary first, 2) Active status, 3) Email
      sql += ' ORDER BY is_primary DESC, is_active DESC, google_email ASC';
      
      const result = await query(sql, params);
      
      return result.rows.map(row => new Account(row));
    } catch (error) {
      console.error('Error finding accounts by user ID:', error);
      throw error;
    }
  }

  /**
   * Find the primary account for a user
   */
  static async findPrimaryByUserId(userId) {
    try {
      const result = await query(
        'SELECT * FROM accounts WHERE user_id = $1 AND is_primary = true AND is_active = true',
        [userId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new Account(result.rows[0]);
    } catch (error) {
      console.error('Error finding primary account:', error);
      throw error;
    }
  }

  /**
   * Find account by Google ID and user ID
   */
  static async findByGoogleId(userId, googleId) {
    try {
      const result = await query(
        'SELECT * FROM accounts WHERE user_id = $1 AND google_id = $2',
        [userId, googleId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new Account(result.rows[0]);
    } catch (error) {
      console.error('Error finding account by Google ID:', error);
      throw error;
    }
  }

  /**
   * Find account by Google email and user ID
   */
  static async findByGoogleEmail(userId, googleEmail) {
    try {
      const result = await query(
        'SELECT * FROM accounts WHERE user_id = $1 AND google_email = $2',
        [userId, googleEmail]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new Account(result.rows[0]);
    } catch (error) {
      console.error('Error finding account by Google email:', error);
      throw error;
    }
  }

  // ==============================================================================
  // STATIC METHODS (CREATORS)
  // ==============================================================================

  /**
   * Create a new account
   */
  static async create(accountData) {
    try {
      const {
        userId,
        googleId,
        googleEmail,
        displayName = null,
        googleAccessToken,
        googleRefreshToken = null,
        accountType = 'personal',
        isPrimary = false,
        isActive = true
      } = accountData;

      const result = await query(`
        INSERT INTO accounts (
          user_id, google_id, google_email, display_name, 
          google_access_token, google_refresh_token, 
          account_type, is_primary, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
        RETURNING *
      `, [
        userId, googleId, googleEmail, displayName,
        googleAccessToken, googleRefreshToken,
        accountType, isPrimary, isActive
      ]);

      console.log(`✅ Created ${isPrimary ? 'primary' : 'secondary'} account: ${googleEmail}`);
      return new Account(result.rows[0]);
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    }
  }

  /**
   * Create the primary account for a user (used during user registration)
   */
  static async createPrimary(userId, googleData) {
    try {
      const {
        googleId,
        googleEmail,
        displayName,
        googleAccessToken,
        googleRefreshToken
      } = googleData;

      // Primary accounts are always active and of type 'personal'
      return await Account.create({
        userId,
        googleId,
        googleEmail,
        displayName,
        googleAccessToken,
        googleRefreshToken,
        accountType: 'personal',
        isPrimary: true,
        isActive: true
      });
    } catch (error) {
      console.error('Error creating primary account:', error);
      throw error;
    }
  }

  // ==============================================================================
  // INSTANCE METHODS (MODIFIERS)
  // ==============================================================================

  /**
   * Update account data
   */
  async update(updateData) {
    try {
      const allowedFields = [
        'display_name', 'google_access_token', 'google_refresh_token', 
        'account_type', 'is_active'
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
        UPDATE accounts 
        SET ${updates.join(', ')} 
        WHERE id = $${paramCount} 
        RETURNING *
      `, values);

      if (result.rows.length > 0) {
        Object.assign(this, new Account(result.rows[0]));
        console.log(`✅ Updated account: ${this.googleEmail}`);
      }

      return this;
    } catch (error) {
      console.error('Error updating account:', error);
      throw error;
    }
  }

  /**
   * Update OAuth tokens
   */
  async updateTokens(accessToken, refreshToken = null) {
    try {
      const updateData = { google_access_token: accessToken };
      if (refreshToken) {
        updateData.google_refresh_token = refreshToken;
      }
      
      return await this.update(updateData);
    } catch (error) {
      console.error('Error updating account tokens:', error);
      throw error;
    }
  }

  /**
   * Activate/deactivate account
   */
  async setActive(isActive) {
    try {
      // Cannot deactivate primary account
      if (this.isPrimary && !isActive) {
        throw new Error('Cannot deactivate primary account. Primary accounts must remain active.');
      }

      return await this.update({ is_active: isActive });
    } catch (error) {
      console.error('Error setting account active status:', error);
      throw error;
    }
  }

  /**
   * Delete account (with protection for primary accounts)
   * Note: Database trigger prevents deletion of primary accounts
   */
  async delete() {
    try {
      console.log(`🗑️  Attempting to delete account: ${this.googleEmail} (Primary: ${this.isPrimary})`);

      // Additional application-level check (database trigger also prevents this)
      if (this.isPrimary) {
        throw new Error('Cannot delete primary account. Primary accounts are protected and cannot be removed.');
      }

      // Delete will cascade to calendars automatically
      const result = await query(
        'DELETE FROM accounts WHERE id = $1 RETURNING google_email',
        [this.id]
      );

      if (result.rows.length === 0) {
        throw new Error('Account not found or already deleted');
      }

      console.log(`✅ Deleted account: ${result.rows[0].google_email}`);
      
      return { 
        success: true, 
        deletedAccount: result.rows[0].google_email,
        message: 'Account and all associated calendars deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }

  // ==============================================================================
  // INSTANCE METHODS (GETTERS)
  // ==============================================================================

  /**
   * Get all calendars for this account
   */
  async getCalendars(activeOnly = false) {
    try {
      const Calendar = require('./Calendar'); // Avoid circular dependency
      return await Calendar.findByAccountId(this.id, activeOnly);
    } catch (error) {
      console.error('Error getting account calendars:', error);
      throw error;
    }
  }

  /**
   * Check if tokens need refresh (basic check)
   */
  needsRefresh() {
    return !this.googleAccessToken || this.googleAccessToken.length < 10;
  }

  /**
   * Check if this account has valid authentication
   */
  hasValidAuth() {
    return !!(this.googleAccessToken && this.isActive);
  }

  /**
   * Get formatted display name
   */
  getDisplayName() {
    const name = this.displayName || this.googleEmail;
    return this.isPrimary ? `${name} (Primary)` : name;
  }

  /**
   * Get account type badge text
   */
  getAccountTypeBadge() {
    const badges = {
      'work': 'Work',
      'personal': 'Personal', 
      'other': 'Other'
    };
    return badges[this.accountType] || this.accountType;
  }

  // ==============================================================================
  // SERIALIZATION
  // ==============================================================================

  /**
   * Convert to JSON (excludes sensitive data)
   */
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      googleId: this.googleId,
      googleEmail: this.googleEmail,
      displayName: this.displayName,
      accountType: this.accountType,
      isPrimary: this.isPrimary,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
      // Note: OAuth tokens are excluded for security
    };
  }

  /**
   * Convert to JSON including token status (for debugging)
   */
  toJSONWithStatus() {
    return {
      ...this.toJSON(),
      hasAccessToken: !!this.googleAccessToken,
      hasRefreshToken: !!this.googleRefreshToken,
      needsRefresh: this.needsRefresh(),
      hasValidAuth: this.hasValidAuth()
    };
  }
}

module.exports = Account;