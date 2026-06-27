const jwt = require('jsonwebtoken');
const User = require('../../models/user.model');
const { seedDemoData } = require('../../services/seed.service');
const logger = require('../../utils/logger');

exports.generateToken = (user) => {
    // orgId: the account owner whose data this user can access.
    // For owners it's their own _id; for team members it's their owner's _id.
    const orgId = user.organizationOwner ? user.organizationOwner.toString() : user._id.toString();
    return jwt.sign(
        {
            id:       user._id,
            email:    user.email,
            role:     user.role,
            teamRole: user.teamRole || 'owner',
            orgId,
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
};

exports.googleCallback = async (req, res) => {
    try {
        if (!req.user) {
            logger.warn('Google auth callback: no user data');
            return res.redirect(`${process.env.CLIENT_URL}/login?error=authentication_failed`);
        }

        const token = exports.generateToken(req.user);
        res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}`);
    } catch (error) {
        logger.error({ err: error.message }, 'Google auth callback error');
        res.redirect(`${process.env.CLIENT_URL}/login?error=authentication_failed`);
    }
};

exports.demoLogin = async (req, res) => {
    try {
        const demoUser = await User.findOneAndUpdate(
            { email: 'demo@flayx.app' },
            {
                $setOnInsert: {
                    name: 'Demo User',
                    email: 'demo@flayx.app',
                    role: 'user',
                }
            },
            { upsert: true, new: true }
        );

        await seedDemoData(demoUser._id);

        const token = exports.generateToken(demoUser);
        res.json({ token, user: demoUser });
    } catch (error) {
        logger.error({ err: error.message }, 'Demo login error');
        res.status(500).json({ message: 'Demo login failed' });
    }
};

exports.getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-__v');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ user });
    } catch (error) {
        logger.error({ err: error.message }, 'Get current user error');
        res.status(500).json({ message: 'Internal server error' });
    }
};
