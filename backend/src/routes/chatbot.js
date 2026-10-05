const express = require('express');
const axios = require('axios');
const router = express.Router();

let ollamaFallbackWarningLogged = false;

// GET helper: informative message for browser access or health checks
router.get(['/api/chat', '/api/chats/bot'], (req, res) => {
  return res.status(200).json({
    message: 'Endpoint disponible. Utilisez POST avec JSON {"message":"votre question"} pour obtenir une réponse.'
  });
});

const normalizeText = (text = '') => (text || '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '');

const getLocalReply = (text) => {
  const normalized = normalizeText(text);

  if (normalized.includes('date') || normalized.includes('aujourd') || normalized.includes('today') || normalized.includes('quand') || normalized.includes('echeance') || normalized.includes('deadline')) {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    return `Aujourd’hui, nous sommes le ${formattedDate}.`;
  }

  if (normalized.includes('heure') || normalized.includes('time')) {
    const now = new Date();
    return `Il est ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`;
  }

  if (normalized.includes('valider') || normalized.includes('validation') || normalized.includes('approuver') || normalized.includes('rejeter') || normalized.includes('avis')) {
    return 'Pour une validation, ouvrez la demande concernée, vérifiez les étapes requises et transmettez-la au valideur compétent.';
  }

  if (normalized.includes('invest') || normalized.includes('investissement') || normalized.includes('budget')) {
    return 'Pour une demande d’investissement, préparez les informations du projet, le montant demandé, la justification et les pièces justificatives, puis soumettez la demande via la section Requests.';
  }

  if (normalized.includes('creer') || normalized.includes('nouvelle') || normalized.includes('nouveau') || normalized.includes('demande') || normalized.includes('soumettre') || normalized.includes('envoyer')) {
    return 'Je peux vous aider à créer une demande ou à suivre un workflow. Ouvrez la section Requests puis choisissez Nouvelle demande pour démarrer.';
  }

  if (normalized.includes('workflow') || normalized.includes('etape') || normalized.includes('processus') || normalized.includes('parcours')) {
    return 'Pour un workflow, identifiez l’étape en cours, vérifiez les acteurs concernés et suivez la progression dans la demande associée.';
  }

  if (normalized.includes('statut') || normalized.includes('suivi') || normalized.includes('avancement') || normalized.includes('avancer') || (normalized.includes('voir') && normalized.includes('demande'))) {
    return 'Pour vérifier un statut, ouvrez la demande concernée dans la section Requests. Vous y trouverez l’état actuel et les prochaines étapes.';
  }

  if (normalized.includes('bonjour') || normalized.includes('salut')) {
    return 'Bonjour ! Je peux vous aider à créer une demande, vérifier un statut, suivre un workflow ou traiter une validation.';
  }

  if (normalized.includes('merci')) {
    return 'Avec plaisir !';
  }

  if (normalized.includes('aide') || normalized.includes('help') || normalized.includes('comment') || normalized.includes('peux') || normalized.includes('proceder') || normalized.includes('faire')) {
    return 'Je peux vous aider à traiter une demande, vérifier un statut, suivre un workflow ou préparer une validation. Décrivez ce que vous souhaitez faire et je vous guiderai.';
  }

  return 'Je peux vous aider à traiter une demande, suivre un workflow, vérifier un statut ou préparer une validation. Dites-moi précisément l’étape ou la procédure concernée.';
};

const isBusinessKeywordRequest = (text = '') => {
  const normalized = normalizeText(text);

  return ['bonjour', 'salut', 'merci', 'help', 'aide', 'date', 'heure', 'statut', 'validation', 'workflow', 'demande', 'comment', 'peux', 'proceder', 'faire', 'etape', 'avancement', 'investissement', 'quand'].some((keyword) => normalized.includes(keyword));
};

const isGenericReply = (reply = '') => {
  const normalized = normalizeText(reply || '');

  if (!normalized.trim()) return true;

  return [
    /je suis votre assistant/i,
    /posez-moi une question/i,
    /comment puis-je vous aider/i,
    /comment puis-je aider/i,
    /je peux vous aider sur/i,
    /bonjour !/i,
    /avec plaisir/i,
  ].some((pattern) => pattern.test(normalized));
};

const shouldUseLocalReply = (text = '', reply = '') => {
  if (!reply || !reply.trim()) return true;
  return isGenericReply(reply);
};

const buildSystemPrompt = (userContext = '') => [
  'Tu es un assistant professionnel de SOTACIB spécialisé dans les workflows internes, les demandes, les validations et le suivi des opérations.',
  'Tu connais les processus métier suivants : avance sur caisse, création client, demande d’investissement et avis technique.',
  'Tu guides les employés dans leurs demandes et tu peux expliquer la démarche à suivre pour chaque type de procédure.',
  'Réponds en français, de manière claire, concise et orientée métier.',
  'Tu peux utiliser du Markdown simple : listes à puces, listes numérotées et **gras** pour les points importants.',
  'Si l’utilisateur demande une procédure, donne une réponse structurée en 3 parties : contexte, action à faire, résultat attendu.',
  'Si l’utilisateur parle d’un workflow, d’une demande, d’une validation, d’un statut ou d’une étape, aide-le à comprendre la démarche à suivre.',
  'Ne donne jamais d’informations inventées sur les processus internes; si tu n’es pas sûr, invite l’utilisateur à vérifier dans l’application ou à contacter un valideur.'
].join(' ') + (userContext ? `\n\nDONNÉES RÉELLES DE L'UTILISATEUR :\n${userContext}` : '');

// Envoie une ligne NDJSON au client (mode streaming).
const writeLine = (res, payload) => res.write(`${JSON.stringify(payload)}\n`);

// Diffuse un texte déjà connu morceau par morceau (réponse locale en mode streaming).
const streamStaticText = async (res, text, provider) => {
  const parts = text.split(/(\s+)/);
  for (const part of parts) {
    if (res.writableEnded) return;
    writeLine(res, { delta: part });
    // léger délai pour un rendu progressif côté client
    await new Promise((resolve) => setTimeout(resolve, 12));
  }
  writeLine(res, { done: true, provider });
  res.end();
};

const startStream = (res) => {
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();
};

const handleStreamingChat = async (req, res, { conversation, message, localReply, ollamaBaseUrl, model, userContext }) => {
  startStream(res);

  if (process.env.OLLAMA_ENABLED === 'false') {
    return streamStaticText(res, localReply, 'local');
  }

  let receivedContent = false;
  let clientClosed = false;
  res.on('close', () => { clientClosed = true; });

  try {
    const response = await axios.post(`${ollamaBaseUrl}/api/chat`, {
      model,
      messages: [
        { role: 'system', content: buildSystemPrompt(userContext) },
        ...conversation.map((entry) => ({ role: entry?.role || 'user', content: entry?.content || '' })),
        ...(message ? [{ role: 'user', content: message }] : []),
      ],
      stream: true,
    }, {
      responseType: 'stream',
      timeout: Number(process.env.OLLAMA_TIMEOUT || 120000),
    });

    await new Promise((resolve, reject) => {
      let buffer = '';
      const upstream = response.data;

      res.on('close', () => upstream.destroy());

      upstream.on('data', (chunk) => {
        buffer += chunk.toString('utf8');
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            const delta = parsed?.message?.content || '';
            if (delta) {
              receivedContent = true;
              writeLine(res, { delta });
            }
          } catch (e) {
            // ligne partielle ou invalide : ignorée
          }
        }
      });
      upstream.on('end', resolve);
      upstream.on('close', resolve);
      upstream.on('error', reject);
    });

    if (clientClosed) return;
    if (!receivedContent) {
      return streamStaticText(res, localReply, 'local');
    }
    writeLine(res, { done: true, provider: 'ollama' });
    return res.end();
  } catch (error) {
    if (!ollamaFallbackWarningLogged) {
      console.warn('[chatbot] Ollama is unavailable (stream), using the local business reply instead.', {
        url: `${ollamaBaseUrl}/api/chat`,
        model,
        code: error.code,
        status: error.response?.status,
      });
      ollamaFallbackWarningLogged = true;
    }
    if (clientClosed || res.writableEnded) return;
    if (receivedContent) {
      writeLine(res, { done: true, provider: 'ollama', interrupted: true });
      return res.end();
    }
    return streamStaticText(res, localReply, 'local');
  }
};

