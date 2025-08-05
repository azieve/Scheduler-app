const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { google } = require('googleapis');
const User = require('../models/User');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('Google OAuth Profile:', {
          id: profile.id,
          email: profile.emails[0]?.value,
          name: profile.displayName,
          picture: profile.photos[0]?.value
        });

        // Check if user exists
        let user = await User.findByGoogleId(profile.id);
        
        if (!user) {
          // Create new user
          user = await User.create({
            googleId: profile.id,
            email: profile.emails[0]?.value,
            firstName: profile.name?.givenName,
            lastName: profile.name?.familyName,
            googleAccessToken: accessToken,
            googleRefreshToken: refreshToken,
          });
          console.log('✅ New user created:', user.email);
        } else {
          // Update existing user tokens
          await user.updateGoogleTokens(accessToken, refreshToken);
          console.log('✅ Existing user tokens updated:', user.email);
        }

        return done(null, user);
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error, null);
      }
    }
  )
);

module.exports = passport;