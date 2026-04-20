// backend/src/controllers/chatController.js
const db = require('../models');
const { Chat, ChatParticipant, Message, User } = db;

exports.getChats = async (req, res) => {
  const userId = req.user.id;
  const chats = await Chat.findAll({
    include: [
      { model: User, through: { where: { userId } }, attributes: [] },
      { model: User, attributes: ['id','fullName','email'] },
      { model: Message, limit: 1, order: [['createdAt','DESC']] }
    ],
    order: [[{ model: Message }, 'createdAt', 'DESC']],
  });
  return res.json(chats);
};

exports.createChat = async (req, res) => {
  const { participantIds, name, isGroup } = req.body;
  if (!participantIds || !participantIds.length) return res.status(400).json({ message: 'Participants requis' });

  const chat = await Chat.create({ name: isGroup ? name : null, isGroup: !!isGroup, createdBy: req.user.id });
  const participants = [...new Set([req.user.id, ...participantIds])].map(userId => ({ chatId: chat.id, userId }));
  await ChatParticipant.bulkCreate(participants);
  return res.status(201).json(chat);
};

exports.getMessages = async (req, res) => {
  const { chatId } = req.params;
  const messages = await Message.findAll({
    where: { chatId },
    include: [{ model: User, as: 'User', attributes: ['id','fullName'] }],
    order: [['createdAt','ASC']],
  });
  return res.json(messages);
};

exports.sendMessage = async (req, res) => {
  const { chatId } = req.params;
  const { content } = req.body;
  if (!content) return res.status(400).json({ message: 'Message vide' });
  const message = await Message.create({ chatId, senderId: req.user.id, content });
  return res.status(201).json(message);
};

exports.addParticipant = async (req, res) => {
  const { chatId } = req.params;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ message: 'UserId requis' });
  await ChatParticipant.create({ chatId, userId });
  return res.status(200).json({ message: 'Participant ajouté' });
};