const normalizeText = (text = '') => (text || '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '');

export const shouldUseFallbackReply = (text = '', reply = '') => {
  if (!reply || !reply.trim()) return true;

  const normalizedReply = normalizeText(reply);

  return [
    /je suis votre assistant/i,
    /posez-moi une question/i,
    /comment puis-je vous aider/i,
    /comment puis-je aider/i,
    /je peux vous aider sur/i,
    /bonjour !/i,
    /avec plaisir/i,
  ].some((pattern) => pattern.test(normalizedReply));
};

export const getFallbackReply = (text = '') => {
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
