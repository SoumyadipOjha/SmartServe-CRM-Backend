const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');
const { validateCustomer } = require('../middleware/validation.middleware');
const { authenticateJWT } = require('../middleware/auth.middleware');

// POST /api/customers - Create a new customer
router.post('/', authenticateJWT, validateCustomer, customerController.createCustomer);

// GET /api/customers - Get all customers
router.get('/', authenticateJWT, customerController.getCustomers);

// GET /api/customers/:id - Get a single customer by ID
router.get('/:id', authenticateJWT, customerController.getCustomerById);

// PUT /api/customers/:id - Update a customer
router.put('/:id', authenticateJWT, validateCustomer, customerController.updateCustomer);

// DELETE /api/customers/:id - Delete a customer
router.delete('/:id', authenticateJWT, customerController.deleteCustomer);

module.exports = router;