// backend/src/controllers/chatController.js

const db = require('../models');

const { Chat, ChatParticipant, Message, User } = db;



exports.getChats = async (req, res) => {
  const userId = req.user.id;
  const chats = await Chat.findAll({
    include: [
      {
        model: ChatParticipant,
        where: { userId },
        attributes: []
      },
      {
        model: User,
        through: { attributes: [] },
        attributes: ['id', 'fullName', 'email']
      },
      {
        model: Message,
        limit: 1,
        order: [['createdAt', 'DESC']]
      }
    ],
    order: [['createdAt', 'DESC']],
    distinct: true,
  });
  return res.json(chats);
};



exports.createChat = async (req, res) => {

  const { participantIds, name, isGroup } = req.body;

  if (!participantIds || !participantIds.length) return res.status(400).json({ message: 'Participants requis' });



  const chat = await Chat.create({ name: isGroup ? name : null, isGroup: !!isGroup, createdBy: req.user.id });

  console.log('Chat created with ID:', chat.id);

  const participants = [...new Set([req.user.id, ...participantIds])].map(userId => ({ chatId: chat.id, userId }));

  await ChatParticipant.bulkCreate(participants);

  console.log('Participants added to chat:', participants.length);

  return res.status(201).json(chat);

};



exports.getChatById = async (req, res) => {

  const { id } = req.params;

  console.log('GET /api/chats/:id - Request received for chat ID:', id);

  console.log('User ID:', req.user?.id);

  

  try {

    const chat = await Chat.findByPk(id, {

      include: [

        {

          model: User,

          through: { attributes: [] },

          attributes: ['id', 'fullName', 'email']

        }

      ]

    });



    console.log('Chat found:', !!chat);



    if (!chat) {

      console.log('Chat not found, creating new chat');

      // Create a new chat if it doesn't exist

      const newChat = await Chat.create({

        name: 'New Chat',

        isGroup: false,

        createdBy: req.user.id

      });



      console.log('New chat created with ID:', newChat.id);



      // Add current user as participant

      await ChatParticipant.create({

        chatId: newChat.id,

        userId: req.user.id

      });



      // Fetch the new chat with participants

      const chatWithParticipants = await Chat.findByPk(newChat.id, {

        include: [

          {

            model: User,

            through: { attributes: [] },

            attributes: ['id', 'fullName', 'email']

          }

        ]

      });



      return res.json(chatWithParticipants);

    }



    res.json(chat);

  } catch (error) {

    console.error('Error in getChatById:', error);

    res.status(500).json({ message: 'Erreur serveur', error: error.message });

  }

};



exports.getMessages = async (req, res) => {

  const { chatId } = req.params;

  console.log('GET /api/chats/:id/messages - Request received for chat ID:', chatId);

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



exports.deleteMessage = async (req, res) => {
  const { chatId, messageId } = req.params;
  const message = await Message.findOne({ where: { id: messageId, chatId } });

  if (!message) {
    return res.status(404).json({ message: 'Message introuvable' });
  }

  if (String(message.senderId) !== String(req.user.id)) {
    return res.status(403).json({ message: 'Action non autorisée' });
  }

  await message.destroy();
  return res.status(200).json({ message: 'Message supprimé' });
};


exports.addParticipant = async (req, res) => {

  const { chatId } = req.params;

  const { userId } = req.body;

  if (!userId) return res.status(400).json({ message: 'UserId requis' });

  await ChatParticipant.create({ chatId, userId });

  return res.status(200).json({ message: 'Participant ajouté' });

};

exports.deleteChat = async (req, res) => {
  const { id } = req.params;
  const participant = await ChatParticipant.findOne({ where: { chatId: id, userId: req.user.id } });

  if (!participant) {
    return res.status(403).json({ message: 'Action non autorisée' });
  }

  const chat = await Chat.findByPk(id);
  if (!chat) {
    return res.status(404).json({ message: 'Conversation introuvable' });
  }

  await Message.destroy({ where: { chatId: id } });
  await ChatParticipant.destroy({ where: { chatId: id } });
  await chat.destroy();

  return res.status(200).json({ message: 'Conversation supprimée' });
};