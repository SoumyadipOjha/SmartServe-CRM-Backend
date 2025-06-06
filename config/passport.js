const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user.model');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // user phele se hai ki nahi
        let user = await User.findOne({ googleId: profile.id });
        
        if (user) {
            return done(null, user);
        }
        
        // nya user create kiya
        user = new User({
            googleId: profile.id,
            name: profile.displayName || `${profile.name.givenName} ${profile.name.familyName}`,
            email: profile.emails[0].value,
            picture: profile.photos[0].value
        });
        
        await user.save();
        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
}));

// Serialization and deserialization
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
