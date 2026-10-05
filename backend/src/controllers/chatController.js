// backend/src/controllers/chatController.js

const db = require('../models');
const axios = require('axios');

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


const normalizeText = (text = '') => (text || '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '');

const isGenericReply = (reply = '') => {
  const normalized = normalizeText(reply || '');
  if (!normalized.trim()) return true;

  return [
    /je suis votre assistant/i,
    /posez-moi une question/i,
    /comment puis-je vous aider/i,
    /bonjour !/i,
    /avec plaisir/i,
    /je peux vous aider sur/i,
  ].some((pattern) => pattern.test(normalized));
};

const localReply = (text) => {
  const normalized = normalizeText(text);
  if (normalized.includes('workflow') || normalized.includes('etape') || normalized.includes('processus')) return 'Je peux vous aider avec les workflows : créer une demande, vérifier le statut ou valider une étape.';
  if (normalized.includes('demande') || normalized.includes('creer') || normalized.includes('nouvelle') || normalized.includes('soumettre')) return 'Pour créer une demande, allez dans Requests → Nouvelle demande.';
  if (normalized.includes('statut') || normalized.includes('suivi') || normalized.includes('avancement')) return 'Ouvrez la demande concernée dans Requests pour voir son statut.';
  if (normalized.includes('validation') || normalized.includes('valider') || normalized.includes('approuver') || normalized.includes('rejeter')) return 'Pour une validation, ouvrez la demande concernée, vérifiez les étapes requises et transmettez-la au valideur compétent.';
  if (normalized.includes('bonjour') || normalized.includes('salut')) return 'Bonjour ! Je peux vous aider à créer une demande, vérifier un statut, suivre un workflow ou traiter une validation.';
  if (normalized.includes('merci')) return 'Avec plaisir !';
  if (normalized.includes('aide') || normalized.includes('help') || normalized.includes('comment') || normalized.includes('peux') || normalized.includes('proceder') || normalized.includes('faire')) return 'Je peux vous aider à traiter une demande, vérifier un statut, suivre un workflow ou préparer une validation. Décrivez ce que vous souhaitez faire et je vous guiderai.';
  return 'Je peux vous aider à traiter une demande, suivre un workflow, vérifier un statut ou préparer une validation. Dites-moi précisément l’étape ou la procédure concernée.';
};

const callFlaskLLM = async (text) => {
  const flaskUrl = process.env.FLASK_LLM_URL || process.env.FLASK_API_URL;
  if (!flaskUrl) return null;

  const response = await axios.post(flaskUrl, {
    message: text,
    context: 'workflow app assistant',
  }, {
    timeout: Number(process.env.FLASK_LLM_TIMEOUT || 10000),
  });

  const reply = response.data?.reply || response.data?.response || response.data?.message || response.data?.answer;
  if (typeof reply === 'string' && reply.trim()) {
    return reply;
  }

  throw new Error('Flask LLM returned an empty reply');
};

// Chatbot handler - call Flask first, then external providers (Gemini, OpenAI, Hugging Face), fallback to local replies
exports.chatBot = async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ message: 'Message requis' });

  const localReply = (text) => {
    const normalized = normalizeText(text);
    if (normalized.includes('workflow') || normalized.includes('etape') || normalized.includes('processus')) return 'Je peux vous aider avec les workflows : créer une demande, vérifier le statut ou valider une étape.';
    if (normalized.includes('demande') || normalized.includes('creer') || normalized.includes('nouvelle') || normalized.includes('soumettre')) return 'Pour créer une demande, allez dans Requests → Nouvelle demande.';
    if (normalized.includes('statut') || normalized.includes('suivi') || normalized.includes('avancement')) return 'Ouvrez la demande concernée dans Requests pour voir son statut.';
    if (normalized.includes('validation') || normalized.includes('valider') || normalized.includes('approuver') || normalized.includes('rejeter')) return 'Pour une validation, ouvrez la demande concernée, vérifiez les étapes requises et transmettez-la au valideur compétent.';
    if (normalized.includes('bonjour') || normalized.includes('salut')) return 'Bonjour ! Je peux vous aider à créer une demande, vérifier un statut, suivre un workflow ou traiter une validation.';
    if (normalized.includes('merci')) return 'Avec plaisir !';
    if (normalized.includes('aide') || normalized.includes('help') || normalized.includes('comment') || normalized.includes('peux') || normalized.includes('proceder') || normalized.includes('faire')) return 'Je peux vous aider à traiter une demande, vérifier un statut, suivre un workflow ou préparer une validation. Décrivez ce que vous souhaitez faire et je vous guiderai.';
    return 'Je peux vous aider à traiter une demande, suivre un workflow, vérifier un statut ou préparer une validation. Dites-moi précisément l’étape ou la procédure concernée.';
  };

  try {
    // Flask LLM service (preferred when configured)
    try {
      const flaskReply = await callFlaskLLM(message);
      if (flaskReply && !isGenericReply(flaskReply)) {
        return res.json({ reply: flaskReply });
      }
    } catch (flaskErr) {
      console.warn('Flask LLM unavailable, falling back:', flaskErr.message || flaskErr);
    }

    // Gemini via custom URL if configured, otherwise use Google Gemini default endpoint
    if (process.env.GEMINI_API_KEY) {
      const model = process.env.GEMINI_MODEL || 'gemini-1.5-mini';
      const baseUrl = process.env.GEMINI_API_URL || `https://generativelanguage.googleapis.com/v1beta2/models/${model}:generateText`;
      const useApiKeyQuery = !process.env.GEMINI_API_URL;
      const geminiUrl = useApiKeyQuery ? `${baseUrl}?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}` : baseUrl;
      const body = process.env.GEMINI_API_URL
        ? { message }
        : { prompt: { text: message } };

      const attemptGeminiCall = async (targetUrl, targetBody) => {
        const headers = {
          'Content-Type': 'application/json',
        };
        if (!useApiKeyQuery) {
          headers.Authorization = `Bearer ${process.env.GEMINI_API_KEY}`;
        }
        return axios.post(targetUrl, targetBody, { headers });
      };

      try {
        const resp = await attemptGeminiCall(geminiUrl, body);
        const data = resp.data;
        const reply = data?.candidates?.[0]?.output || data?.reply || data?.output || data?.outputs?.[0]?.text || (typeof data === 'string' ? data : JSON.stringify(data));
        return res.json({ reply: isGenericReply(reply) ? localReply(message) : reply });
      } catch (err) {
        const status = err.response?.status;
        const responseData = err.response?.data || err.message || String(err);
        console.error('Gemini API error:', responseData);

        if (!process.env.GEMINI_API_URL && status === 404 && model === 'gemini-1.5-mini') {
          const fallbackModels = [process.env.GEMINI_FALLBACK_MODEL || 'chat-bison-001', 'text-bison-001'];
          for (const fallbackModel of fallbackModels) {
            const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta2/models/${fallbackModel}:generateText?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;
            console.log('Retrying with fallback Gemini model:', fallbackModel);
            try {
              const fallbackResp = await attemptGeminiCall(fallbackUrl, { prompt: { text: message } });
              const fallbackData = fallbackResp.data;
              const fallbackReply = fallbackData?.candidates?.[0]?.output || fallbackData?.reply || fallbackData?.output || fallbackData?.outputs?.[0]?.text || (typeof fallbackData === 'string' ? fallbackData : JSON.stringify(fallbackData));
              return res.json({ reply: isGenericReply(fallbackReply) ? localReply(message) : fallbackReply });
            } catch (fallbackErr) {
              const fallbackResponseData = fallbackErr.response?.data || fallbackErr.message || String(fallbackErr);
              console.error(`Gemini fallback model ${fallbackModel} error:`, fallbackResponseData);
            }
          }
        }

        return res.status(500).json({
          message: 'Erreur Gemini API',
          error: responseData,
        });
      }
    }

    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      try {
        const resp = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: message }],
          max_tokens: 512,
        }, {
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }
        });
        const reply = resp.data?.choices?.[0]?.message?.content || 'Pas de réponse du fournisseur.';
        return res.json({ reply: isGenericReply(reply) ? localReply(message) : reply });
      } catch (err) {
        console.error('OpenAI error:', err.message || err);
      }
    }

    // Hugging Face
    if (process.env.HUGGINGFACE_API_KEY) {
      try {
        const model = process.env.HF_MODEL || 'facebook/blenderbot-400M-distill';
        const resp = await axios.post(`https://api-inference.huggingface.co/models/${model}`, { inputs: message }, {
          headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`, 'Content-Type': 'application/json' }
        });
        const data = resp.data;
        let reply = 'Pas de réponse du fournisseur.';
        if (Array.isArray(data) && data[0]?.generated_text) reply = data[0].generated_text;
        else if (data.generated_text) reply = data.generated_text;
        else if (typeof data === 'string') reply = data;
        return res.json({ reply: isGenericReply(reply) ? localReply(message) : reply });
      } catch (err) {
        console.error('HuggingFace error:', err.message || err);
      }
    }

    // fallback local
    return res.json({ reply: localReply(message) });
  } catch (error) {
    console.error('Error in chatBot handler:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de l\'appel au fournisseur', error: error.message });
  }
};