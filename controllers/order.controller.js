const Order = require('../models/order.model');
const Customer = require('../models/customer.model');

// Create a new order
exports.createOrder = async (req, res) => {
    try {
        const { customer: customerId, amount, products } = req.body;
        
        // Verify customer exists
        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        
        const order = new Order({
            customer: customerId,
            amount,
            products,
            orderDate: new Date()
        });
        
        await order.save();
        
        // Update customer's total spend and last activity
        await Customer.findByIdAndUpdate(customerId, {
            $inc: { totalSpend: amount, visits: 1 },
            lastActivity: new Date()
        });
        
        res.status(201).json({ message: 'Order created successfully', order });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get all orders
exports.getOrders = async (req, res) => {
    try {
        const orders = await Order.find({})
            .populate('customer', 'name email')
            .sort({ orderDate: -1 });
        
        res.status(200).json({ orders });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get a single order by ID
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('customer', 'name email');
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        res.status(200).json({ order });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get orders by customer ID
exports.getOrdersByCustomer = async (req, res) => {
    try {
        const orders = await Order.find({ customer: req.params.customerId })
            .sort({ orderDate: -1 });
            
        res.status(200).json({ orders });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        res.status(200).json({ message: 'Order status updated successfully', order });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};