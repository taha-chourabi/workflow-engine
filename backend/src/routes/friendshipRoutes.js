const express = require('express');
const {
  sendFriendRequest,
  getFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
  getFriends,
  getAllUsers
} = require('../controllers/friendshipController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/request', sendFriendRequest);
router.get('/requests', getFriendRequests);
router.put('/requests/:requestId/accept', acceptFriendRequest);
router.put('/requests/:requestId/decline', declineFriendRequest);
router.get('/friends', getFriends);
router.get('/users', getAllUsers);

module.exports = router;
