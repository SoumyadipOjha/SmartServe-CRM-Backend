'use strict';

const express = require('express');
const router  = express.Router();
const { authenticateJWT } = require('../middleware/auth.middleware');
const taskController = require('../controllers/task.controller');

router.use(authenticateJWT);

// GET /api/tasks — all tasks for the logged-in user (with optional ?completed=false)
router.get('/', taskController.getAllTasks);

// PATCH /api/tasks/:taskId — update any task (not scoped to customer)
router.patch('/:taskId',  taskController.updateTask);
router.delete('/:taskId', taskController.deleteTask);

module.exports = router;
