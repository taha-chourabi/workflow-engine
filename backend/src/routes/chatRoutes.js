const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { 
  getChats, 
  getChatById, 
  getMessages, 
  sendMessage, 
  createChat 
} = require('../controllers/chatController');

// Get all chats for current user
router.get('/', protect, getChats);

// Get specific chat by ID
router.get('/:id', protect, getChatById);

// Get messages for a specific chat
router.get('/:id/messages', protect, getMessages);

// Send message to a chat
router.post('/:id/messages', protect, sendMessage);

// Create new chat
router.post('/', protect, createChat);

module.exports = router;
