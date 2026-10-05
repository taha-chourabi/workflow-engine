const PDFDocument = require('pdfkit');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { User } = require('../models');

// ---------------------------------------------------------------------------
// Charte graphique (identique à l'application)
// ---------------------------------------------------------------------------
const C = {
  ink: '#1B1B1A',
  ink2: '#3A3A37',
  muted: '#7A766E',
  soft: '#B9B4AA',
  line: '#DDD8CF',
  paper: '#F4F2EE',
  white: '#FFFFFF',
  accent: '#E8591A',
  accentSoft: '#FDEDE4',
  green: '#2F7D5B',
  greenSoft: '#E6F2EC',
  red: '#C23B3B',
  redSoft: '#F8E5E5',
  amber: '#B7791F',
  amberSoft: '#FBF1DF',
};

const MARGIN = 48;
const HEADER_FIRST = 122;
const HEADER_NEXT = 42;
const FOOTER_SPACE = 64;

const getSotacibLogoPath = () => path.join(__dirname, '../../../frontend/src/assets/sotacib-logo.jpg');

// ---------------------------------------------------------------------------
// Libellés
// ---------------------------------------------------------------------------
const WORKFLOW_LABELS = {
  AvanceCaisse: 'Avance sur caisse',
  CreationClient: 'Création client',
  Investissement: "Demande d'investissement",
  AvisTechnique: 'Avis technique',
};

const STATUS = {
  draft: { label: 'Brouillon', color: C.muted, bg: C.paper },
  pending: { label: 'En attente', color: C.amber, bg: C.amberSoft },
  in_progress: { label: 'En cours de validation', color: C.accent, bg: C.accentSoft },
  returned: { label: 'Retournée', color: C.amber, bg: C.amberSoft },
  approved: { label: 'Approuvée', color: C.green, bg: C.greenSoft },
  rejected: { label: 'Refusée', color: C.red, bg: C.redSoft },
};

const ACTIONS = {
  validate: { label: 'Validée', color: C.green },
  return: { label: 'Retournée', color: C.amber },
  reject: { label: 'Refusée', color: C.red },
  modify: { label: 'Modifiée', color: C.ink2 },
};

const FIELD_LABELS = {
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
  requestMontant: 'Montant demandé',
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

const AMOUNT_UNITS = { montant: 'DT', requestMontant: 'EUR' };

// ---------------------------------------------------------------------------
// Mise en forme du texte (les polices standard PDF ne connaissent que WinAnsi)
// ---------------------------------------------------------------------------
const WIN_ANSI_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');

const clean = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/[   ]/g, ' ')
    .replace(/[→⇒]/g, '->')
    .replace(/[✓✔]/g, '')
    .split('')
    .filter((ch) => ch.charCodeAt(0) <= 0xff || WIN_ANSI_EXTRA.has(ch))
    .join('')
    .trim();
};

const pad = (n) => String(n).padStart(2, '0');
const fmtDate = (value, withTime = true) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return clean(value);
  const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  return withTime ? `${date} à ${pad(d.getHours())}:${pad(d.getMinutes())}` : date;
};

