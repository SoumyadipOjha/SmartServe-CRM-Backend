const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { validateOrder } = require('../middleware/validation.middleware');
const { authenticateJWT } = require('../middleware/auth.middleware');

// POST /api/orders - Create a new order
router.post('/', validateOrder, orderController.createOrder);

// GET /api/orders - Get all orders
router.get('/', authenticateJWT, orderController.getOrders);

// GET /api/orders/:id - Get a single order by ID
router.get('/:id', authenticateJWT, orderController.getOrderById);

// GET /api/orders/customer/:customerId - Get orders by customer ID
router.get('/customer/:customerId', authenticateJWT, orderController.getOrdersByCustomer);

// PATCH /api/orders/:id/status - Update order status
router.patch('/:id/status', authenticateJWT, orderController.updateOrderStatus);

module.exports = router;