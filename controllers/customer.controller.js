const Customer = require('../models/customer.model');

// Create a new customer
exports.createCustomer = async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        
        // Check if customer already exists
        const existingCustomer = await Customer.findOne({ email });
        if (existingCustomer) {
            return res.status(409).json({ message: 'Customer with this email already exists' });
        }
        
        const customer = new Customer({
            name,
            email,
            phone,
            lastActivity: new Date()
        });
        
        await customer.save();
        res.status(201).json({ message: 'Customer created successfully', customer });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get all customers
exports.getCustomers = async (req, res) => {
    try {
        const customers = await Customer.find({}).sort({ createdAt: -1 });
        res.status(200).json({ customers });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get a single customer by ID
exports.getCustomerById = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        
        res.status(200).json({ customer });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update a customer
exports.updateCustomer = async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        
        const customer = await Customer.findByIdAndUpdate(
            req.params.id,
            { name, email, phone, updatedAt: new Date() },
            { new: true, runValidators: true }
        );
        
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        
        res.status(200).json({ message: 'Customer updated successfully', customer });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Delete a customer
exports.deleteCustomer = async (req, res) => {
    try {
        const customer = await Customer.findByIdAndDelete(req.params.id);
        
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        
        res.status(200).json({ message: 'Customer deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};