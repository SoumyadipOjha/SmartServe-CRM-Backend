'use strict';

const express = require('express');
const router  = express.Router();
const { authenticateJWT } = require('../middleware/auth.middleware');
const dealController = require('../controllers/deal.controller');

router.use(authenticateJWT);

router.get('/',           dealController.getDeals);
router.post('/',          dealController.createDeal);
router.patch('/reorder',  dealController.reorderDeals);
router.patch('/:id',      dealController.updateDeal);
router.delete('/:id',     dealController.deleteDeal);

module.exports = router;
