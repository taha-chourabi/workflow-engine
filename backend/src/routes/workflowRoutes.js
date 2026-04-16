const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const { createWorkflow, updateWorkflow, getAllWorkflows, getWorkflowByName } = require('../controllers/workflowController');
const router = express.Router();

router.get('/', protect, getAllWorkflows);
router.get('/:name', protect, getWorkflowByName);
router.post('/', protect, adminOnly, createWorkflow);
router.put('/:id', protect, adminOnly, updateWorkflow);

module.exports = router;