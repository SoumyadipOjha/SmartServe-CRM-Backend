'use strict';

const express = require('express');
const router  = express.Router({ mergeParams: true }); // mergeParams for :customerId
const { authenticateJWT } = require('../middleware/auth.middleware');
const taskController = require('../controllers/task.controller');

// All task routes require authentication
router.use(authenticateJWT);

// /api/customers/:customerId/tasks
router.get('/',    taskController.getTasksForCustomer);
router.post('/',   taskController.createTask);

// /api/tasks  (global view — all tasks for this user)
// Mounted separately in index.js

// /api/tasks/:taskId
router.patch('/:taskId',  taskController.updateTask);
router.delete('/:taskId', taskController.deleteTask);

module.exports = router;
