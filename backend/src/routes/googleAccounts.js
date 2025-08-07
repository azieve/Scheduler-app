const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const GoogleAccount = require('../models/GoogleAccount');
const calendarService = require('../services/calendarService');
const jwt = require('jsonwebtoken');

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

// Apply authentication middleware to all Google account routes
router.use(authenticateToken);

// Get user's Google accounts
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const googleAccounts = await GoogleAccount.findByUserId(userId);
    
    res.json({
      success: true,
      data: {
        googleAccounts: googleAccounts.map(acc => acc.toJSON())
      }
    });
  } catch (error) {
    console.error('Error fetching user Google accounts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Google accounts'
    });
  }
});

// Initiate OAuth flow to add a new Google account
router.get('/add', async (req, res) => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `http://localhost:3001/api/google-accounts/callback`
    );

    const scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/calendar'
    ];

    const authorizationUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      include_granted_scopes: true,
      prompt: 'consent', // Force consent to ensure we get refresh token
      state: JSON.stringify({ 
        userId: req.user.id,
        action: 'add_account'
      })
    });

    res.json({
      success: true,
      data: {
        authorizationUrl
      }
    });
  } catch (error) {
    console.error('Error generating authorization URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate authorization URL'
    });
  }
});

// Handle OAuth callback for adding new Google account
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).send('Authorization code is required');
    }

    let stateData;
    try {
      stateData = JSON.parse(state);
    } catch (e) {
      return res.status(400).send('Invalid state parameter');
    }

    const { userId, action } = stateData;

    if (action !== 'add_account') {
      return res.status(400).send('Invalid action in state');
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `http://localhost:3001/api/google-accounts/callback`
    );

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    const {
      id: googleId,
      email: googleEmail,
      name: displayName
    } = userInfo.data;

    // Check if this Google account is already connected to this user
    const existingAccount = await GoogleAccount.findByGoogleId(userId, googleId);
    if (existingAccount) {
      // Update tokens for existing account
      await existingAccount.updateTokens(tokens.access_token, tokens.refresh_token);
      
      // Sync calendars from the updated account
      try {
        const syncedCalendars = await calendarService.syncUserCalendarsFromGoogleAccount(userId, existingAccount);
        console.log(`📅 Re-synced ${syncedCalendars.length} calendars from updated Google account: ${googleEmail}`);
      } catch (syncError) {
        console.error(`⚠️  Failed to sync calendars from updated Google account ${googleEmail}:`, syncError);
        // Don't fail the account update if calendar sync fails
      }
      
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/calendars?success=account_updated`);
    }

    // Check if this Google account is connected to a different user
    const existingEmailAccount = await GoogleAccount.findByEmail(userId, googleEmail);
    if (existingEmailAccount) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/calendars?error=account_already_exists`);
    }

    // Determine account type based on email
    let accountType = 'personal';
    if (googleEmail.includes('@') && !googleEmail.includes('@gmail.com')) {
      accountType = 'work';
    }

    // Create new Google account
    const newGoogleAccount = await GoogleAccount.create({
      userId,
      googleId,
      googleEmail,
      displayName,
      googleAccessToken: tokens.access_token,
      googleRefreshToken: tokens.refresh_token,
      accountType,
      isPrimary: false, // New accounts are not primary by default
      isActive: true
    });

    console.log(`✅ Added new Google account for user: ${googleEmail}`);

    // Automatically sync calendars from the newly added Google account
    try {
      const syncedCalendars = await calendarService.syncUserCalendarsFromGoogleAccount(userId, newGoogleAccount);
      console.log(`📅 Auto-synced ${syncedCalendars.length} calendars from new Google account: ${googleEmail}`);
    } catch (syncError) {
      console.error(`⚠️  Failed to auto-sync calendars from new Google account ${googleEmail}:`, syncError);
      // Don't fail the account addition if calendar sync fails
    }

    // Redirect back to frontend with success
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/calendars?success=account_added`);

  } catch (error) {
    console.error('Error in Google account callback:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/calendars?error=auth_failed`);
  }
});

