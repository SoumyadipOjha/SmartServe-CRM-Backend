'use strict';

const Deal   = require('../models/deal.model');
const logger = require('../utils/logger');

function serverError(res, err, label = 'Server error') {
    logger.error({ err: err.message }, `[deal] ${label}`);
    return res.status(500).json({ message: 'Internal server error' });
}

exports.getDeals = async (req, res) => {
    try {
        const deals = await Deal.find({ createdBy: req.user.id })
            .populate('customer', 'name email')
            .sort({ stage: 1, order: 1, createdAt: -1 });
        res.json({ deals });
    } catch (err) {
        return serverError(res, err, 'getDeals');
    }
};

exports.createDeal = async (req, res) => {
    try {
        const { title, customerId, stage, value, expectedCloseDate, notes } = req.body;

        if (!title?.trim())  return res.status(400).json({ message: 'Title is required' });
        if (!customerId)     return res.status(400).json({ message: 'Customer is required' });

        // Place new card at end of its column
        const maxOrder = await Deal.countDocuments({ createdBy: req.user.id, stage: stage || 'lead' });

        const deal = await Deal.create({
            title:             title.trim(),
            customer:          customerId,
            createdBy:         req.user.id,
            stage:             stage || 'lead',
            value:             Number(value) || 0,
            expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
            notes:             notes?.trim(),
            order:             maxOrder,
        });

        await deal.populate('customer', 'name email');
        res.status(201).json({ deal });
    } catch (err) {
        return serverError(res, err, 'createDeal');
    }
};

exports.updateDeal = async (req, res) => {
    try {
        const { title, stage, value, expectedCloseDate, notes } = req.body;
        const update = {};
        if (title             !== undefined) update.title             = title.trim();
        if (stage             !== undefined) update.stage             = stage;
        if (value             !== undefined) update.value             = Number(value) || 0;
        if (expectedCloseDate !== undefined) update.expectedCloseDate = expectedCloseDate ? new Date(expectedCloseDate) : null;
        if (notes             !== undefined) update.notes             = notes?.trim();

        const deal = await Deal.findOneAndUpdate(
            { _id: req.params.id, createdBy: req.user.id },
            update,
            { new: true }
        ).populate('customer', 'name email');

        if (!deal) return res.status(404).json({ message: 'Deal not found' });
        res.json({ deal });
    } catch (err) {
        return serverError(res, err, 'updateDeal');
    }
};

// Bulk reorder after a drag-drop: body = { updates: [{ id, stage, order }] }
exports.reorderDeals = async (req, res) => {
    try {
        const { updates } = req.body;
        if (!Array.isArray(updates)) return res.status(400).json({ message: 'updates array required' });

        await Promise.all(updates.map(({ id, stage, order }) =>
            Deal.updateOne(
                { _id: id, createdBy: req.user.id },
                { stage, order }
            )
        ));

        res.json({ message: 'Reordered' });
    } catch (err) {
        return serverError(res, err, 'reorderDeals');
    }
};

exports.deleteDeal = async (req, res) => {
    try {
        const deal = await Deal.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
        if (!deal) return res.status(404).json({ message: 'Deal not found' });
        res.json({ message: 'Deal deleted' });
    } catch (err) {
        return serverError(res, err, 'deleteDeal');
    }
};
