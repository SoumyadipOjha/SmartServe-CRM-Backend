const express = require('express');
const router  = express.Router();
const ctrl    = require('./sequence.controller');

router.get('/',      ctrl.getSequences);
router.get('/:id',   ctrl.getSequence);
router.post('/',     ctrl.createSequence);
router.patch('/:id', ctrl.updateSequence);
router.delete('/:id', ctrl.deleteSequence);

// Enrollments
router.get('/:id/enrollments',                     ctrl.getEnrollments);
router.post('/:id/enroll',                         ctrl.enrollCustomer);
router.patch('/:id/enrollments/:enrollmentId/cancel', ctrl.cancelEnrollment);

module.exports = router;
