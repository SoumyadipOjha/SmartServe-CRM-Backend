'use strict';

const express = require('express');
const router  = express.Router();
const { authenticateJWT } = require('../../middleware/auth.middleware');
const ctrl = require('./custom-field.controller');

router.use(authenticateJWT);

// Field definitions
router.get('/',            ctrl.getFieldDefs);
router.post('/',           ctrl.createFieldDef);
router.delete('/:defId',   ctrl.deleteFieldDef);

// Set values on a customer — PATCH /api/custom-fields/customers/:customerId
router.patch('/customers/:customerId', ctrl.setCustomerFields);

module.exports = router;