// Update Google account settings
router.put('/:accountId', async (req, res) => {
  try {
    const userId = req.user.id;
    const accountId = parseInt(req.params.accountId);
    const { accountType, displayName, isPrimary, isActive } = req.body;
    
    // Find the Google account
    const googleAccount = await GoogleAccount.findById(accountId);
    if (!googleAccount) {
      return res.status(404).json({
        success: false,
        error: 'Google account not found'
      });
    }
    
    // Verify ownership
    if (googleAccount.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Update Google account
    const updateData = {};
    if (accountType) updateData.account_type = accountType;
    if (displayName !== undefined) updateData.display_name = displayName;
    if (typeof isPrimary === 'boolean') updateData.is_primary = isPrimary;
    if (typeof isActive === 'boolean') updateData.is_active = isActive;
    
    await googleAccount.update(updateData);
    
    res.json({
      success: true,
      data: {
        googleAccount: googleAccount.toJSON()
      },
      message: 'Google account updated successfully'
    });
  } catch (error) {
    console.error('Error updating Google account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update Google account'
    });
  }
});

// Set primary Google account
router.post('/:accountId/set-primary', async (req, res) => {
  try {
    const userId = req.user.id;
    const accountId = parseInt(req.params.accountId);
    
    // Find the Google account
    const googleAccount = await GoogleAccount.findById(accountId);
    if (!googleAccount) {
      return res.status(404).json({
        success: false,
        error: 'Google account not found'
      });
    }
    
    // Verify ownership
    if (googleAccount.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Set as primary
    await googleAccount.setPrimary();
    
    res.json({
      success: true,
      data: {
        googleAccount: googleAccount.toJSON()
      },
      message: 'Primary Google account set successfully'
    });
  } catch (error) {
    console.error('Error setting primary Google account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set primary Google account'
    });
  }
});

// Toggle Google account active status
router.post('/:accountId/toggle-active', async (req, res) => {
  try {
    const userId = req.user.id;
    const accountId = parseInt(req.params.accountId);
    
    // Find the Google account
    const googleAccount = await GoogleAccount.findById(accountId);
    if (!googleAccount) {
      return res.status(404).json({
        success: false,
        error: 'Google account not found'
      });
    }
    
    // Verify ownership
    if (googleAccount.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Toggle active status
    await googleAccount.toggleActive();
    
    res.json({
      success: true,
      data: {
        googleAccount: googleAccount.toJSON()
      },
      message: `Google account ${googleAccount.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error toggling Google account status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle Google account status'
    });
  }
});

// Remove Google account from user
router.delete('/:accountId', async (req, res) => {
  try {
    const userId = req.user.id;
    const accountId = parseInt(req.params.accountId);
    
    // Find the Google account
    const googleAccount = await GoogleAccount.findById(accountId);
    if (!googleAccount) {
      return res.status(404).json({
        success: false,
        error: 'Google account not found'
      });
    }
    
    // Verify ownership
    if (googleAccount.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Delete Google account (will cascade to calendars)
    await googleAccount.delete();
    
    res.json({
      success: true,
      message: 'Google account removed successfully'
    });
  } catch (error) {
    console.error('Error removing Google account:', error);
    
    if (error.message.includes('only active Google account')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to remove Google account'
    });
  }
});

// Sync calendars for a specific Google account
router.post('/:accountId/sync-calendars', async (req, res) => {
  try {
    const userId = req.user.id;
    const accountId = parseInt(req.params.accountId);
    
    // Find the Google account
    const googleAccount = await GoogleAccount.findById(accountId);
    if (!googleAccount) {
      return res.status(404).json({
        success: false,
        error: 'Google account not found'
      });
    }
    
    // Verify ownership
    if (googleAccount.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Sync calendars for this specific Google account
    const syncedCalendars = await calendarService.syncUserCalendarsFromGoogleAccount(userId, googleAccount);
    
    res.json({
      success: true,
      data: {
        calendars: syncedCalendars.map(cal => cal.toJSON()),
        syncedCount: syncedCalendars.length
      },
      message: `Successfully synced ${syncedCalendars.length} calendars from ${googleAccount.googleEmail}`
    });
  } catch (error) {
    console.error('Error syncing calendars for Google account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync calendars for Google account'
    });
  }
});

module.exports = router;