'use strict';

const Task   = require('../models/task.model');
const logger = require('../utils/logger');

function serverError(res, err, label = 'Server error') {
    logger.error({ err: err.message }, `[task] ${label}`);
    return res.status(500).json({ message: 'Internal server error' });
}

exports.createTask = async (req, res) => {
    try {
        const { customerId } = req.params;
        const { title, description, dueDate, priority } = req.body;

        if (!title?.trim()) return res.status(400).json({ message: 'Title is required' });

        const task = await Task.create({
            customer:    customerId,
            createdBy:   req.user.id,
            title:       title.trim(),
            description: description?.trim(),
            dueDate:     dueDate ? new Date(dueDate) : null,
            priority:    priority || 'medium',
        });

        res.status(201).json({ task });
    } catch (err) {
        return serverError(res, err, 'createTask');
    }
};

exports.getTasksForCustomer = async (req, res) => {
    try {
        const tasks = await Task.find({
            customer:  req.params.customerId,
            createdBy: req.user.id,
        }).sort({ completed: 1, dueDate: 1, createdAt: -1 });

        res.json({ tasks });
    } catch (err) {
        return serverError(res, err, 'getTasksForCustomer');
    }
};

exports.getAllTasks = async (req, res) => {
    try {
        const filter = { createdBy: req.user.id };
        if (req.query.completed === 'false') filter.completed = false;
        if (req.query.completed === 'true')  filter.completed = true;

        const tasks = await Task.find(filter)
            .populate('customer', 'name email')
            .sort({ completed: 1, dueDate: 1, createdAt: -1 })
            .limit(200);

        res.json({ tasks });
    } catch (err) {
        return serverError(res, err, 'getAllTasks');
    }
};

exports.updateTask = async (req, res) => {
    try {
        const { title, description, dueDate, priority, completed } = req.body;

        const update = {};
        if (title       !== undefined) update.title       = title.trim();
        if (description !== undefined) update.description = description?.trim();
        if (dueDate     !== undefined) update.dueDate     = dueDate ? new Date(dueDate) : null;
        if (priority    !== undefined) update.priority    = priority;
        if (completed   !== undefined) {
            update.completed   = completed;
            update.completedAt = completed ? new Date() : null;
        }

        const task = await Task.findOneAndUpdate(
            { _id: req.params.taskId, createdBy: req.user.id },
            update,
            { new: true }
        );

        if (!task) return res.status(404).json({ message: 'Task not found' });
        res.json({ task });
    } catch (err) {
        return serverError(res, err, 'updateTask');
    }
};

exports.deleteTask = async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({
            _id:       req.params.taskId,
            createdBy: req.user.id,
        });
        if (!task) return res.status(404).json({ message: 'Task not found' });
        res.json({ message: 'Task deleted' });
    } catch (err) {
        return serverError(res, err, 'deleteTask');
    }
};
