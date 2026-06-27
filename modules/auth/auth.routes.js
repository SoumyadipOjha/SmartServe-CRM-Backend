const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('./auth.controller');
const { authenticateJWT } = require('../../middleware/auth.middleware');

// Google OAuth authentication routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google OAuth callback
router.get('/google/callback', 
    passport.authenticate('google', { session: false, failureRedirect: '/login' }),
    authController.googleCallback
);

// Demo login — no OAuth, returns JWT directly
router.post('/demo', authController.demoLogin);

// Get current user profile
router.get('/me', authenticateJWT, authController.getCurrentUser);

module.exports = router;