const test = require('node:test');
const assert = require('node:assert/strict');

const { getLocalReply, shouldUseLocalReply } = require('../src/routes/chatbot');

test('getLocalReply returns a helpful business fallback for greeting requests', () => {
  const reply = getLocalReply('bonjour');

  assert.match(reply, /Bonjour/i);
  assert.match(reply, /demande|workflow|validation|statut/i);
});

test('getLocalReply gives guidance for general business questions instead of a generic prompt', () => {
  const reply = getLocalReply('Peux-tu me dire ce qui se passe ?');

  assert.match(reply, /demande|workflow|validation|statut|aider/i);
  assert.doesNotMatch(reply, /Posez-moi une question/i);
});

test('shouldUseLocalReply detects generic assistant prompts and forces the business fallback', () => {
  const result = shouldUseLocalReply('Quel est le statut de ma demande ?', 'Je suis votre assistant métier. Posez-moi une question sur une demande, un workflow, un statut, une validation ou une date.');

  assert.equal(result, true);
});

test('shouldUseLocalReply keeps a meaningful AI answer for business questions', () => {
  const result = shouldUseLocalReply('Quel est le statut de ma demande ?', 'Le statut de votre demande est en cours de validation par le responsable.');

  assert.equal(result, false);
});
