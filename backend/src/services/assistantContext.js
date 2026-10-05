// Données réelles pour l'assistant SOTACIB.
// - identifie l'utilisateur à partir du jeton JWT (optionnel)
// - répond directement aux questions factuelles (référence DEM, validations en attente, mes demandes)
// - fournit un résumé des données de l'utilisateur au modèle de langage pour les autres questions
// Sécurité : un utilisateur ne voit que les demandes qu'il a créées, qui lui sont assignées
// ou qu'il a déjà traitées (un administrateur voit tout).

const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

// Chargement différé des modèles (évite toute connexion à la base lors des tests unitaires).
const getModels = () => require('../models');

const WORKFLOW_LABELS = {
  AvanceCaisse: 'Avance sur caisse',
  CreationClient: 'Création client',
  Investissement: 'Investissement',
  AvisTechnique: 'Avis technique',
};

const STATUS_LABELS = {
  draft: 'Brouillon',
  in_progress: 'En cours',
  pending: 'En attente',
  approved: 'Approuvée',
  rejected: 'Refusée',
  returned: 'Retournée',
};

const ACTION_LABELS = {
  validate: 'validée',
  reject: 'refusée',
  return: 'retournée',
  modify: 'modifiée',
};

const normalize = (text = '') => String(text)
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[̀-ͯ]/g, '');

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('fr-FR') : '-');

const daysSince = (value) => {
  if (!value) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
};

const formatDuration = (days) => {
  if (days === 0) return "aujourd'hui";
  if (days === 1) return 'depuis 1 jour';
  return `depuis ${days} jours`;
};

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
};

/* ---------------------------------------------------------------- identité */

const getUserFromRequest = async (req) => {
  const header = req.headers?.authorization || '';
  if (!header.startsWith('Bearer ') || !process.env.JWT_SECRET) return null;
  try {
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const { User } = getModels();
    const user = await User.findByPk(decoded.id, { attributes: ['id', 'fullName', 'role', 'department', 'isActive'] });
    return user && user.isActive ? user : null;
  } catch (e) {
    return null;
  }
};

/* --------------------------------------------------------------- données */

let workflowCache = { at: 0, byName: {} };

const getWorkflows = async () => {
  if (Date.now() - workflowCache.at < 60000) return workflowCache.byName;
  const { WorkflowDefinition } = getModels();
  const workflows = await WorkflowDefinition.findAll();
  const byName = {};
  workflows.forEach((wf) => { byName[wf.name] = toArray(wf.steps); });
  workflowCache = { at: Date.now(), byName };
  return byName;
};

const describeRequest = (request, workflows) => {
  const steps = workflows[request.workflowType] || [];
  const index = Number(request.currentStepIndex) || 0;
  const step = steps[index];
  return {
    id: request.id,
    reference: request.reference,
    type: WORKFLOW_LABELS[request.workflowType] || request.workflowType,
    status: request.status,
    statusLabel: STATUS_LABELS[request.status] || request.status,
    stepName: step?.name || null,
    stepNumber: index + 1,
    stepCount: steps.length,
    creator: request.creator?.fullName || null,
    creatorId: request.createdBy,
    assignee: request.assignee?.fullName || null,
    assigneeId: request.assignedTo,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    waitingDays: daysSince(request.updatedAt || request.createdAt),
    history: toArray(request.history),
  };
};

const canSeeRequest = (user, request) => {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  const uid = Number(user.id);
  if (Number(request.createdBy) === uid || Number(request.assignedTo) === uid) return true;
  return toArray(request.history).some((entry) => Number(entry?.actor) === uid);
};

const includeUsers = () => {
  const { User } = getModels();
  return [
    { model: User, as: 'creator', attributes: ['id', 'fullName'] },
    { model: User, as: 'assignee', attributes: ['id', 'fullName'] },
  ];
};

const getMyRequests = async (user) => {
  const { Request } = getModels();
  return Request.findAll({
    where: { createdBy: user.id },
    include: includeUsers(),
    order: [['updatedAt', 'DESC']],
    limit: 30,
  });
};

const getPendingForMe = async (user) => {
  const { Request } = getModels();
  return Request.findAll({
    where: {
      status: 'in_progress',
      assignedTo: user.id,
      createdBy: { [Op.ne]: user.id },
    },
    include: includeUsers(),
    order: [['updatedAt', 'ASC']],
    limit: 30,
  });
};

const findRequestByReference = async (reference) => {
  const { Request } = getModels();
  return Request.findOne({ where: { reference }, include: includeUsers() });
};

/* ------------------------------------------------------------ intentions */

