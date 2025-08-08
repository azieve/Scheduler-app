const express = require('express');
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');

const router = express.Router();

// Google OAuth login
router.get('/google', passport.authenticate('google', {
  scope: [
    'profile',
    'email',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ]
}));

// Google OAuth callback
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      // Check if this is an account addition request
      const { state } = req.query;
      let isAccountAddition = false;
      let accountContext = null;
      
      if (state) {
        try {
          accountContext = JSON.parse(state);
          isAccountAddition = accountContext.action === 'add_account' || accountContext.action === 'reauth_account';
        } catch (error) {
          console.log('Could not parse state parameter, treating as regular login');
        }
      }
      
      if (isAccountAddition && accountContext) {
        const Account = require('../models/Account');
        
        if (accountContext.action === 'reauth_account') {
          // Handle account re-authentication
          console.log('🔄 Processing account re-authentication for account ID:', accountContext.accountId);
          
          const existingAccount = await Account.findById(accountContext.accountId);
          if (!existingAccount) {
            console.error('Account not found for re-authentication');
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/calendars?error=account_not_found`);
          }
          
          if (existingAccount.userId !== accountContext.userId) {
            console.error('Account ownership mismatch');
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/calendars?error=access_denied`);
          }
          
          // Verify the re-authenticated email matches the account
          if (existingAccount.googleEmail !== req.user.email) {
            console.error(`Re-authentication email mismatch: expected ${existingAccount.googleEmail}, got ${req.user.email}`);
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/calendars?error=email_mismatch`);
          }
          
          // Update tokens for the existing account
          await existingAccount.updateTokens(req.user.googleAccessToken, req.user.googleRefreshToken);
          console.log(`✅ Re-authenticated account: ${req.user.email}`);
          return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/calendars?success=account_reauth&email=${encodeURIComponent(req.user.email)}`);
          
        } else if (accountContext.action === 'add_account') {
          // Handle account addition
          console.log('🔗 Processing account addition for user:', accountContext.userId);
          
          // Check if this account is already connected to the user
          const existingAccount = await Account.findByGoogleEmail(accountContext.userId, req.user.email);
          if (existingAccount) {
            console.log('Account already exists, updating tokens');
            await existingAccount.updateTokens(req.user.googleAccessToken, req.user.googleRefreshToken);
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/calendars?success=account_updated&email=${encodeURIComponent(req.user.email)}`);
          }
          
          // Create new secondary account
          const newAccount = await Account.create({
            userId: accountContext.userId,
            googleId: req.user.googleId,
            googleEmail: req.user.email,
            displayName: `${req.user.firstName} ${req.user.lastName}`.trim(),
            googleAccessToken: req.user.googleAccessToken,
            googleRefreshToken: req.user.googleRefreshToken,
            accountType: accountContext.accountType || 'personal',
            isPrimary: false, // Secondary accounts are never primary
            isActive: true
          });
          
          console.log(`✅ Added secondary account: ${req.user.email}`);
          return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/calendars?success=account_added&email=${encodeURIComponent(req.user.email)}`);
        }
      }
      
      // Regular login flow
      // Generate JWT token
      const token = jwt.sign(
        { 
          id: req.user.id,
          email: req.user.email 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // Set token in cookie (secure for production)
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Redirect to frontend with success
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?auth=success`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=auth_failed`);
    }
  }
);

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ message: 'Logged out successfully' });
});

// Test calendar access (using new calendar system)
router.get('/calendar/test', authenticateToken, async (req, res) => {
  try {
    const Calendar = require('../models/Calendar');
    
    // Get user's calendars using the new system
    const calendars = await Calendar.findByUserId(req.user.id, true); // active only
    
    res.json({
      message: 'Calendar access successful',
      calendars: calendars.map(cal => ({
        id: cal.googleCalendarId,
        summary: cal.calendarName,
        primary: cal.isPrimary,
        active: cal.isActive,
        accountEmail: cal.accountEmail
      })),
      count: calendars.length
    });
  } catch (error) {
    console.error('Calendar test error:', error);
    res.status(500).json({ 
      error: 'Failed to access calendar',
      message: error.message 
    });
  }
});

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

module.exports = router;