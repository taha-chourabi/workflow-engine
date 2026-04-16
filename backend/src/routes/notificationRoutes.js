const express = require('express');
const { protect } = require('../middleware/auth');
const { getUserNotifications, markAsRead, markAllAsRead } = require('../controllers/notificationController');
const router = express.Router();

router.use(protect);
router.get('/', getUserNotifications);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);

module.exports = router;