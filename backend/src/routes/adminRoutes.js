const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const { getUsers, activateUser, rejectUser, updateUser, deleteUser, getOrgChart, updateOrgChart, getStats } = require('../controllers/adminController');
const router = express.Router();

router.use(protect, adminOnly);
router.get('/users', getUsers);
router.put('/users/:id/activate', activateUser);
router.put('/users/:id/reject', rejectUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.get('/orgchart', getOrgChart);
router.put('/orgchart', updateOrgChart);
router.get('/stats', getStats);

module.exports = router;