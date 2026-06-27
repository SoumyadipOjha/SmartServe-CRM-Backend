const express = require('express');
const router  = express.Router();
const ctrl    = require('./lead-form.controller');
const { authenticateJWT } = require('../../middleware/auth.middleware');

// Public routes must come before /:id to avoid "public" matching as an id
router.get('/public/:token',        ctrl.getPublicForm);
router.post('/public/:token/submit', ctrl.submitForm);

// Authenticated CRUD
router.get('/',    authenticateJWT, ctrl.getForms);
router.post('/',   authenticateJWT, ctrl.createForm);
router.patch('/:id', authenticateJWT, ctrl.updateForm);
router.delete('/:id', authenticateJWT, ctrl.deleteForm);

module.exports = router;
