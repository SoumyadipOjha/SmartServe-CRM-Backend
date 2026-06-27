const express = require("express");
const router = express.Router();
const customerController = require("./customer.controller");
const { validateCustomer } = require("../../middleware/validation.middleware");
const { authenticateJWT } = require("../../middleware/auth.middleware");

// POST /api/customers - Create a new customer
router.post(
  "/",
  authenticateJWT,
  validateCustomer,
  customerController.createCustomer
);

// POST /api/customers/bulk - Create multiple customers
router.post("/bulk", authenticateJWT, customerController.bulkUpload);

// GET /api/customers - Get all customers
router.get("/", authenticateJWT, customerController.getCustomers);

// GET /api/customers/:id/profile - Full 360 profile (orders, comms, stats)
router.get("/:id/profile", authenticateJWT, customerController.getCustomerProfile);

// GET /api/customers/:id - Get a single customer by ID
router.get("/:id", authenticateJWT, customerController.getCustomerById);

// PUT /api/customers/:id - Update a customer
router.put(
  "/:id",
  authenticateJWT,
  validateCustomer,
  customerController.updateCustomer
);

// DELETE /api/customers/:id - Delete a customer
router.delete("/:id", authenticateJWT, customerController.deleteCustomer);

// POST /api/customers/:id/notes - Add a note
router.post("/:id/notes", authenticateJWT, customerController.addNote);

// DELETE /api/customers/:id/notes/:noteId - Delete a note
router.delete("/:id/notes/:noteId", authenticateJWT, customerController.deleteNote);

module.exports = router;
