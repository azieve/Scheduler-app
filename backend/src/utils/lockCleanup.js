const { query } = require('../config/database');

class LockCleanup {
  constructor() {
    this.cleanupInterval = null;
    this.intervalMinutes = 5; // Run cleanup every 5 minutes
  }

  // Clean up expired locks
  async cleanupExpiredLocks() {
    try {
      const result = await query(
        'DELETE FROM sync_locks WHERE expires_at < NOW() RETURNING operation, user_id',
        []
      );

      if (result.rowCount > 0) {
        console.log(`🧹 Cleaned up ${result.rowCount} expired sync locks`);
        result.rows.forEach(row => {
          console.log(`   - ${row.operation} lock for user ${row.user_id}`);
        });
      }

      return result.rowCount;
    } catch (error) {
      console.error('Error cleaning up expired locks:', error);
      return 0;
    }
  }

  // Start automatic cleanup process
  startCleanup() {
    if (this.cleanupInterval) {
      console.log('Lock cleanup already running');
      return;
    }

    console.log(`🚀 Starting sync lock cleanup job (every ${this.intervalMinutes} minutes)`);
    
    // Run initial cleanup
    this.cleanupExpiredLocks();

    // Set up recurring cleanup
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupExpiredLocks();
    }, this.intervalMinutes * 60 * 1000);
  }

  // Stop automatic cleanup process
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🛑 Stopped sync lock cleanup job');
    }
  }

  // Get current lock statistics
  async getLockStats() {
    try {
      const stats = await query(`
        SELECT 
          operation,
          COUNT(*) as count,
          MIN(locked_at) as oldest_lock,
          MAX(expires_at) as latest_expiry
        FROM sync_locks 
        WHERE expires_at > NOW()
        GROUP BY operation
        ORDER BY operation
      `);

      return stats.rows;
    } catch (error) {
      console.error('Error getting lock stats:', error);
      return [];
    }
  }
}

// Create singleton instance
const lockCleanup = new LockCleanup();

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, stopping lock cleanup...');
  lockCleanup.stopCleanup();
});

process.on('SIGINT', () => {
  console.log('SIGINT received, stopping lock cleanup...');
  lockCleanup.stopCleanup();
});

module.exports = lockCleanup;