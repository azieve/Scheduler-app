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
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      // Add more user fields as needed
    }
  });
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ message: 'Logged out successfully' });
});

// Test calendar access
router.get('/calendar/test', authenticateToken, async (req, res) => {
  try {
    // TODO: Get user's Google tokens from database
    const accessToken = 'temp_token'; // Replace with actual token from user record
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Set credentials (in real app, get from database)
    oauth2Client.setCredentials({
      access_token: accessToken,
      // refresh_token: user.googleRefreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    const response = await calendar.calendarList.list();
    
    res.json({
      message: 'Calendar access successful',
      calendars: response.data.items?.map(cal => ({
        id: cal.id,
        summary: cal.summary,
        primary: cal.primary
      })) || []
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