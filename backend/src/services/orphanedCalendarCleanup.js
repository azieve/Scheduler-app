const { query, transaction } = require('../config/database');

class OrphanedCalendarCleanupService {
  constructor() {
    this.cleanupStats = {
      totalOrphansFound: 0,
      totalOrphansRemoved: 0,
      lastCleanupTime: null
    };
  }

  // Detect orphaned calendars for a specific user
  async detectOrphanedCalendars(userId) {
    try {
      const orphanedCalendars = await query(`
        SELECT 
          c.id,
          c.calendar_name,
          c.is_primary,
          c.is_active,
          c.google_account_id,
          c.created_at,
          c.updated_at
        FROM user_calendars c
        WHERE c.user_id = $1 
          AND (
            c.google_account_id IS NULL 
            OR c.google_account_id NOT IN (
              SELECT ga.id 
              FROM user_google_accounts ga 
              WHERE ga.user_id = $1 AND ga.is_active = true
            )
          )
        ORDER BY c.created_at DESC
      `, [userId]);

      return orphanedCalendars.rows.map(row => ({
        id: row.id,
        calendarName: row.calendar_name,
        isPrimary: row.is_primary,
        isActive: row.is_active,
        googleAccountId: row.google_account_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        orphanReason: row.google_account_id === null 
          ? 'No Google account linked' 
          : 'Google account deleted or inactive'
      }));
    } catch (error) {
      console.error('Error detecting orphaned calendars:', error);
      throw error;
    }
  }

  // Automatic cleanup of orphaned calendars with smart logic
  async cleanupOrphanedCalendars(userId) {
    return await transaction(async (client) => {
      console.log(`🧹 Starting automatic orphaned calendar cleanup for user ${userId}`);

      try {
        // Step 1: Find orphaned calendars
        const orphanedResult = await client.query(`
          SELECT 
            c.id,
            c.calendar_name,
            c.is_primary,
            c.is_active,
            c.google_account_id
          FROM user_calendars c
          WHERE c.user_id = $1 
            AND (
              c.google_account_id IS NULL 
              OR c.google_account_id NOT IN (
                SELECT ga.id 
                FROM user_google_accounts ga 
                WHERE ga.user_id = $1 AND ga.is_active = true
              )
            )
        `, [userId]);

        const orphanedCalendars = orphanedResult.rows;
        
        if (orphanedCalendars.length === 0) {
          console.log('✅ No orphaned calendars found');
          return {
            success: true,
            orphansFound: 0,
            orphansRemoved: 0,
            orphansKept: 0,
            details: []
          };
        }

        console.log(`🔍 Found ${orphanedCalendars.length} orphaned calendars`);

        // Step 2: Smart cleanup logic
        const cleanupResults = {
          removed: [],
          kept: [],
          primaryTransferred: null
        };

        // Check if we have any valid (linked) calendars remaining
        const validCalendarsResult = await client.query(`
          SELECT COUNT(*) as count
          FROM user_calendars c
          JOIN user_google_accounts ga ON c.google_account_id = ga.id
          WHERE c.user_id = $1 AND ga.is_active = true
        `, [userId]);

        const hasValidCalendars = parseInt(validCalendarsResult.rows[0].count) > 0;

        for (const orphan of orphanedCalendars) {
          console.log(`📅 Processing orphaned calendar: "${orphan.calendar_name}"`);

          // KEEP orphaned calendar if:
          // 1. It's the primary calendar AND we have no other valid calendars
          // 2. It's active AND we have no other valid calendars
          const shouldKeep = (!hasValidCalendars && (orphan.is_primary || orphan.is_active));

          if (shouldKeep) {
            console.log(`  ⏸️  KEEPING: Calendar is ${orphan.is_primary ? 'primary' : 'active'} with no valid alternatives`);
            
            // Deactivate it but keep it for potential manual cleanup
            await client.query(`
              UPDATE user_calendars 
              SET is_active = false, is_primary = false, updated_at = CURRENT_TIMESTAMP
              WHERE id = $1
            `, [orphan.id]);

            cleanupResults.kept.push({
              id: orphan.id,
              name: orphan.calendar_name,
              reason: 'Primary/active with no valid alternatives - deactivated'
            });
          } else {
            console.log(`  🗑️  REMOVING: Safe to delete`);

            // Handle primary calendar transfer if needed
            if (orphan.is_primary && hasValidCalendars) {
              const newPrimaryResult = await client.query(`
                UPDATE user_calendars 
                SET is_primary = true, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $1 
                  AND google_account_id IN (
                    SELECT ga.id FROM user_google_accounts ga 
                    WHERE ga.user_id = $1 AND ga.is_active = true
                  )
                  AND is_active = true
                ORDER BY created_at ASC
                LIMIT 1
                RETURNING calendar_name
              `, [userId]);

              if (newPrimaryResult.rows.length > 0) {
                cleanupResults.primaryTransferred = newPrimaryResult.rows[0].calendar_name;
                console.log(`  👑 Transferred primary status to: ${newPrimaryResult.rows[0].calendar_name}`);
              }
            }

            // Delete the orphaned calendar
            const deleteResult = await client.query(`
              DELETE FROM user_calendars 
              WHERE id = $1 
              RETURNING calendar_name
            `, [orphan.id]);

            if (deleteResult.rows.length > 0) {
              cleanupResults.removed.push({
                id: orphan.id,
                name: orphan.calendar_name,
                reason: orphan.google_account_id === null ? 'No Google account' : 'Inactive Google account'
              });
            }
          }
        }

        // Step 3: Update cleanup stats
        this.cleanupStats = {
          totalOrphansFound: this.cleanupStats.totalOrphansFound + orphanedCalendars.length,
          totalOrphansRemoved: this.cleanupStats.totalOrphansRemoved + cleanupResults.removed.length,
          lastCleanupTime: new Date().toISOString()
        };

        console.log(`🎉 Cleanup completed:`);
        console.log(`  📊 Found: ${orphanedCalendars.length} orphans`);
        console.log(`  🗑️  Removed: ${cleanupResults.removed.length}`);
        console.log(`  ⏸️  Kept: ${cleanupResults.kept.length}`);

        return {
          success: true,
          orphansFound: orphanedCalendars.length,
          orphansRemoved: cleanupResults.removed.length,
          orphansKept: cleanupResults.kept.length,
          details: {
            removed: cleanupResults.removed,
            kept: cleanupResults.kept,
            primaryTransferred: cleanupResults.primaryTransferred
          }
        };

      } catch (error) {
        console.error('❌ Orphaned calendar cleanup failed:', error);
        throw error;
      }
    });
  }

