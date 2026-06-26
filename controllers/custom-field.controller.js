'use strict';

const CustomFieldDef = require('../models/custom-field-def.model');
const Customer       = require('../models/customer.model');
const logger         = require('../utils/logger');

function err500(res, e, label) {
    logger.error({ err: e.message }, `[customField] ${label}`);
    return res.status(500).json({ message: 'Internal server error' });
}

// ── Field definitions (per-user schema) ──────────────────────────────────────

exports.getFieldDefs = async (req, res) => {
    try {
        const defs = await CustomFieldDef.find({ createdBy: req.user.id }).sort({ createdAt: 1 });
        res.json({ defs });
    } catch (e) { return err500(res, e, 'getFieldDefs'); }
};

exports.createFieldDef = async (req, res) => {
    try {
        const { name, fieldType } = req.body;
        if (!name?.trim()) return res.status(400).json({ message: 'Name is required' });

        const key = name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        if (!key) return res.status(400).json({ message: 'Could not derive a valid key from name' });

        const def = await CustomFieldDef.create({
            createdBy: req.user.id,
            name:      name.trim(),
            key,
            fieldType: fieldType || 'text',
        });
        res.status(201).json({ def });
    } catch (e) {
        if (e.code === 11000) return res.status(409).json({ message: 'A field with that name already exists' });
        return err500(res, e, 'createFieldDef');
    }
};

exports.deleteFieldDef = async (req, res) => {
    try {
        const def = await CustomFieldDef.findOneAndDelete({ _id: req.params.defId, createdBy: req.user.id });
        if (!def) return res.status(404).json({ message: 'Field definition not found' });
        res.json({ message: 'Field deleted' });
    } catch (e) { return err500(res, e, 'deleteFieldDef'); }
};

// ── Field values on a customer ────────────────────────────────────────────────

exports.setCustomerFields = async (req, res) => {
    try {
        const { fields } = req.body; // { key: value, ... }
        if (!fields || typeof fields !== 'object') return res.status(400).json({ message: 'fields object required' });

        const customer = await Customer.findById(req.params.customerId);
        if (!customer) return res.status(404).json({ message: 'Customer not found' });

        for (const [k, v] of Object.entries(fields)) {
            customer.customFields.set(k, v);
        }
        await customer.save();

        res.json({ customFields: Object.fromEntries(customer.customFields) });
    } catch (e) { return err500(res, e, 'setCustomerFields'); }
};
