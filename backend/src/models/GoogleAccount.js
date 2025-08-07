const { query } = require('../config/database');

class GoogleAccount {
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

  // Find Google account by ID
  static async findById(id) {
    try {
      const result = await query(
        'SELECT * FROM user_google_accounts WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new GoogleAccount(result.rows[0]);
    } catch (error) {
      console.error('Error finding Google account by ID:', error);
      throw error;
    }
  }

  // Find Google accounts by user ID
  static async findByUserId(userId, activeOnly = false) {
    try {
      let sql = 'SELECT * FROM user_google_accounts WHERE user_id = $1';
      const params = [userId];
      
      if (activeOnly) {
        sql += ' AND is_active = true';
      }
      
      // Order by: 1) Primary first, 2) Active status, 3) Email
      sql += ' ORDER BY is_primary DESC, is_active DESC, google_email ASC';
      
      const result = await query(sql, params);
      
      return result.rows.map(row => new GoogleAccount(row));
    } catch (error) {
      console.error('Error finding Google accounts by user ID:', error);
      throw error;
    }
  }

  // Find user's primary Google account
  static async findPrimaryByUserId(userId) {
    try {
      const result = await query(
        'SELECT * FROM user_google_accounts WHERE user_id = $1 AND is_primary = true AND is_active = true',
        [userId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new GoogleAccount(result.rows[0]);
    } catch (error) {
      console.error('Error finding primary Google account:', error);
      throw error;
    }
  }

  // Find Google account by Google ID and user ID
  static async findByGoogleId(userId, googleId) {
    try {
      const result = await query(
        'SELECT * FROM user_google_accounts WHERE user_id = $1 AND google_id = $2',
        [userId, googleId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new GoogleAccount(result.rows[0]);
    } catch (error) {
      console.error('Error finding Google account by Google ID:', error);
      throw error;
    }
  }

  // Find Google account by email and user ID
  static async findByEmail(userId, googleEmail) {
    try {
      const result = await query(
        'SELECT * FROM user_google_accounts WHERE user_id = $1 AND google_email = $2',
        [userId, googleEmail]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new GoogleAccount(result.rows[0]);
    } catch (error) {
      console.error('Error finding Google account by email:', error);
      throw error;
    }
  }

  // Create new Google account
  static async create(accountData) {
    try {
      const {
        userId,
        googleId,
        googleEmail,
        displayName = null,
        googleAccessToken,
        googleRefreshToken,
        accountType = 'personal',
        isPrimary = false,
        isActive = true
      } = accountData;

      const result = await query(
        `INSERT INTO user_google_accounts (
          user_id, google_id, google_email, display_name, google_access_token, 
          google_refresh_token, account_type, is_primary, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
        RETURNING *`,
        [
          userId,
          googleId,
          googleEmail,
          displayName,
          googleAccessToken,
          googleRefreshToken,
          accountType,
          isPrimary,
          isActive
        ]
      );

      return new GoogleAccount(result.rows[0]);
    } catch (error) {
      console.error('Error creating Google account:', error);
      throw error;
    }
  }

  // Update Google account
  async update(updateData) {
    try {
      const allowedFields = [
        'display_name', 'google_access_token', 'google_refresh_token', 
        'account_type', 'is_primary', 'is_active'
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
        `UPDATE user_google_accounts SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      if (result.rows.length > 0) {
        Object.assign(this, new GoogleAccount(result.rows[0]));
      }

      return this;
    } catch (error) {
      console.error('Error updating Google account:', error);
      throw error;
    }
  }

  // Delete Google account with robust transactional approach and sync locks
  async delete() {
    const { transaction } = require('../config/database');
    
    return await transaction(async (client) => {
      let lockAcquired = false;
      
      try {
        console.log(`🚀 Starting robust deletion of Google account: ${this.googleEmail}`);
        console.log(`   Account ID: ${this.id}, User ID: ${this.userId}, Is Primary: ${this.isPrimary}, Is Active: ${this.isActive}`);
        
        // Step 1: Acquire exclusive lock with timeout
        const lockResult = await client.query(`
          INSERT INTO sync_locks (user_id, operation, expires_at) 
          VALUES ($1, 'account_deletion', NOW() + INTERVAL '5 minutes')
          ON CONFLICT (user_id, operation) DO NOTHING
          RETURNING id
        `, [this.userId]);
        
        if (lockResult.rows.length === 0) {
          throw new Error('Account deletion already in progress for this user');
        }
        lockAcquired = true;
        console.log(`🔒 Acquired deletion lock for user ${this.userId}`);
        
        // Step 2: Validate deletion is allowed
        const activeAccountsResult = await client.query(
          'SELECT COUNT(*) FROM user_google_accounts WHERE user_id = $1 AND is_active = true',
          [this.userId]
        );
        
        const activeAccountCount = parseInt(activeAccountsResult.rows[0].count);
        if (activeAccountCount <= 1) {
          throw new Error('Cannot delete the only active Google account. Please add another account first.');
        }
        console.log(`✅ Validation passed: ${activeAccountCount} active accounts, deletion allowed`);
        
        // Step 3: Handle primary account transfer if needed
        if (this.isPrimary) {
          const transferResult = await client.query(`
            UPDATE user_google_accounts 
            SET is_primary = true, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $1 AND id != $2 AND is_active = true
            ORDER BY created_at ASC
            LIMIT 1
            RETURNING google_email
          `, [this.userId, this.id]);
          
          if (transferResult.rows.length > 0) {
            console.log(`👑 Transferred primary status to: ${transferResult.rows[0].google_email}`);
          }
        }
        
        // Step 4: Comprehensive calendar cleanup
        console.log(`🗑️  Starting comprehensive calendar cleanup for: ${this.googleEmail}`);
        
        // Delete calendars directly linked to this Google account
        const linkedCalendarsResult = await client.query(
          'DELETE FROM user_calendars WHERE user_id = $1 AND google_account_id = $2 RETURNING calendar_name',
          [this.userId, this.id]
        );
        console.log(`✅ Deleted ${linkedCalendarsResult.rowCount} directly linked calendars`);
        
        // Delete orphaned calendars that match this account by email (comprehensive cleanup)
        const orphanedCalendarsResult = await client.query(`
          DELETE FROM user_calendars 
          WHERE user_id = $1 AND google_account_id IS NULL 
          AND (calendar_name = $2 OR calendar_name ILIKE '%' || $2 || '%')
          RETURNING calendar_name
        `, [this.userId, this.googleEmail]);
        console.log(`✅ Deleted ${orphanedCalendarsResult.rowCount} orphaned calendars`);
        
        // Step 5: Delete the Google account
        const accountDeleteResult = await client.query(
          'DELETE FROM user_google_accounts WHERE id = $1 RETURNING google_email',
          [this.id]
        );
        
        if (accountDeleteResult.rowCount === 0) {
          throw new Error('Account not found or already deleted');
        }
        console.log(`✅ Deleted Google account: ${accountDeleteResult.rows[0].google_email}`);
        
        // Step 6: Final verification - ensure no traces remain
        const verificationResults = await Promise.all([
          client.query(
            'SELECT COUNT(*) FROM user_calendars WHERE user_id = $1 AND google_account_id = $2',
            [this.userId, this.id]
          ),
          client.query(
            'SELECT COUNT(*) FROM user_calendars WHERE user_id = $1 AND calendar_name = $2',
            [this.userId, this.googleEmail]
          ),
          client.query(
            'SELECT COUNT(*) FROM user_google_accounts WHERE id = $1',
            [this.id]
          )
        ]);
        
        const remainingLinkedCalendars = parseInt(verificationResults[0].rows[0].count);
        const remainingNamedCalendars = parseInt(verificationResults[1].rows[0].count);
        const remainingAccount = parseInt(verificationResults[2].rows[0].count);
        
        if (remainingLinkedCalendars > 0 || remainingNamedCalendars > 0 || remainingAccount > 0) {
          throw new Error(`Cleanup verification failed: ${remainingLinkedCalendars} linked calendars, ${remainingNamedCalendars} named calendars, ${remainingAccount} account records remain`);
        }
        
        console.log(`🎉 Account deletion completed successfully with full cleanup verification`);
        
        return { 
          success: true, 
          deletedCalendars: linkedCalendarsResult.rowCount + orphanedCalendarsResult.rowCount,
          accountEmail: this.googleEmail,
          timestamp: new Date().toISOString()
        };
        
      } finally {
        // Always release lock, even on failure
        if (lockAcquired) {
          await client.query(
            'DELETE FROM sync_locks WHERE user_id = $1 AND operation = $2',
            [this.userId, 'account_deletion']
          );
          console.log(`🔓 Released deletion lock for user ${this.userId}`);
        }
      }
    });
  }

  // Set as primary Google account
  async setPrimary() {
    try {
      // This will automatically unset other primary accounts due to the trigger
      return await this.update({ is_primary: true });
    } catch (error) {
      console.error('Error setting primary Google account:', error);
      throw error;
    }
  }

  // Toggle active status
  async toggleActive() {
    try {
      return await this.update({ is_active: !this.isActive });
    } catch (error) {
      console.error('Error toggling Google account active status:', error);
      throw error;
    }
  }

  // Update tokens (for OAuth refresh)
  async updateTokens(accessToken, refreshToken = null) {
    try {
      const updateData = { google_access_token: accessToken };
      if (refreshToken) {
        updateData.google_refresh_token = refreshToken;
      }
      
      return await this.update(updateData);
    } catch (error) {
      console.error('Error updating Google account tokens:', error);
      throw error;
    }
  }

  // Check if tokens need refresh (basic check)
  needsRefresh() {
    // This is a simple heuristic - in a production app you'd check token expiry
    return !this.googleAccessToken || this.googleAccessToken.length < 10;
  }

  // Convert to JSON
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
      // Note: We don't expose tokens in JSON for security
    };
  }

  // Get formatted display name
  getDisplayName() {
    if (this.isPrimary) {
      return `${this.displayName || this.googleEmail} (Primary)`;
    }
    return this.displayName || this.googleEmail;
  }

  // Get account type badge text
  getAccountTypeBadge() {
    switch (this.accountType) {
      case 'work': return 'Work';
      case 'personal': return 'Personal';
      case 'other': return 'Other';
      default: return this.accountType;
    }
  }

  // Check if this account has valid authentication
  hasValidAuth() {
    // Access token is required, refresh token is optional for legacy accounts
    return !!(this.googleAccessToken && this.isActive);
  }
}

module.exports = GoogleAccount;