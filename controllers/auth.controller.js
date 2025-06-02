const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Generate JWT token for authenticated user
exports.generateToken = (user) => {
    return jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
};

// Google OAuth callback handler
exports.googleCallback = async (req, res) => {
    try {
        // At this point, user is already authenticated via Google OAuth
        // and stored in req.user by Passport middleware
        
        if (!req.user) {
            console.error('Google auth callback: No user data available');
            return res.redirect(`${process.env.CLIENT_URL}/login?error=authentication_failed`);
        }
        
        // Generate JWT token for the authenticated user
        const token = exports.generateToken(req.user);
        
        // Redirect to frontend with token
        res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}`);
    } catch (error) {
        console.error('Authentication failed:', error);
        res.redirect(`${process.env.CLIENT_URL}/login?error=authentication_failed`);
    }
};

// Get current user profile
exports.getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-__v');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.status(200).json({ user });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};