  // Get cleanup statistics
  getCleanupStats() {
    return {
      ...this.cleanupStats,
      uptime: process.uptime()
    };
  }

  // Manual cleanup for specific calendar (with safety checks)
  async removeSpecificOrphanedCalendar(userId, calendarId) {
    try {
      const calendarResult = await query(`
        SELECT 
          c.id,
          c.calendar_name,
          c.is_primary,
          c.is_active,
          c.google_account_id
        FROM user_calendars c
        WHERE c.id = $1 AND c.user_id = $2
      `, [calendarId, userId]);

      if (calendarResult.rows.length === 0) {
        throw new Error('Calendar not found or access denied');
      }

      const calendar = calendarResult.rows[0];

      // Check if it's actually orphaned
      if (calendar.google_account_id !== null) {
        const accountCheck = await query(`
          SELECT id FROM user_google_accounts 
          WHERE id = $1 AND user_id = $2 AND is_active = true
        `, [calendar.google_account_id, userId]);

        if (accountCheck.rows.length > 0) {
          throw new Error('Calendar is not orphaned - it has a valid Google account');
        }
      }

      // Safe to delete - it's confirmed orphaned
      const deleteResult = await query(`
        DELETE FROM user_calendars 
        WHERE id = $1 AND user_id = $2
        RETURNING calendar_name
      `, [calendarId, userId]);

      console.log(`🗑️  Manually removed orphaned calendar: ${deleteResult.rows[0].calendar_name}`);

      return {
        success: true,
        calendarName: deleteResult.rows[0].calendar_name,
        message: 'Orphaned calendar removed successfully'
      };

    } catch (error) {
      console.error('Error removing specific orphaned calendar:', error);
      throw error;
    }
  }

  // Health check method
  async healthCheck(userId) {
    try {
      const orphans = await this.detectOrphanedCalendars(userId);
      const validCalendars = await query(`
        SELECT COUNT(*) as count
        FROM user_calendars c
        JOIN user_google_accounts ga ON c.google_account_id = ga.id
        WHERE c.user_id = $1 AND ga.is_active = true
      `, [userId]);

      return {
        orphanedCalendars: orphans.length,
        validCalendars: parseInt(validCalendars.rows[0].count),
        needsCleanup: orphans.length > 0,
        lastCleanup: this.cleanupStats.lastCleanupTime
      };
    } catch (error) {
      console.error('Error in health check:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new OrphanedCalendarCleanupService();