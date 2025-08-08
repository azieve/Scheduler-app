const express = require('express');
const router = express.Router();
const Account = require('../models/Account');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const token = req.cookies.auth_token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Apply authentication middleware to all account routes
router.use(authenticateToken);

// ==============================================================================
// ACCOUNT MANAGEMENT ENDPOINTS
// ==============================================================================

/**
 * GET /api/accounts - Get all accounts for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { activeOnly } = req.query;
    
    const accounts = await Account.findByUserId(userId, activeOnly === 'true');
    
    // Add calendar counts to each account
    const accountsWithStats = await Promise.all(
      accounts.map(async (account) => {
        const accountJSON = account.toJSON();
        
        // Get calendar count for this account
        const calendars = await account.getCalendars();
        accountJSON.calendarCount = calendars.length;
        accountJSON.activeCalendarCount = calendars.filter(cal => cal.isActive).length;
        
        return accountJSON;
      })
    );
    
    res.json({
      success: true,
      data: {
        accounts: accountsWithStats
      }
    });
  } catch (error) {
    console.error('Error fetching user accounts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch accounts'
    });
  }
});

/**
 * GET /api/accounts/:id - Get specific account details
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const accountId = parseInt(req.params.id);
    
    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }
    
    // Verify ownership
    if (account.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Get calendars for this account
    const calendars = await account.getCalendars();
    
    res.json({
      success: true,
      data: {
        account: account.toJSON(),
        calendars: calendars.map(cal => cal.toJSON())
      }
    });
  } catch (error) {
    console.error('Error fetching account details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch account details'
    });
  }
});

/**
 * POST /api/accounts/add - Initiate Google OAuth flow to add new account
 */
router.post('/add', async (req, res) => {
  try {
    const userId = req.user.id;
    const { accountType = 'personal' } = req.body;
    
    // Create OAuth2 client (use existing callback URL)
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `http://localhost:3001/api/auth/google/callback` // Use existing callback URL
    );
    
    // Generate authorization URL with additional scopes for calendar access
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // Force consent to ensure we get refresh token
      scope: [
        'email',
        'profile',
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events'
      ],
      state: JSON.stringify({ 
        action: 'add_account',
        userId, 
        accountType 
      }) // Pass context to identify this as account addition
    });
    
    console.log(`🔗 Generated account addition URL for user ${userId}`);
    
    res.json({
      success: true,
      data: {
        authorizationUrl: authUrl,
        message: 'Redirect user to authorization URL to add Google account'
      }
    });
  } catch (error) {
    console.error('Error initiating account addition:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate account addition'
    });
  }
});


/**
 * PUT /api/accounts/:id - Update account settings
 */
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const accountId = parseInt(req.params.id);
    const { displayName, accountType, isActive } = req.body;
    
    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }
    
    // Verify ownership
    if (account.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Build update data
    const updateData = {};
    if (displayName !== undefined) updateData.display_name = displayName;
    if (accountType !== undefined) updateData.account_type = accountType;
    if (isActive !== undefined) updateData.is_active = isActive;
    
    // Update account
    await account.update(updateData);
    
    res.json({
      success: true,
      data: {
        account: account.toJSON()
      },
      message: 'Account updated successfully'
    });
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update account'
    });
  }
});

/**
 * DELETE /api/accounts/:id - Delete secondary account
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const accountId = parseInt(req.params.id);
    
    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }
    
    // Verify ownership
    if (account.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Delete account (will cascade to calendars)
    const result = await account.delete();
    
    res.json({
      success: true,
      data: result,
      message: `Account "${result.deletedAccount}" and all associated calendars deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    
    if (error.message.includes('Cannot delete primary account')) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete primary account. Primary accounts are protected and cannot be removed.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete account'
    });
  }
});

/**
 * POST /api/accounts/:id/sync - Sync calendars for specific account
 */
router.post('/:id/sync', async (req, res) => {
  try {
    const userId = req.user.id;
    const accountId = parseInt(req.params.id);
    
    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }
    
    // Verify ownership
    if (account.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // TODO: Implement calendar sync for specific account
    // This will be implemented when we create the calendar sync service
    
    res.json({
      success: true,
      message: 'Calendar sync for specific account will be implemented next'
    });
  } catch (error) {
    console.error('Error syncing account calendars:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync account calendars'
    });
  }
});

module.exports = router;