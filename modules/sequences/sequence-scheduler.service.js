'use strict';

const SequenceEnrollment = require('../../models/sequence-enrollment.model');
const Sequence           = require('../../models/sequence.model');
const Customer           = require('../../models/customer.model');
const emailService       = require('../email/email.service');
const logger             = require('../../utils/logger');

const INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes
let _timer = null;

async function processEnrollments() {
  try {
    const now = new Date();
    const due = await SequenceEnrollment.find({
      status:     'active',
      nextSendAt: { $lte: now },
    }).populate('sequence').populate('customer');

    if (!due.length) return;
    logger.info({ count: due.length }, 'Sequence scheduler: processing due enrollments');

    for (const enrollment of due) {
      try {
        const seq      = enrollment.sequence;
        const customer = enrollment.customer;

        if (!seq || !seq.active || !customer) {
          await SequenceEnrollment.updateOne({ _id: enrollment._id }, { status: 'cancelled' });
          continue;
        }

        const stepIndex = enrollment.currentStep;
        if (stepIndex >= seq.steps.length) {
          await SequenceEnrollment.updateOne(
            { _id: enrollment._id },
            { status: 'completed', completedAt: now },
          );
          continue;
        }

        const step = seq.steps[stepIndex];

        // Send email
        try {
          await emailService.sendCampaignEmail({
            to:           customer.email,
            customerName: customer.name,
            campaignName: `${seq.name} — Step ${stepIndex + 1}`,
            message:      step.body,
          });
        } catch (mailErr) {
          logger.warn({ err: mailErr.message, enrollmentId: enrollment._id }, 'Sequence email send failed, will retry');
          continue;
        }

        // Advance to next step
        const nextIndex = stepIndex + 1;
        const isLast    = nextIndex >= seq.steps.length;

        let update;
        if (isLast) {
          update = {
            currentStep: nextIndex,
            status:      'completed',
            completedAt: now,
            $push: { stepsLog: { stepIndex, sentAt: now, subject: step.subject } },
          };
        } else {
          const nextStep   = seq.steps[nextIndex];
          const nextSendAt = new Date(now);
          nextSendAt.setDate(nextSendAt.getDate() + (nextStep.delayDays || 1));
          update = {
            currentStep: nextIndex,
            nextSendAt,
            $push: { stepsLog: { stepIndex, sentAt: now, subject: step.subject } },
          };
        }

        await SequenceEnrollment.updateOne({ _id: enrollment._id }, update);
        logger.info({ enrollmentId: enrollment._id, stepIndex, email: customer.email }, 'Sequence step sent');
      } catch (enrollErr) {
        logger.error({ err: enrollErr.message, enrollmentId: enrollment._id }, 'Sequence enrollment processing error');
      }
    }
  } catch (err) {
    logger.error({ err: err.message }, 'Sequence scheduler run error');
  }
}

module.exports = {
  start() {
    if (_timer) return;
    processEnrollments(); // run immediately on start
    _timer = setInterval(processEnrollments, INTERVAL_MS);
    logger.info('Sequence scheduler started (5m interval)');
  },
  stop() {
    if (_timer) {
      clearInterval(_timer);
      _timer = null;
      logger.info('Sequence scheduler stopped');
    }
  },
};
