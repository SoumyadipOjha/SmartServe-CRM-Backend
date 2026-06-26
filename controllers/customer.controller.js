const Customer = require("../models/customer.model");
const Order = require("../models/order.model");
const CommunicationLog = require("../models/communication-log.model");
const logger = require("../utils/logger");

exports.createCustomer = async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      return res.status(409).json({ message: "Customer with this email already exists" });
    }

    const customer = new Customer({ name, email, phone, lastActivity: new Date() });
    await customer.save();
    res.status(201).json({ message: "Customer created successfully", customer });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getCustomers = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip  = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      Customer.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Customer.countDocuments(),
    ]);

    res.status(200).json({
      customers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.status(200).json({ customer });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const { name, email, phone, tags } = req.body;
    const update = { name, email, phone, updatedAt: new Date() };
    if (Array.isArray(tags)) update.tags = tags.map(t => String(t).trim().toLowerCase()).filter(Boolean);

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );

    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.status(200).json({ message: "Customer updated successfully", customer });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.addNote = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: 'Note content is required' });

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { $push: { notes: { content: content.trim() } } },
      { new: true }
    );
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const note = customer.notes[customer.notes.length - 1];
    res.status(201).json({ note });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { $pull: { notes: { _id: req.params.noteId } } },
      { new: true }
    );
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.status(200).json({ message: 'Note deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.status(200).json({ message: "Customer deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getCustomerProfile = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const [orders, communicationLogs] = await Promise.all([
      Order.find({ customer: customer._id }).sort({ orderDate: -1 }),
      CommunicationLog.find({ customer: customer._id })
        .populate("campaign", "name status")
        .sort({ sentAt: -1 }),
    ]);

    const daysSinceLastActivity = Math.floor(
      (Date.now() - new Date(customer.lastActivity).getTime()) / (1000 * 60 * 60 * 24)
    );

    const avgOrderValue =
      orders.length > 0
        ? orders.reduce((sum, o) => sum + o.amount, 0) / orders.length
        : 0;

    let healthStatus = "active";
    if (daysSinceLastActivity > 60) healthStatus = "dormant";
    else if (daysSinceLastActivity > 30) healthStatus = "at_risk";

    res.status(200).json({
      customer,
      orders,
      communicationLogs,
      stats: {
        orderCount: orders.length,
        daysSinceLastActivity,
        avgOrderValue: Math.round(avgOrderValue),
        healthStatus,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.bulkUpload = async (req, res) => {
  try {
    const { customers } = req.body;

    if (!Array.isArray(customers)) {
      return res.status(400).json({ success: false, message: "Invalid data format. Expected array of customers" });
    }

    const validCustomers = customers
      .map((customer) => ({
        name: customer.name?.trim(),
        email: customer.email?.trim().toLowerCase(),
        phone: customer.phone?.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
      .filter((customer) => customer.name && customer.email);

    if (validCustomers.length === 0) {
      return res.status(400).json({ success: false, message: "No valid customer data found. Name and email are required." });
    }

    const result = await Customer.insertMany(validCustomers, { ordered: false, rawResult: true });

    res.status(200).json({
      success: true,
      count: result.insertedCount,
      message: `Successfully imported ${result.insertedCount} customers`,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }
    logger.error({ err: error.message }, 'Bulk upload error');
    res.status(500).json({ success: false, message: 'Failed to import customers' });
  }
};
