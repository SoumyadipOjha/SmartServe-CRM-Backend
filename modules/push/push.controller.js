'use strict';

const webpush          = require('web-push');
const PushSubscription = require('../../models/push-subscription.model');
const logger           = require('../../utils/logger');

// Configure VAPID once
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_EMAIL || 'mailto:admin@smartserve.app',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY,
    );
}

exports.getVapidKey = (req, res) => {
    const key = process.env.VAPID_PUBLIC_KEY;
    if (!key) return res.status(503).json({ message: 'Push notifications not configured' });
    res.json({ publicKey: key });
};

exports.subscribe = async (req, res) => {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ message: 'Invalid subscription object' });
    }

    try {
        await PushSubscription.findOneAndUpdate(
            { user: req.user.id, endpoint },
            { user: req.user.id, endpoint, keys },
            { upsert: true, new: true },
        );
        res.status(201).json({ message: 'Subscribed' });
    } catch (err) {
        logger.error({ err: err.message }, 'push.subscribe error');
        res.status(500).json({ message: 'Server error' });
    }
};

exports.unsubscribe = async (req, res) => {
    const { endpoint } = req.body;
    try {
        await PushSubscription.deleteOne({ user: req.user.id, endpoint });
        res.json({ message: 'Unsubscribed' });
    } catch (err) {
        logger.error({ err: err.message }, 'push.unsubscribe error');
        res.status(500).json({ message: 'Server error' });
    }
};

// Helper used by the task reminder scheduler
exports.sendPushToUser = async (userId, payload) => {
    if (!process.env.VAPID_PUBLIC_KEY) return;
    const subs = await PushSubscription.find({ user: userId });
    for (const sub of subs) {
        try {
            await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: sub.keys },
                JSON.stringify(payload),
            );
        } catch (err) {
            if (err.statusCode === 410 || err.statusCode === 404) {
                // Subscription expired — remove it
                await PushSubscription.deleteOne({ _id: sub._id });
            } else {
                logger.warn({ err: err.message, userId }, 'Push send failed');
            }
        }
    }
};
