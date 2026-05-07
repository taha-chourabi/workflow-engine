const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { 
  getChats, 
  getChatById, 
  getMessages, 
  sendMessage, 
  createChat,
  deleteMessage,
  deleteChat
} = require('../controllers/chatController');

router.use(protect);

router.get('/', getChats);

router.get('/:id', getChatById);

router.get('/:id/messages', getMessages);

router.post('/:id/messages', sendMessage);

router.delete('/:id/messages/:messageId', deleteMessage);

router.post('/', createChat);

router.delete('/:id', deleteChat);

module.exports = router;
