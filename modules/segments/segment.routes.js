const express = require('express');
const router = express.Router();
const segmentController = require('./segment.controller');
const { authenticateJWT } = require('../../middleware/auth.middleware');

router.use(authenticateJWT);

router.get('/',           segmentController.getSegments);
router.post('/',          segmentController.createSegment);
router.post('/preview',   segmentController.previewSegment);
router.get('/:id',        segmentController.getSegmentById);
router.delete('/:id',     segmentController.deleteSegment);

module.exports = router;