router.post(['/api/chat', '/api/chats/bot'], async (req, res) => {
  const { messages, message, stream } = req.body || {};
  const conversation = Array.isArray(messages) ? messages : [];
  const lastUserMessage = conversation
    .slice()
    .reverse()
    .find((entry) => (entry?.role || '').toLowerCase() === 'user')?.content || message || '';

  if (!conversation.length && !message) {
    return res.status(400).json({ message: 'Messages requis' });
  }

  const ollamaBaseUrl = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
  const model = process.env.OLLAMA_MODEL || 'llama3.2:latest';
  const localReply = getLocalReply(lastUserMessage);

  // Données réelles : réponse directe pour les questions factuelles, sinon contexte pour le modèle
  let userContext = '';
  try {
    const assistant = require('../services/assistantContext');
    const user = await assistant.getUserFromRequest(req);
    if (user) {
      const directAnswer = await assistant.getDirectAnswer(user, lastUserMessage);
      if (directAnswer) {
        if (stream === true) {
          startStream(res);
          return streamStaticText(res, directAnswer, 'data');
        }
        return res.json({ reply: directAnswer, provider: 'data' });
      }
      userContext = await assistant.buildUserContext(user);
    }
  } catch (error) {
    console.warn('[chatbot] Contexte utilisateur indisponible :', error.message);
  }

  if (stream === true) {
    return handleStreamingChat(req, res, { conversation, message, localReply, ollamaBaseUrl, model, userContext });
  }

  if (process.env.OLLAMA_ENABLED === 'false') {
    return res.json({ reply: localReply, provider: 'local' });
  }

  try {
    const systemPrompt = buildSystemPrompt(userContext);

    const payload = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversation.map((entry) => ({
          role: entry?.role || 'user',
          content: entry?.content || ''
        })),
        ...(message ? [{ role: 'user', content: message }] : [])
      ],
      stream: false,
    };

    const response = await axios.post(`${ollamaBaseUrl}/api/chat`, payload, {
      timeout: Number(process.env.OLLAMA_TIMEOUT || 120000),
    });

    const reply = response.data?.message?.content?.trim();

    if (!reply || shouldUseLocalReply(lastUserMessage, reply)) {
      return res.json({ reply: localReply, provider: 'local' });
    }

    return res.json({ reply, provider: 'ollama' });
  } catch (error) {
    const errorDetails = error.response?.data || error.response?.statusText || error.message;
    if (!ollamaFallbackWarningLogged) {
      console.warn('[chatbot] Ollama is unavailable, using the local business reply instead.', {
        url: `${ollamaBaseUrl}/api/chat`,
        model,
        timeout: process.env.OLLAMA_TIMEOUT || 30000,
        code: error.code,
        status: error.response?.status,
        details: errorDetails,
      });
      ollamaFallbackWarningLogged = true;
    }

    return res.json({ reply: localReply, provider: 'local' });
  }
});

module.exports = router;
module.exports.getLocalReply = getLocalReply;
module.exports.shouldUseLocalReply = shouldUseLocalReply;
