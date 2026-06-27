const Sequence           = require('../../models/sequence.model');
const SequenceEnrollment = require('../../models/sequence-enrollment.model');
const Customer           = require('../../models/customer.model');
const logger             = require('../../utils/logger');

// ── Sequences CRUD ────────────────────────────────────────────────────────────

exports.getSequences = async (req, res) => {
  try {
    const sequences = await Sequence.find({ createdBy: req.user.id }).sort('-createdAt');
    res.json(sequences);
  } catch (err) {
    logger.error({ err: err.message }, 'getSequences');
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getSequence = async (req, res) => {
  try {
    const seq = await Sequence.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!seq) return res.status(404).json({ message: 'Sequence not found' });
    res.json(seq);
  } catch (err) {
    logger.error({ err: err.message }, 'getSequence');
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.createSequence = async (req, res) => {
  try {
    const seq = await Sequence.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json(seq);
  } catch (err) {
    logger.error({ err: err.message }, 'createSequence');
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateSequence = async (req, res) => {
  try {
    const seq = await Sequence.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      req.body,
      { new: true, runValidators: true },
    );
    if (!seq) return res.status(404).json({ message: 'Sequence not found' });
    res.json(seq);
  } catch (err) {
    logger.error({ err: err.message }, 'updateSequence');
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteSequence = async (req, res) => {
  try {
    await Sequence.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    await SequenceEnrollment.deleteMany({ sequence: req.params.id });
    res.json({ message: 'Deleted' });
  } catch (err) {
    logger.error({ err: err.message }, 'deleteSequence');
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Enrollments ───────────────────────────────────────────────────────────────

exports.getEnrollments = async (req, res) => {
  try {
    const filter = { createdBy: req.user.id };
    if (req.params.id) filter.sequence = req.params.id;
    if (req.query.status) filter.status = req.query.status;

    const enrollments = await SequenceEnrollment.find(filter)
      .populate('customer', 'name email')
      .populate('sequence', 'name')
      .sort('-createdAt')
      .limit(200);
    res.json(enrollments);
  } catch (err) {
    logger.error({ err: err.message }, 'getEnrollments');
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.enrollCustomer = async (req, res) => {
  try {
    const { customerId } = req.body;
    const seq = await Sequence.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!seq) return res.status(404).json({ message: 'Sequence not found' });
    if (!seq.steps.length) return res.status(400).json({ message: 'Sequence has no steps' });

    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const firstStep = seq.steps[0];
    const nextSendAt = new Date();
    nextSendAt.setDate(nextSendAt.getDate() + (firstStep.delayDays || 0));

    const enrollment = await SequenceEnrollment.create({
      sequence:    seq._id,
      customer:    customerId,
      createdBy:   req.user.id,
      currentStep: 0,
      status:      'active',
      nextSendAt,
    });

    res.status(201).json(await enrollment.populate('customer', 'name email'));
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Customer is already enrolled in this sequence' });
    }
    logger.error({ err: err.message }, 'enrollCustomer');
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.cancelEnrollment = async (req, res) => {
  try {
    const enrollment = await SequenceEnrollment.findOneAndUpdate(
      { _id: req.params.enrollmentId, createdBy: req.user.id },
      { status: 'cancelled' },
      { new: true },
    );
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });
    res.json(enrollment);
  } catch (err) {
    logger.error({ err: err.message }, 'cancelEnrollment');
    res.status(500).json({ message: 'Internal server error' });
  }
};
