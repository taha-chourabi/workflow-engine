const test = require('node:test');
const assert = require('node:assert/strict');

const { extractReference, extractStatusFilter, isPendingQuestion, isMyRequestsQuestion } = require('../src/services/assistantContext');

test('extractStatusFilter reconnaît un filtre par statut sur ses propres demandes', () => {
  assert.equal(extractStatusFilter('Combien de brouillons ai-je ?'), 'draft');
  assert.equal(extractStatusFilter('Mes demandes refusées'), 'rejected');
  assert.equal(extractStatusFilter('Mes demandes en cours'), 'in_progress');
  assert.equal(extractStatusFilter('Comment fonctionne un brouillon ?'), null);
});

test('extractReference reconnaît une référence DEM, avec ou sans zéros', () => {
  assert.equal(extractReference('Où en est DEM000017 ?'), 'DEM000017');
  assert.equal(extractReference('statut de dem17'), 'DEM000017');
  assert.equal(extractReference('où en est la demande n° 24'), 'DEM000024');
  assert.equal(extractReference('Bonjour'), null);
});

test('isPendingQuestion détecte les questions sur les validations en attente', () => {
  assert.equal(isPendingQuestion('Que dois-je valider ?'), true);
  assert.equal(isPendingQuestion('Quelles demandes sont à valider'), true);
  assert.equal(isPendingQuestion('Comment créer une demande ?'), false);
});

test('isMyRequestsQuestion détecte les questions sur ses propres demandes', () => {
  assert.equal(isMyRequestsQuestion('Mes demandes en cours'), true);
  assert.equal(isMyRequestsQuestion('Où en sont mes demandes ?'), true);
  assert.equal(isMyRequestsQuestion('Que dois-je valider ?'), false);
});
