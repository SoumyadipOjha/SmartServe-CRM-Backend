'use strict';

const Task        = require('../../models/task.model');
const User        = require('../../models/user.model');
const Customer    = require('../../models/customer.model');
const emailService = require('../email/email.service');
const logger      = require('../../utils/logger');

const INTERVAL_MS = 60 * 60 * 1000; // check every hour
let _timer = null;

async function sendReminders() {
    try {
        const now       = new Date();
        const in24h     = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // Find incomplete tasks due within the next 24 hours that haven't had a reminder sent
        const tasks = await Task.find({
            completed:      false,
            dueDate:        { $gte: now, $lte: in24h },
            reminderSentAt: null,
        }).populate('customer', 'name').populate('createdBy', 'name email');

        if (!tasks.length) return;

        logger.info({ count: tasks.length }, 'Task reminder: processing due-soon tasks');

        for (const task of tasks) {
            try {
                const user     = task.createdBy;
                const customer = task.customer;

                if (!user?.email) continue;

                await emailService.sendTaskReminderEmail({
                    to:              user.email,
                    userName:        user.name || 'there',
                    taskTitle:       task.title,
                    taskDescription: task.description || '',
                    dueDate:         task.dueDate,
                    customerName:    customer?.name || null,
                    priority:        task.priority,
                });

                await Task.findByIdAndUpdate(task._id, { reminderSentAt: now });
                logger.info({ taskId: task._id, to: user.email }, 'Task reminder sent');
            } catch (err) {
                logger.error({ err: err.message, taskId: task._id }, 'Failed to send task reminder');
            }
        }
    } catch (err) {
        logger.error({ err: err.message }, 'Task reminder scheduler error');
    }
}

module.exports = {
    start() {
        if (_timer) return;
        sendReminders(); // run once immediately on start
        _timer = setInterval(sendReminders, INTERVAL_MS);
        logger.info('Task reminder scheduler started (interval: 1h)');
    },
    stop() {
        if (_timer) { clearInterval(_timer); _timer = null; }
    },
};