const extractReference = (text) => {
  const direct = String(text).match(/\bDEM\s?-?\s?(\d{1,6})\b/i);
  if (direct) return `DEM${direct[1].padStart(6, '0')}`;
  const byNumber = normalize(text).match(/\bdemande\s*(?:n[°o.]?\s*|numero\s*|#)?\s*(\d{1,6})\b/);
  if (byNumber) return `DEM${byNumber[1].padStart(6, '0')}`;
  return null;
};

const isPendingQuestion = (text) => {
  const t = normalize(text);
  return /(dois[- ]?je valider|a valider|mes validations|a traiter|en attente de (moi|ma validation|mon avis)|qui m'?attend|m'?attendent|que dois[- ]?je (faire|traiter))/.test(t);
};

// « Combien de brouillons ai-je ? », « mes demandes refusées »… → statut demandé (ou null)
const STATUS_KEYWORDS = [
  ['draft', /brouillon/],
  ['rejected', /refus|rejet/],
  ['approved', /approuv|acceptee|validees?\b/],
  ['returned', /retourn/],
  ['in_progress', /en cours/],
];

const extractStatusFilter = (text) => {
  const t = normalize(text);
  const personal = /\b(mes|ma|mon|j'?ai|ai[- ]je|combien|liste)\b/.test(t);
  if (!personal) return null;
  const match = STATUS_KEYWORDS.find(([, pattern]) => pattern.test(t));
  return match ? match[0] : null;
};

const isMyRequestsQuestion = (text) => {
  const t = normalize(text);
  return /(mes demandes|mes dossiers|demandes en cours|ou en sont mes|etat de mes|statut de mes|suivi de mes)/.test(t);
};

/* ------------------------------------------------------ réponses directes */

const answerForReference = (user, raw, workflows) => {
  const r = describeRequest(raw, workflows);
  const lines = [`**${r.reference}** — ${r.type}`];

  if (r.status === 'approved') {
    lines.push(`- Statut : **${r.statusLabel}** ✅ — circuit terminé`);
    lines.push(`- Dernière mise à jour : ${formatDate(r.updatedAt)}`);
  } else if (r.status === 'rejected') {
    const last = [...r.history].reverse().find((h) => h?.action === 'reject');
    lines.push(`- Statut : **${r.statusLabel}**`);
    if (last) {
      lines.push(`- Refusée par **${last.actorName || 'un validateur'}** le ${formatDate(last.timestamp)}${last.stepName ? ` (étape *${last.stepName}*)` : ''}`);
      if (last.comment?.trim()) lines.push(`- Motif : « ${last.comment.trim()} »`);
    }
  } else if (r.status === 'draft') {
    lines.push(`- Statut : **${r.statusLabel}** — pas encore soumise`);
  } else {
    lines.push(`- Statut : **${r.statusLabel}**`);
    if (r.stepName) lines.push(`- Étape actuelle : **${r.stepName}**${r.stepCount ? ` (${r.stepNumber}/${r.stepCount})` : ''}`);
    if (r.assignee) {
      const who = Number(r.assigneeId) === Number(user.id) ? '**vous**' : `**${r.assignee}**`;
      lines.push(`- Chez : ${who}, ${formatDuration(r.waitingDays)}`);
    }
    if (r.status === 'returned') lines.push('- La demande a été retournée pour correction.');
  }

  lines.push(`- Créée le ${formatDate(r.createdAt)}${r.creator ? ` par ${r.creator}` : ''}`);

  const lastAction = r.history[r.history.length - 1];
  if (lastAction && r.status !== 'rejected') {
    lines.push(`- Dernière action : ${ACTION_LABELS[lastAction.action] || lastAction.action} par ${lastAction.actorName || 'un validateur'} le ${formatDate(lastAction.timestamp)}${lastAction.comment?.trim() ? ` — « ${lastAction.comment.trim()} »` : ''}`);
  }

  return lines.join('\n');
};

const answerPending = (rows, workflows) => {
  if (!rows.length) return "Aucune demande n'attend votre validation pour le moment. Tout est à jour 👍";
  const items = rows.map((raw, i) => {
    const r = describeRequest(raw, workflows);
    return `${i + 1}. **${r.reference}** — ${r.type}, de ${r.creator || 'N/A'}${r.stepName ? `, étape *${r.stepName}*` : ''}, en attente ${formatDuration(r.waitingDays)}`;
  });
  const oldest = describeRequest(rows[0], workflows);
  return [
    `Vous avez **${rows.length}** demande${rows.length > 1 ? 's' : ''} à valider :`,
    '',
    ...items,
    '',
    rows.length > 1 ? `La plus ancienne est **${oldest.reference}** (${formatDuration(oldest.waitingDays)}).` : 'Cliquez sur la référence pour la traiter.',
  ].join('\n');
};

const answerMyRequests = (rows, workflows) => {
  if (!rows.length) return "Vous n'avez encore créé aucune demande. Utilisez **Mes demandes → Nouvelle demande** pour en créer une.";
  const all = rows.map((raw) => describeRequest(raw, workflows));
  const open = all.filter((r) => ['in_progress', 'pending', 'returned', 'draft'].includes(r.status));
  const counts = all.reduce((acc, r) => { acc[r.statusLabel] = (acc[r.statusLabel] || 0) + 1; return acc; }, {});
  const summary = Object.entries(counts).map(([label, n]) => `${n} ${label.toLowerCase()}`).join(', ');

  const lines = [`Vous avez **${all.length}** demande${all.length > 1 ? 's' : ''} (${summary}).`];
  if (open.length) {
    lines.push('', '**En cours de traitement :**');
    open.slice(0, 8).forEach((r) => {
      if (r.status === 'draft') {
        lines.push(`- **${r.reference}** — ${r.type} : brouillon, pas encore soumise`);
      } else {
        lines.push(`- **${r.reference}** — ${r.type} : ${r.stepName ? `*${r.stepName}*` : r.statusLabel}${r.assignee ? `, chez ${r.assignee}` : ''} (${formatDuration(r.waitingDays)})`);
      }
    });
    if (open.length > 8) lines.push(`- … et ${open.length - 8} autre(s)`);
  } else {
    lines.push('', 'Aucune demande en cours : toutes sont clôturées.');
  }
  return lines.join('\n');
};

const answerByStatus = (rows, workflows, status) => {
  const label = (STATUS_LABELS[status] || status).toLowerCase();
  const matching = rows.map((raw) => describeRequest(raw, workflows)).filter((r) => r.status === status);
  if (!matching.length) return `Vous n'avez aucune demande **${label}**.`;
  const plural = matching.length > 1 ? 's' : '';
  return [
    `Vous avez **${matching.length}** demande${plural} ${plural && !label.endsWith('s') ? `${label}s` : label} :`,
    '',
    ...matching.map((r) => {
      const detail = status === 'in_progress' || status === 'returned'
        ? `${r.stepName ? `étape *${r.stepName}*` : r.statusLabel}${r.assignee ? `, chez ${r.assignee}` : ''}`
        : `créée le ${formatDate(r.createdAt)}`;
      return `- **${r.reference}** — ${r.type} : ${detail}`;
    }),
  ].join('\n');
};

/**
 * Tente de répondre directement à partir des données.
 * Retourne une chaîne (réponse) ou null si la question doit être confiée au modèle.
 */
const getDirectAnswer = async (user, question) => {
  if (!user || !question) return null;
  const workflows = await getWorkflows();

  const reference = extractReference(question);
  if (reference) {
    const raw = await findRequestByReference(reference);
    if (!raw || !canSeeRequest(user, raw)) {
      return `Je ne trouve pas la demande **${reference}** parmi celles auxquelles vous avez accès. Vérifiez la référence dans **Mes demandes**.`;
    }
    return answerForReference(user, raw, workflows);
  }

  if (isPendingQuestion(question)) {
    return answerPending(await getPendingForMe(user), workflows);
  }

  const statusFilter = extractStatusFilter(question);
  if (statusFilter) {
    return answerByStatus(await getMyRequests(user), workflows, statusFilter);
  }

  if (isMyRequestsQuestion(question)) {
    return answerMyRequests(await getMyRequests(user), workflows);
  }

  return null;
};

/**
 * Résumé compact des données de l'utilisateur, injecté dans le prompt du modèle.
 */
const buildUserContext = async (user) => {
  if (!user) return '';
  const workflows = await getWorkflows();
  const [mine, pending] = await Promise.all([getMyRequests(user), getPendingForMe(user)]);

  const mineLines = mine.slice(0, 15).map((raw) => {
    const r = describeRequest(raw, workflows);
    return `- ${r.reference} | ${r.type} | ${r.statusLabel}${r.stepName && ['in_progress', 'returned'].includes(r.status) ? ` | étape: ${r.stepName}` : ''}${r.assignee ? ` | chez: ${r.assignee}` : ''} | ${formatDuration(r.waitingDays)}`;
  });
  const pendingLines = pending.slice(0, 15).map((raw) => {
    const r = describeRequest(raw, workflows);
    return `- ${r.reference} | ${r.type} | de: ${r.creator || 'N/A'} | étape: ${r.stepName || '-'} | ${formatDuration(r.waitingDays)}`;
  });
  const workflowLines = Object.entries(workflows).map(([name, steps]) =>
    `- ${WORKFLOW_LABELS[name] || name} : ${steps.map((s) => s.name).join(' → ')}`);

  return [
    `Date du jour : ${new Date().toLocaleDateString('fr-FR')}.`,
    `Utilisateur connecté : ${user.fullName} (rôle ${user.role}, département ${user.department || '-'}).`,
    '',
    `Ses demandes (${mine.length}) :`,
    ...(mineLines.length ? mineLines : ['- aucune']),
    '',
    `Demandes qui attendent sa validation (${pending.length}) :`,
    ...(pendingLines.length ? pendingLines : ['- aucune']),
    '',
    'Circuits de validation :',
    ...workflowLines,
    '',
    "Utilise UNIQUEMENT ces données pour parler des demandes de l'utilisateur. Cite les références exactes (ex. DEM000017). N'invente jamais une demande, un statut ou un nom.",
  ].join('\n');
};

module.exports = {
  getUserFromRequest,
  getDirectAnswer,
  buildUserContext,
  canSeeRequest,
  // exportés pour les tests
  extractReference,
  extractStatusFilter,
  isPendingQuestion,
  isMyRequestsQuestion,
};