const fmtNumber = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return clean(value);
  const [int, dec] = Math.abs(n).toFixed(Number.isInteger(n) ? 0 : 2).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${n < 0 ? '-' : ''}${grouped}${dec ? `,${dec}` : ''}`;
};

const humanizeKey = (key) =>
  clean(String(key).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase()));

const formatFieldValue = (key, value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) return clean(value.join(', '));
  if (typeof value === 'object') return clean(JSON.stringify(value));
  const text = String(value).trim();
  if (/^(yes|oui)$/i.test(text)) return 'Oui';
  if (/^(no|non)$/i.test(text)) return 'Non';
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return fmtDate(text, false);
  if (AMOUNT_UNITS[key] && text !== '' && Number.isFinite(Number(text))) return `${fmtNumber(text)} ${AMOUNT_UNITS[key]}`;
  return clean(text);
};

const actorLabel = (step) => {
  const value = clean(step?.actorValue);
  if (step?.actorType === 'hierarchy') {
    if (value === 'N') return 'Demandeur';
    if (value === 'N+1') return 'Supérieur hiérarchique (N+1)';
    if (value === 'N+2') return 'Supérieur du N+1 (N+2)';
  }
  if (step?.actorType === 'role') return `Rôle : ${value.replace(/_/g, ' ')}`;
  if (step?.actorType === 'specificUser') return 'Utilisateur désigné';
  return value || '-';
};

// ---------------------------------------------------------------------------
// Préparation des données
// ---------------------------------------------------------------------------
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

const toObject = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return {};
    }
  }
  return {};
};

const buildContext = async (request, user, workflowDef, options = {}) => {
  const history = Array.isArray(options.history) ? options.history : toArray(request.history);
  const data = options.data || toObject(request.data);
  const status = options.status || request.status || 'draft';
  const steps = Array.isArray(workflowDef?.steps) ? workflowDef.steps : toArray(workflowDef?.steps);

  const ids = new Set(history.map((h) => Number(h?.actor)).filter((id) => Number.isFinite(id) && id > 0));
  if (request.assignedTo) ids.add(Number(request.assignedTo));
  if (request.createdBy) ids.add(Number(request.createdBy));
  const users = ids.size
    ? await User.findAll({ where: { id: [...ids] }, attributes: ['id', 'fullName', 'department', 'role'] })
    : [];
  const userById = users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {});

  const creator = user || request.creator || userById[Number(request.createdBy)] || null;
  const assignee = request.assignee || userById[Number(request.assignedTo)] || null;
  const nameOf = (entry) => clean(entry?.actorName || userById[Number(entry?.actor)]?.fullName || 'Utilisateur');

  // État de chaque étape, reconstitué à partir de l'historique
  const currentIndex = Number(request.currentStepIndex) || 0;
  const stepStates = steps.map((step, index) => {
    const entries = history.filter((h) => h?.stepName === step?.name);
    const last = entries[entries.length - 1];
    if (status === 'rejected' && last?.action === 'reject') return { state: 'rejected', entry: last };
    if (index === currentIndex && ['in_progress', 'pending', 'returned'].includes(status)) {
      return { state: 'current', entry: last };
    }
    if (last?.action === 'validate') return { state: 'done', entry: last };
    if (status === 'approved' || index < currentIndex) return { state: 'skipped' };
    if (status === 'rejected') return { state: 'unreached' };
    return { state: 'upcoming' };
  });

  const validations = history.filter((h) => h?.action === 'validate');
  const doneCount = stepStates.filter((s) => s.state === 'done').length;
  const relevantCount = stepStates.filter((s) => s.state !== 'skipped').length || 1;
  const progress = status === 'approved' ? 1 : Math.min(1, doneCount / relevantCount);

  const fingerprint = crypto
    .createHash('sha256')
    .update(JSON.stringify({ ref: request.reference, status, data, history }))
    .digest('hex')
    .slice(0, 16)
    .toUpperCase()
    .match(/.{4}/g)
    .join('-');

  const lastDate = history.length ? history[history.length - 1]?.timestamp : request.updatedAt;

  return {
    request,
    reference: clean(request.reference || '-'),
    workflowLabel: WORKFLOW_LABELS[request.workflowType] || clean(request.workflowType),
    status,
    statusInfo: STATUS[status] || { label: clean(status), color: C.ink2, bg: C.paper },
    data,
    history,
    steps,
    stepStates,
    validations,
    creator,
    assignee,
    userById,
    nameOf,
    progress,
    doneCount,
    relevantCount,
    fingerprint,
    lastDate,
    attachments: toArray(request.attachments),
    generatedAt: new Date(),
  };
};

// ---------------------------------------------------------------------------
// Rendu
// ---------------------------------------------------------------------------
const render = (doc, ctx) => {
  const W = doc.page.width;
  const H = doc.page.height;
  const CW = W - MARGIN * 2;
  const bottom = () => H - FOOTER_SPACE;
  let y = 0;

  // Tronque un texte sur une ligne avec « … » (l'option ellipsis de PDFKit n'agit pas sans retour à la ligne).
  // Utilise la police et la taille courantes : à appeler après doc.font().fontSize().
  const fit = (text, width, characterSpacing = 0) => {
    let t = clean(text) || '-';
    if (doc.widthOfString(t, { characterSpacing }) <= width) return t;
    while (t.length > 1 && doc.widthOfString(`${t}…`, { characterSpacing }) > width) t = t.slice(0, -1);
    return `${t.trimEnd()}…`;
  };

  const drawCheck = (cx, cy, color = C.white) => {
    doc.save().lineWidth(1.6).strokeColor(color).lineCap('round').lineJoin('round')
      .moveTo(cx - 3.6, cy + 0.2).lineTo(cx - 1, cy + 2.8).lineTo(cx + 3.8, cy - 2.6).stroke().restore();
  };
  const drawCross = (cx, cy, color = C.white) => {
    doc.save().lineWidth(1.6).strokeColor(color).lineCap('round')
      .moveTo(cx - 3, cy - 3).lineTo(cx + 3, cy + 3).moveTo(cx + 3, cy - 3).lineTo(cx - 3, cy + 3).stroke().restore();
  };

  // En-tête de la première page
  const drawFirstHeader = () => {
    doc.rect(0, 0, W, HEADER_FIRST - 4).fill(C.ink);
    doc.rect(0, HEADER_FIRST - 4, W, 4).fill(C.accent);
    doc.roundedRect(MARGIN, 26, 64, 64, 8).fill(C.white);
    const logo = getSotacibLogoPath();
    if (fs.existsSync(logo)) {
      try { doc.image(logo, MARGIN + 6, 32, { fit: [52, 52], align: 'center', valign: 'center' }); } catch (e) { /* logo facultatif */ }
    }
    const tx = MARGIN + 80;
    doc.font('Helvetica-Bold').fontSize(21).fillColor(C.white).text('SOTACIB', tx, 31, { lineBreak: false });
    doc.font('Helvetica').fontSize(9.5).fillColor(C.soft).text('Société Tuniso-Andalouse de Ciment Blanc', tx, 57, { lineBreak: false });
    doc.rect(tx, 74, 28, 2).fill(C.accent);
    doc.font('Helvetica').fontSize(8).fillColor('#8C877E').text('Plateforme SOTACIB Workflow', tx, 82, { lineBreak: false });

    const rx = W - MARGIN - 220;
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.soft)
      .text('RÉCAPITULATIF DE DEMANDE', rx, 34, { width: 220, align: 'right', characterSpacing: 1.4, lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(24).fillColor(C.accent)
      .text(ctx.reference, rx, 47, { width: 220, align: 'right', lineBreak: false });
    doc.font('Helvetica').fontSize(8).fillColor('#8C877E')
      .text(`Édité le ${fmtDate(ctx.generatedAt)}`, rx, 80, { width: 220, align: 'right', lineBreak: false });
    y = HEADER_FIRST + 26;
  };

  // En-tête des pages suivantes
  const drawNextHeader = () => {
    doc.rect(0, 0, W, HEADER_NEXT - 3).fill(C.ink);
    doc.rect(0, HEADER_NEXT - 3, W, 3).fill(C.accent);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.white).text('SOTACIB', MARGIN, 15, { lineBreak: false });
    doc.font('Helvetica').fontSize(9).fillColor(C.soft)
      .text(`Récapitulatif de demande  ·  ${ctx.workflowLabel}`, MARGIN + 52, 15, { lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.accent)
      .text(ctx.reference, W - MARGIN - 150, 15, { width: 150, align: 'right', lineBreak: false });
    y = HEADER_NEXT + 26;
  };

  const newPage = () => {
    doc.addPage();
    drawNextHeader();
  };
  const ensure = (h) => {
    if (y + h > bottom()) newPage();
  };

  // `follow` : hauteur du premier élément qui suit, pour ne jamais laisser un titre seul en bas de page
  const sectionTitle = (num, title, subtitle, follow = 40) => {
    ensure(50 + follow);
    y += 6;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.accent).text(num, MARGIN, y + 3, { lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(15).fillColor(C.ink).text(title, MARGIN + 24, y, { lineBreak: false });
    if (subtitle) {
      doc.font('Helvetica').fontSize(8.5).fillColor(C.muted)
        .text(subtitle, MARGIN + 24, y + 4, { width: CW - 24, align: 'right', lineBreak: false });
    }
    y += 24;
    doc.moveTo(MARGIN, y).lineTo(W - MARGIN, y).lineWidth(0.8).strokeColor(C.line).stroke();
    y += 14;
  };

  // ------------------------------------------------------------------ Page 1
  drawFirstHeader();

  // Titre et statut
  doc.font('Helvetica-Bold').fontSize(23).fillColor(C.ink).text(ctx.workflowLabel, MARGIN, y, { width: CW - 170, lineBreak: false });
  const creatorName = clean(ctx.creator?.fullName || '-');
  const creatorDept = clean(ctx.creator?.department || '');
  doc.font('Helvetica').fontSize(10).fillColor(C.muted)
    .text(`Demande de ${creatorName}${creatorDept ? `  ·  ${creatorDept}` : ''}`, MARGIN, y + 30, { width: CW - 170, lineBreak: false });

  const pillText = ctx.statusInfo.label.toUpperCase();
  doc.font('Helvetica-Bold').fontSize(8.5);
  const pillW = doc.widthOfString(pillText, { characterSpacing: 1 }) + 30;
  const pillX = W - MARGIN - pillW;
  doc.roundedRect(pillX, y + 4, pillW, 24, 12).fill(ctx.statusInfo.bg);
  doc.circle(pillX + 13, y + 16, 3.2).fill(ctx.statusInfo.color);
  doc.fillColor(ctx.statusInfo.color).text(pillText, pillX + 21, y + 12, { characterSpacing: 1, lineBreak: false });
  y += 58;

  // Grille des informations clés
  const lastStepName = ctx.steps[Number(ctx.request.currentStepIndex) || 0]?.name;
  let situation;
  if (ctx.status === 'approved') situation = ['Clôturée le', fmtDate(ctx.lastDate)];
  else if (ctx.status === 'rejected') situation = ['Refusée le', fmtDate(ctx.lastDate)];
  else if (ctx.status === 'draft') situation = ['Situation', 'Non soumise'];
  else situation = ['Étape actuelle', clean(lastStepName || '-')];

  const facts = [
    ['Référence', ctx.reference],
    ['Processus', ctx.workflowLabel],
    ['Demandeur', creatorName],
    ['Date de création', fmtDate(ctx.request.createdAt)],
    situation,
    ctx.status === 'approved' || ctx.status === 'rejected'
      ? ['Visas', `${ctx.validations.length} validation(s)`]
      : ['Chez', ctx.status === 'draft' ? '-' : clean(ctx.assignee?.fullName || 'Non assignée')],
  ];
  const cols = 3;
  const cellW = CW / cols;
  const cellH = 46;
  const gridH = cellH * 2;
  doc.roundedRect(MARGIN, y, CW, gridH, 6).fill(C.paper);
  facts.forEach(([label, value], i) => {
    const cx = MARGIN + (i % cols) * cellW;
    const cy = y + Math.floor(i / cols) * cellH;
    if (i % cols) doc.moveTo(cx, cy + 10).lineTo(cx, cy + cellH - 10).lineWidth(0.6).strokeColor(C.line).stroke();
    doc.font('Helvetica-Bold').fontSize(6.8).fillColor(C.muted)
      .text(label.toUpperCase(), cx + 14, cy + 12, { width: cellW - 24, characterSpacing: 0.9, lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(C.ink);
    doc.text(fit(value, cellW - 24), cx + 14, cy + 25, { width: cellW - 24, lineBreak: false });
  });
  doc.moveTo(MARGIN + 14, y + cellH).lineTo(W - MARGIN - 14, y + cellH).lineWidth(0.6).strokeColor(C.line).stroke();
  y += gridH + 16;

  // Barre de progression
  doc.font('Helvetica-Bold').fontSize(7).fillColor(C.muted)
    .text('AVANCEMENT DU CIRCUIT', MARGIN, y, { characterSpacing: 1, lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.ink)
    .text(`${Math.round(ctx.progress * 100)} %`, MARGIN, y - 1, { width: CW, align: 'right', lineBreak: false });
  y += 14;
  doc.roundedRect(MARGIN, y, CW, 6, 3).fill(C.line);
  if (ctx.progress > 0) doc.roundedRect(MARGIN, y, Math.max(6, CW * ctx.progress), 6, 3).fill(ctx.status === 'rejected' ? C.red : ctx.status === 'approved' ? C.green : C.accent);
  y += 30;

  // --------------------------------------------------- 01 Circuit de validation
  sectionTitle('01', 'Circuit de validation', `${ctx.doneCount} étape(s) validée(s) sur ${ctx.relevantCount}`);
  if (!ctx.steps.length) {
    doc.font('Helvetica-Oblique').fontSize(10).fillColor(C.muted).text('Aucune étape définie pour ce processus.', MARGIN, y);
    y += 24;
  }
  const ROW = 44;
  ctx.steps.forEach((step, index) => {
    ensure(ROW);
    const { state, entry } = ctx.stepStates[index];
    const cx = MARGIN + 12;
    const cy = y + 12;
    const isLast = index === ctx.steps.length - 1;
    if (!isLast) {
      doc.moveTo(cx, cy + 11).lineTo(cx, y + ROW + 1).lineWidth(1.4)
        .strokeColor(state === 'done' ? C.green : C.line).stroke();
    }
    const fills = {
      done: C.green, current: C.accent, rejected: C.red, skipped: C.paper, upcoming: C.white, unreached: C.white,
    };
    doc.circle(cx, cy, 10).fill(fills[state]);
    if (['skipped', 'upcoming', 'unreached'].includes(state)) doc.circle(cx, cy, 10).lineWidth(1).strokeColor(C.line).stroke();
    if (state === 'done') drawCheck(cx, cy);
    else if (state === 'rejected') drawCross(cx, cy);
    else {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(state === 'current' ? C.white : C.muted)
        .text(String(index + 1), cx - 10, cy - 4, { width: 20, align: 'center', lineBreak: false });
    }

    const tx = MARGIN + 34;
    const tw = CW - 34 - 190;
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(['skipped', 'unreached', 'upcoming'].includes(state) ? C.muted : C.ink)
    doc.text(fit(step?.name, tw), tx, y + 4, { width: tw, lineBreak: false });
    doc.font('Helvetica').fontSize(8.5).fillColor(C.muted);
    doc.text(fit(actorLabel(step), tw), tx, y + 19, { width: tw, lineBreak: false });

    let stateText = '';
    let stateColor = C.muted;
    let detail = '';
    if (state === 'done') { stateText = 'Validée'; stateColor = C.green; detail = `${ctx.nameOf(entry)}  ·  ${fmtDate(entry?.timestamp)}`; }
    if (state === 'current') {
      stateText = ctx.status === 'returned' ? 'Retournée, à corriger' : 'En attente';
      stateColor = ctx.status === 'returned' ? C.amber : C.accent;
      detail = ctx.assignee?.fullName ? `chez ${clean(ctx.assignee.fullName)}` : '';
    }
    if (state === 'rejected') { stateText = 'Refusée'; stateColor = C.red; detail = `${ctx.nameOf(entry)}  ·  ${fmtDate(entry?.timestamp)}`; }
    if (state === 'skipped') { stateText = 'Non requise'; detail = 'Condition du circuit'; }
    if (state === 'upcoming') stateText = 'À venir';
    if (state === 'unreached') stateText = 'Non atteinte';
    doc.font('Helvetica-Bold').fontSize(9).fillColor(stateColor)
      .text(stateText, W - MARGIN - 190, y + 4, { width: 190, align: 'right', lineBreak: false });
    if (detail) {
      doc.font('Helvetica').fontSize(8).fillColor(C.muted);
      doc.text(fit(detail, 190), W - MARGIN - 190, y + 19, { width: 190, align: 'right', lineBreak: false });
    }
    y += ROW;
  });
  y += 10;

  // -------------------------------------------------------- 02 Données saisies
  const entries = Object.entries(ctx.data || {});
  if (ctx.attachments.length) {
    const names = ctx.attachments.map((file) => clean(String(file).replace(/\\/g, '/').split('/').pop()));
    entries.push(['__attachments', `${names.length} fichier(s) : ${names.join(', ')}`]);
  }
  FIELD_LABELS.__attachments = 'Pièces jointes';
  sectionTitle('02', 'Données de la demande', `${entries.length} champ(s)`);
  if (!entries.length) {
    doc.font('Helvetica-Oblique').fontSize(10).fillColor(C.muted).text('Aucune donnée saisie.', MARGIN, y);
    y += 24;
  } else {
    const colW = (CW - 16) / 2;
    for (let i = 0; i < entries.length; i += 2) {
      const pair = entries.slice(i, i + 2).map(([key, value]) => ({
        label: (FIELD_LABELS[key] || humanizeKey(key)).toUpperCase(),
        value: formatFieldValue(key, value),
      }));
      doc.font('Helvetica').fontSize(10);
      const rowH = Math.max(...pair.map((p) => doc.heightOfString(p.value, { width: colW - 4 }))) + 30;
      ensure(rowH);
      pair.forEach((p, j) => {
        const x = MARGIN + j * (colW + 16);
        doc.font('Helvetica-Bold').fontSize(6.8).fillColor(C.muted);
        doc.text(fit(p.label, colW, 0.8), x, y + 6, { width: colW, characterSpacing: 0.8, lineBreak: false });
        doc.font('Helvetica').fontSize(10).fillColor(C.ink).text(p.value, x, y + 18, { width: colW - 4 });
        doc.moveTo(x, y + rowH - 2).lineTo(x + colW, y + rowH - 2).lineWidth(0.5).strokeColor(C.line).stroke();
      });
      y += rowH + 2;
    }
    y += 10;
  }

  // ---------------------------------------------------- 03 Historique des décisions
  sectionTitle('03', 'Historique des décisions', `${ctx.history.length} action(s)`);
  if (!ctx.history.length) {
    doc.font('Helvetica-Oblique').fontSize(10).fillColor(C.muted).text('Aucune décision enregistrée pour le moment.', MARGIN, y);
    y += 24;
  } else {
    const colsW = [96, 156, 76, CW - 96 - 156 - 76];
    const headers = ['DATE', 'ÉTAPE', 'DÉCISION', 'PAR'];
    const drawTableHeader = () => {
      doc.rect(MARGIN, y, CW, 22).fill(C.ink);
      let x = MARGIN;
      headers.forEach((h, i) => {
        doc.font('Helvetica-Bold').fontSize(7).fillColor(C.white)
          .text(h, x + 8, y + 8, { width: colsW[i] - 12, characterSpacing: 0.9, lineBreak: false });
        x += colsW[i];
      });
      y += 22;
    };
    ensure(60);
    drawTableHeader();
    ctx.history.forEach((entry, idx) => {
      const action = ACTIONS[entry?.action] || { label: clean(entry?.action), color: C.ink2 };
      const comment = clean(entry?.comment);
      doc.font('Helvetica-Oblique').fontSize(8.5);
      const commentH = comment ? doc.heightOfString(`« ${comment} »`, { width: CW - 30 }) + 8 : 0;
      const rowH = 24 + commentH;
      if (y + rowH > bottom()) { newPage(); drawTableHeader(); }
      if (idx % 2 === 1) doc.rect(MARGIN, y, CW, rowH).fill(C.paper);
      const cells = [fmtDate(entry?.timestamp), clean(entry?.stepName), action.label, ctx.nameOf(entry)];
      let x = MARGIN;
      cells.forEach((cell, i) => {
        doc.font(i === 2 ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.8).fillColor(i === 2 ? action.color : C.ink);
        doc.text(fit(cell, colsW[i] - 12), x + 8, y + 8, { width: colsW[i] - 12, lineBreak: false });
        x += colsW[i];
      });
      if (comment) {
        doc.rect(MARGIN + 8, y + 24, 2, commentH - 8).fill(C.accent);
        doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(C.ink2)
          .text(`« ${comment} »`, MARGIN + 18, y + 24, { width: CW - 30 });
      }
      y += rowH;
      doc.moveTo(MARGIN, y).lineTo(W - MARGIN, y).lineWidth(0.4).strokeColor(C.line).stroke();
    });
    y += 18;
  }

  // -------------------------------------------------------------- 04 Visas
  if (ctx.validations.length) {
    const perRow = 3;
    const gap = 10;
    const cardW = (CW - gap * (perRow - 1)) / perRow;
    const cardH = 74;
    sectionTitle('04', 'Visas électroniques', 'Une validation = un visa horodaté', cardH);
    ctx.validations.forEach((entry, i) => {
      if (i % perRow === 0) {
        if (i) y += cardH + gap;
        ensure(cardH);
      }
      const actor = ctx.userById[Number(entry?.actor)];
      const x = MARGIN + (i % perRow) * (cardW + gap);
      doc.roundedRect(x, y, cardW, cardH, 6).lineWidth(0.8).strokeColor(C.line).stroke();
      doc.rect(x + 1, y + 1, cardW - 2, 3).fill(C.green);
      doc.circle(x + 16, y + 20, 7).fill(C.greenSoft);
      drawCheck(x + 16, y + 20, C.green);
      doc.font('Helvetica-Bold').fontSize(6.8).fillColor(C.green)
        .text('VISA ÉLECTRONIQUE', x + 29, y + 17, { characterSpacing: 0.8, lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(10).fillColor(C.ink);
      doc.text(fit(ctx.nameOf(entry), cardW - 20), x + 10, y + 34, { width: cardW - 20, lineBreak: false });
      const roleDept = [actor?.role ? clean(actor.role).replace(/_/g, ' ') : '', clean(actor?.department || '')].filter(Boolean).join('  ·  ');
      doc.font('Helvetica').fontSize(7.8).fillColor(C.muted);
      doc.text(fit(roleDept || entry?.stepName, cardW - 20), x + 10, y + 48, { width: cardW - 20, lineBreak: false });
      doc.font('Helvetica').fontSize(7.8).fillColor(C.ink2)
        .text(fmtDate(entry?.timestamp), x + 10, y + 59, { width: cardW - 20, lineBreak: false });
    });
    y += cardH + 24;
  }

  // --------------------------------------------- Pied de page sur chaque page
  // L'empreinte, calculée sur les données et l'historique, change à la moindre modification.
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const savedBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const fy = H - 40;
    doc.moveTo(MARGIN, fy).lineTo(W - MARGIN, fy).lineWidth(0.6).strokeColor(C.line).stroke();
    doc.font('Helvetica').fontSize(7.5).fillColor(C.muted)
      .text('SOTACIB Workflow  ·  Document généré automatiquement', MARGIN, fy + 10, { lineBreak: false });
    doc.font('Helvetica').fontSize(7.5).fillColor(C.muted)
      .text('Empreinte de vérification  ', MARGIN + 205, fy + 10, { lineBreak: false, continued: true })
      .font('Courier-Bold').fillColor(C.ink).text(ctx.fingerprint, { lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.ink)
      .text(`Page ${i - range.start + 1} / ${range.count}`, MARGIN, fy + 10, { width: CW, align: 'right', lineBreak: false });
    doc.page.margins.bottom = savedBottom;
  }
};

const createDocument = (ctx) => new PDFDocument({
  size: 'A4',
  margins: { top: MARGIN, bottom: FOOTER_SPACE, left: MARGIN, right: MARGIN },
  bufferPages: true,
  info: {
    Title: `Récapitulatif de la demande ${ctx.reference}`,
    Author: 'SOTACIB Workflow',
    Subject: `${ctx.workflowLabel} - ${ctx.statusInfo.label}`,
    Creator: 'SOTACIB Workflow',
  },
});

/**
 * Génère le PDF final d'une demande et l'enregistre dans uploads/pdfs.
 * Retourne le chemin public du fichier (/uploads/pdfs/...).
 */
const generateRequestPDF = async (request, user, workflowDef, options = {}) => {
  const ctx = await buildContext(request, user, workflowDef, options);
  return new Promise((resolve, reject) => {
    const doc = createDocument(ctx);
    const filename = `request_${ctx.reference}_${Date.now()}.pdf`;
    const filepath = path.join(__dirname, '../../uploads/pdfs', filename);
    if (!fs.existsSync(path.dirname(filepath))) fs.mkdirSync(path.dirname(filepath), { recursive: true });
    const stream = fs.createWriteStream(filepath);
    stream.on('finish', () => resolve(`/uploads/pdfs/${filename}`));
    stream.on('error', reject);
    doc.pipe(stream);
    try {
      render(doc, ctx);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Génère le PDF d'une demande à la volée (quel que soit son état) et l'envoie
 * directement dans la réponse HTTP, sans l'enregistrer sur le disque.
 */
const streamRequestPDF = async (res, request, user, workflowDef) => {
  const ctx = await buildContext(request, user, workflowDef);
  const doc = createDocument(ctx);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${ctx.reference}_recapitulatif.pdf"`);
  doc.pipe(res);
  render(doc, ctx);
  doc.end();
};

module.exports = { generateRequestPDF, streamRequestPDF };
