const LeadForm  = require('../models/lead-form.model');
const Customer  = require('../models/customer.model');
const logger    = require('../utils/logger');

// ── authenticated ─────────────────────────────────────────────────────────────

exports.getForms = async (req, res) => {
  try {
    const forms = await LeadForm.find({ createdBy: req.user.id }).sort('-createdAt');
    res.json(forms);
  } catch (err) {
    logger.error({ err: err.message }, 'getForms');
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.createForm = async (req, res) => {
  try {
    const form = await LeadForm.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json(form);
  } catch (err) {
    logger.error({ err: err.message }, 'createForm');
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateForm = async (req, res) => {
  try {
    const form = await LeadForm.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      req.body,
      { new: true, runValidators: true },
    );
    if (!form) return res.status(404).json({ message: 'Form not found' });
    res.json(form);
  } catch (err) {
    logger.error({ err: err.message }, 'updateForm');
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteForm = async (req, res) => {
  try {
    await LeadForm.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    res.json({ message: 'Deleted' });
  } catch (err) {
    logger.error({ err: err.message }, 'deleteForm');
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ── public (no auth) ──────────────────────────────────────────────────────────

exports.getPublicForm = async (req, res) => {
  try {
    const form = await LeadForm
      .findOne({ token: req.params.token, active: true })
      .select('name fields submitMessage');
    if (!form) return res.status(404).json({ message: 'Form not found or inactive' });
    res.json(form);
  } catch (err) {
    logger.error({ err: err.message }, 'getPublicForm');
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.submitForm = async (req, res) => {
  try {
    const form = await LeadForm.findOne({ token: req.params.token, active: true });
    if (!form) return res.status(404).json({ message: 'Form not found or inactive' });

    const { name, email, phone } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const normalEmail = email.toLowerCase().trim();
    const existing = await Customer.findOne({ email: normalEmail });
    if (!existing) {
      await Customer.create({
        name:         name || normalEmail,
        email:        normalEmail,
        phone:        phone || '',
        tags:         ['lead'],
        lastActivity: new Date(),
      });
    }

    await LeadForm.updateOne({ _id: form._id }, { $inc: { submissionsCount: 1 } });
    logger.info({ token: form.token, email: normalEmail }, 'Lead form submission');
    res.json({ message: form.submitMessage });
  } catch (err) {
    logger.error({ err: err.message }, 'submitForm');
    res.status(500).json({ message: 'Internal server error' });
  }
};
