const Segment = require('../models/segment.model');
const Customer = require('../models/customer.model');
const { buildFinalQuery } = require('../services/query-builder.service');

exports.createSegment = async (req, res) => {
    try {
        const { name, description, tags, rules, exclusions } = req.body;
        const segment = await Segment.create({
            name, description, tags, rules, exclusions,
            createdBy: req.user.id,
        });
        res.status(201).json({ segment });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getSegments = async (req, res) => {
    try {
        const segments = await Segment.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json({ segments });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getSegmentById = async (req, res) => {
    try {
        const segment = await Segment.findOne({ _id: req.params.id, createdBy: req.user.id });
        if (!segment) return res.status(404).json({ message: 'Segment not found' });
        res.status(200).json({ segment });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.deleteSegment = async (req, res) => {
    try {
        const segment = await Segment.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
        if (!segment) return res.status(404).json({ message: 'Segment not found' });
        res.status(200).json({ message: 'Segment deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Preview: returns audience count + up to 5 sample customer names
exports.previewSegment = async (req, res) => {
    try {
        const { rules, exclusions } = req.body;

        if (!rules || !rules.conditions || rules.conditions.length === 0) {
            return res.status(200).json({ count: 0, samples: [], excludedCount: 0 });
        }

        const includeQuery = buildFinalQuery(rules, []);
        const fullQuery    = buildFinalQuery(rules, exclusions || []);

        const [count, samples, includedBeforeExclusion] = await Promise.all([
            Customer.countDocuments(fullQuery),
            Customer.find(fullQuery).select('name email').limit(5).lean(),
            exclusions?.length ? Customer.countDocuments(includeQuery) : null,
        ]);

        const excludedCount = includedBeforeExclusion !== null ? includedBeforeExclusion - count : 0;

        res.status(200).json({ count, samples, excludedCount });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
