// Outils d'export partagés : CSV lisible par Excel (français) et téléchargement de fichiers.

export const STATUS_LABELS = {
  draft: 'Brouillon',
  pending: 'En attente',
  in_progress: 'En cours',
  returned: 'Retournée',
  approved: 'Approuvée',
  rejected: 'Refusée',
};

export const WORKFLOW_LABELS = {
  AvanceCaisse: 'Avance sur caisse',
  CreationClient: 'Création client',
  Investissement: "Demande d'investissement",
  AvisTechnique: 'Avis technique',
};

export const ACTION_LABELS = {
  validate: 'Validée',
  return: 'Retournée',
  reject: 'Refusée',
  modify: 'Modifiée',
};

export const FIELD_LABELS = {
  societe: 'Société',
  montant: 'Montant',
  motif: 'Motif',
  choixCaisse: 'Caisse',
  numeroPieceComptable: 'N° de pièce comptable SAP',
  typeClient: 'Type de client',
  statutClient: 'Statut du client',
  nomClient: 'Nom du client',
  activite: 'Activité',
  idRc: 'Registre de commerce (RC)',
  idTvaPatente: 'TVA / Patente',
  idRne: 'Identifiant RNE',
  numeroAttestation: "N° d'attestation",
  dateDebutAttestation: "Début de l'attestation",
  dateFinAttestation: "Fin de l'attestation",
  adresse: 'Adresse',
  codePostal: 'Code postal',
  gouvernorat: 'Gouvernorat',
  pays: 'Pays',
  telephoneMobile: 'Téléphone / Mobile',
  fax: 'Fax',
  emailClient: 'E-mail du client',
  modePaiement: 'Mode de paiement',
  conditionsPaiement: 'Conditions de paiement',
  recouvrementPlafond: 'Plafond de crédit (recouvrement)',
  compteCollectif: 'Compte collectif',
  groupeTresorerie: 'Groupe de trésorerie',
  codeClient: 'Code client SAP',
  categorie: 'Catégorie',
  objet: 'Objet',
  budget: 'Budget',
  requestBudget: 'Budget demandé',
  requestMontant: 'Montant demandé (EUR)',
  dateFinalisation: 'Date de finalisation',
  dureeVie: 'Durée de vie',
  planifie: 'Investissement planifié',
  demanderAvisDg: 'Avis du DG demandé',
  oi: "Ordre d'investissement (OI)",
  processExterne: 'Processus externe',
  concerne: 'Personne concernée',
  niveauValidation: 'Niveau de validation',
  objetAvis: "Objet de l'avis",
  avisFinancierRequis: 'Avis financier requis',
};

export const fieldLabel = (key) =>
  FIELD_LABELS[key] || String(key).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());

export const fieldValue = (value) => {
  if (value === null || value === undefined || value === '') return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  const text = String(value).trim();
  if (/^(yes|oui)$/i.test(text)) return 'Oui';
  if (/^(no|non)$/i.test(text)) return 'Non';
  const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;
  return text;
};

export const actorLabel = (step) => {
  const value = step?.actorValue || '';
  if (step?.actorType === 'hierarchy') {
    if (value === 'N') return 'Demandeur';
    if (value === 'N+1') return 'Supérieur hiérarchique (N+1)';
    if (value === 'N+2') return 'Supérieur du N+1 (N+2)';
  }
  if (step?.actorType === 'role') return `Rôle : ${String(value).replace(/_/g, ' ')}`;
  if (step?.actorType === 'specificUser') return 'Utilisateur désigné';
  return String(value);
};

// État de chaque étape reconstitué depuis l'historique (même logique que le PDF du serveur)
export const STEP_STATE_LABELS = {
  done: 'Validée',
  current: 'En attente',
  returned: 'Retournée, à corriger',
  rejected: 'Refusée',
  skipped: 'Non requise',
  upcoming: 'À venir',
  unreached: 'Non atteinte',
};

export const computeStepStates = (request, steps = []) => {
  const history = Array.isArray(request?.history) ? request.history : [];
  const status = request?.status || 'draft';
  const currentIndex = Number(request?.currentStepIndex) || 0;
  return steps.map((step, index) => {
    const entries = history.filter((h) => h?.stepName === step?.name);
    const last = entries[entries.length - 1];
    if (status === 'rejected' && last?.action === 'reject') return { state: 'rejected', entry: last };
    if (index === currentIndex && ['in_progress', 'pending', 'returned'].includes(status)) {
      return { state: status === 'returned' ? 'returned' : 'current', entry: last };
    }
    if (last?.action === 'validate') return { state: 'done', entry: last };
    if (status === 'approved' || index < currentIndex) return { state: 'skipped' };
    if (status === 'rejected') return { state: 'unreached' };
    return { state: 'upcoming' };
  });
};

export const statusLabel = (status) => STATUS_LABELS[status] || status || '';
export const workflowLabel = (type) => WORKFLOW_LABELS[type] || type || '';
export const actionLabel = (action) => ACTION_LABELS[action] || action || '';

const pad = (n) => String(n).padStart(2, '0');

// Date au format JJ/MM/AAAA HH:MM, reconnue comme date par Excel
export const formatDateTime = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const toCell = (value) => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const escapeCell = (value) => {
  const text = toCell(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/**
 * Construit un CSV « Excel français » : séparateur « ; », fins de ligne CRLF et BOM UTF-8
 * pour que les accents s'affichent correctement à l'ouverture.
 * `rows` est un tableau de lignes, chaque ligne étant un tableau de cellules.
 */
export const buildCsv = (rows) => `﻿${rows.map((row) => row.map(escapeCell).join(';')).join('\r\n')}`;

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const downloadCsv = (rows, filename) => {
  downloadBlob(new Blob([buildCsv(rows)], { type: 'text/csv;charset=utf-8' }), filename);
};

// Suffixe de nom de fichier sans caractères interdits sous Windows (pas de « : »)
export const fileDateStamp = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}h${pad(date.getMinutes())}`;

// Lignes CSV pour une liste de demandes (statistiques, tableau de bord administrateur)
export const requestsToRows = (requests) => [
  ['Référence', 'Processus', 'Statut', 'Demandeur', 'Département', 'Chez', 'Date de création', 'Dernière mise à jour'],
  ...requests.map((r) => [
    r.reference,
    workflowLabel(r.workflowType),
    statusLabel(r.status),
    r.creator?.fullName || '',
    r.creator?.department || '',
    ['approved', 'rejected', 'draft'].includes(r.status) ? '' : r.assignee?.fullName || '',
    formatDateTime(r.createdAt),
    formatDateTime(r.updatedAt),
  ]),
];
