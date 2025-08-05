const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { google } = require('googleapis');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    // TODO: Replace with actual database lookup
    // const user = await User.findById(id);
    // For now, return a mock user
    const user = { id, email: 'temp@example.com' };
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

        // TODO: Replace with actual database operations
        // Check if user exists
        // let user = await User.findOne({ googleId: profile.id });
        
        // if (!user) {
        //   // Create new user
        //   user = await User.create({
        //     googleId: profile.id,
        //     email: profile.emails[0]?.value,
        //     firstName: profile.name?.givenName,
        //     lastName: profile.name?.familyName,
        //     profilePicture: profile.photos[0]?.value,
        //     googleAccessToken: accessToken,
        //     googleRefreshToken: refreshToken,
        //   });
        // } else {
        //   // Update existing user tokens
        //   user.googleAccessToken = accessToken;
        //   if (refreshToken) user.googleRefreshToken = refreshToken;
        //   await user.save();
        // }

        // Mock user for now
        const user = {
          id: profile.id,
          googleId: profile.id,
          email: profile.emails[0]?.value,
          firstName: profile.name?.givenName,
          lastName: profile.name?.familyName,
          profilePicture: profile.photos[0]?.value,
          googleAccessToken: accessToken,
          googleRefreshToken: refreshToken,
        };

        return done(null, user);
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error, null);
      }
    }
  )
);

module.exports = passport;