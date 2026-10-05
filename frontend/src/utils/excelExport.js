// Exports Excel (.xlsx) mis en forme aux couleurs de SOTACIB Workflow.
// exceljs n'est chargé qu'au moment de l'export pour ne pas alourdir l'application.
import {
  actionLabel,
  actorLabel,
  computeStepStates,
  downloadBlob,
  fieldLabel,
  fieldValue,
  fileDateStamp,
  STEP_STATE_LABELS,
  statusLabel,
  workflowLabel,
} from './exportFiles';

const COLORS = {
  ink: 'FF1B1B1A',
  ink2: 'FF3A3A37',
  muted: 'FF7A766E',
  soft: 'FFB9B4AA',
  line: 'FFDDD8CF',
  paper: 'FFF4F2EE',
  white: 'FFFFFFFF',
  accent: 'FFE8591A',
  accentSoft: 'FFFDEDE4',
  green: 'FF2F7D5B',
  greenSoft: 'FFE6F2EC',
  red: 'FFC23B3B',
  redSoft: 'FFF8E5E5',
  amber: 'FFB7791F',
  amberSoft: 'FFFBF1DF',
};

const STATUS_STYLE = {
  draft: [COLORS.muted, COLORS.paper],
  pending: [COLORS.amber, COLORS.amberSoft],
  in_progress: [COLORS.accent, COLORS.accentSoft],
  returned: [COLORS.amber, COLORS.amberSoft],
  approved: [COLORS.green, COLORS.greenSoft],
  rejected: [COLORS.red, COLORS.redSoft],
};

const STEP_STYLE = {
  done: [COLORS.green, COLORS.greenSoft],
  current: [COLORS.accent, COLORS.accentSoft],
  returned: [COLORS.amber, COLORS.amberSoft],
  rejected: [COLORS.red, COLORS.redSoft],
  skipped: [COLORS.muted, COLORS.paper],
  upcoming: [COLORS.muted, COLORS.white],
  unreached: [COLORS.muted, COLORS.white],
};

const ACTION_COLOR = { validate: COLORS.green, return: COLORS.amber, reject: COLORS.red };

const FONT = 'Calibri';
const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const thin = (argb = COLORS.line) => ({ style: 'thin', color: { argb } });
const DATE_FMT = 'dd/mm/yyyy hh:mm';

const loadExcel = async () => {
  const mod = await import('exceljs/dist/exceljs.min.js');
  return mod.default || mod;
};

const toDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const save = async (workbook, filename) => {
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename
  );
};

const newWorkbook = (ExcelJS, title) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SOTACIB Workflow';
  workbook.company = 'SOTACIB';
  workbook.title = title;
  workbook.created = new Date();
  return workbook;
};

// Bandeau d'en-tête : titre à gauche, mention à droite, filet orange dessous
const drawBanner = (sheet, lastCol, title, rightText) => {
  sheet.mergeCells(1, 1, 2, lastCol - 2);
  const t = sheet.getCell(1, 1);
  t.value = { richText: [
    { text: 'SOTACIB  ', font: { name: FONT, size: 18, bold: true, color: { argb: COLORS.white } } },
    { text: title, font: { name: FONT, size: 12, color: { argb: COLORS.soft } } },
  ] };
  t.alignment = { vertical: 'middle', indent: 1 };
  sheet.mergeCells(1, lastCol - 1, 2, lastCol);
  const r = sheet.getCell(1, lastCol - 1);
  r.value = rightText;
  r.font = { name: FONT, size: 16, bold: true, color: { argb: COLORS.accent } };
  r.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
  for (let row = 1; row <= 2; row += 1) {
    for (let col = 1; col <= lastCol; col += 1) sheet.getCell(row, col).fill = fill(COLORS.ink);
  }
  sheet.getRow(1).height = 24;
  sheet.getRow(2).height = 24;
  for (let col = 1; col <= lastCol; col += 1) sheet.getCell(3, col).fill = fill(COLORS.accent);
  sheet.getRow(3).height = 4;
};

const sectionTitle = (sheet, rowNumber, lastCol, number, title, aside = '') => {
  const row = sheet.getRow(rowNumber);
  row.height = 26;
  row.getCell(1).value = { richText: [
    { text: `${number}  `, font: { name: FONT, size: 11, bold: true, color: { argb: COLORS.accent } } },
    { text: title, font: { name: FONT, size: 14, bold: true, color: { argb: COLORS.ink } } },
  ] };
  row.getCell(1).alignment = { vertical: 'bottom' };
  if (aside) {
    const c = row.getCell(lastCol);
    c.value = aside;
    c.font = { name: FONT, size: 9, color: { argb: COLORS.muted } };
    c.alignment = { horizontal: 'right', vertical: 'bottom' };
  }
  for (let col = 1; col <= lastCol; col += 1) row.getCell(col).border = { bottom: thin() };
  return rowNumber + 2;
};

const headerRow = (sheet, rowNumber, labels) => {
  const row = sheet.getRow(rowNumber);
  row.height = 22;
  labels.forEach((label, i) => {
    const c = row.getCell(i + 1);
    c.value = label.toUpperCase();
    c.font = { name: FONT, size: 9, bold: true, color: { argb: COLORS.white } };
    c.fill = fill(COLORS.ink);
    c.alignment = { vertical: 'middle', indent: 1 };
  });
};

const pill = (cell, text, [color, bg]) => {
  cell.value = text;
  cell.font = { name: FONT, size: 10, bold: true, color: { argb: color } };
  cell.fill = fill(bg);
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
};

const pageSetup = (sheet, orientation = 'portrait') => {
  sheet.pageSetup = {
    paperSize: 9,
    orientation,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.2, footer: 0.3 },
  };
  sheet.headerFooter.oddFooter = '&L&8SOTACIB Workflow&C&8&A&R&8Page &P / &N';
  sheet.views = [{ showGridLines: false }];
};

// ---------------------------------------------------------------------------
// Export d'une demande : récapitulatif complet
// ---------------------------------------------------------------------------
export const exportRequestExcel = async (request, workflow) => {
  const ExcelJS = await loadExcel();
  const workbook = newWorkbook(ExcelJS, `Récapitulatif ${request.reference}`);
  const sheet = workbook.addWorksheet('Récapitulatif');
  const LAST = 6;
  sheet.columns = [{ width: 24 }, { width: 30 }, { width: 26 }, { width: 22 }, { width: 24 }, { width: 22 }];
  pageSetup(sheet);
  drawBanner(sheet, LAST, 'Récapitulatif de demande', request.reference);

  // Titre et statut
  let r = 5;
  sheet.mergeCells(r, 1, r, 4);
  const title = sheet.getCell(r, 1);
  title.value = workflowLabel(request.workflowType);
  title.font = { name: FONT, size: 20, bold: true, color: { argb: COLORS.ink } };
  sheet.getRow(r).height = 32;
  sheet.mergeCells(r, 5, r, 6);
  pill(sheet.getCell(r, 5), statusLabel(request.status).toUpperCase(), STATUS_STYLE[request.status] || STATUS_STYLE.draft);
  r += 1;
  sheet.mergeCells(r, 1, r, LAST);
  const sub = sheet.getCell(r, 1);
  sub.value = `Demande de ${request.creator?.fullName || '-'}${request.creator?.department ? `  ·  ${request.creator.department}` : ''}`;
  sub.font = { name: FONT, size: 10, color: { argb: COLORS.muted } };
  r += 2;

  // Informations clés (3 colonnes de couples libellé / valeur)
  const history = Array.isArray(request.history) ? request.history : [];
  const steps = Array.isArray(workflow?.steps) ? workflow.steps : [];
  const closed = ['approved', 'rejected'].includes(request.status);
  const facts = [
    ['Référence', request.reference],
    ['Processus', workflowLabel(request.workflowType)],
    ['Demandeur', request.creator?.fullName || '-'],
    ['Date de création', toDate(request.createdAt)],
    closed ? ['Clôturée le', toDate(history[history.length - 1]?.timestamp)] : ['Étape actuelle', steps[request.currentStepIndex]?.name || '-'],
    closed
      ? ['Visas', `${history.filter((h) => h.action === 'validate').length} validation(s)`]
      : ['Chez', request.status === 'draft' ? '-' : request.assignee?.fullName || 'Non assignée'],
  ];
  for (let line = 0; line < 2; line += 1) {
    const labelRow = sheet.getRow(r);
    const valueRow = sheet.getRow(r + 1);
    labelRow.height = 18;
    valueRow.height = 22;
    for (let k = 0; k < 3; k += 1) {
      const [label, value] = facts[line * 3 + k];
      const col = k * 2 + 1;
      sheet.mergeCells(r, col, r, col + 1);
      sheet.mergeCells(r + 1, col, r + 1, col + 1);
      const lc = labelRow.getCell(col);
      lc.value = label.toUpperCase();
      lc.font = { name: FONT, size: 8, bold: true, color: { argb: COLORS.muted } };
      lc.alignment = { vertical: 'bottom', indent: 1 };
      const vc = valueRow.getCell(col);
      vc.value = value || '-';
      if (value instanceof Date) vc.numFmt = DATE_FMT;
      vc.font = { name: FONT, size: 11, bold: true, color: { argb: COLORS.ink } };
      vc.alignment = { vertical: 'top', horizontal: 'left', indent: 1 };
      for (let c = col; c <= col + 1; c += 1) {
        labelRow.getCell(c).fill = fill(COLORS.paper);
        valueRow.getCell(c).fill = fill(COLORS.paper);
      }
    }
    r += 2;
  }
  r += 1;

  // 01 Circuit de validation
  const states = computeStepStates(request, steps);
  const doneCount = states.filter((s) => s.state === 'done').length;
  const relevant = states.filter((s) => s.state !== 'skipped').length || 1;
  r = sectionTitle(sheet, r, LAST, '01', 'Circuit de validation', `${doneCount} étape(s) validée(s) sur ${relevant}`);
  headerRow(sheet, r, ['N°', 'Étape', 'Responsable', 'État', 'Par', 'Date']);
  r += 1;
  steps.forEach((step, i) => {
    const { state, entry } = states[i];
    const row = sheet.getRow(r);
    row.height = 20;
    row.getCell(1).value = i + 1;
    row.getCell(2).value = step.name;
    row.getCell(3).value = actorLabel(step);
    pill(row.getCell(4), STEP_STATE_LABELS[state], STEP_STYLE[state]);
    const by = ['done', 'rejected'].includes(state) ? entry?.actorName || '' : state === 'current' ? request.assignee?.fullName || '' : '';
    row.getCell(5).value = by;
    const date = ['done', 'rejected'].includes(state) ? toDate(entry?.timestamp) : null;
    row.getCell(6).value = date;
    if (date) row.getCell(6).numFmt = DATE_FMT;
    [1, 2, 3, 5, 6].forEach((c) => {
      const cell = row.getCell(c);
      cell.font = { name: FONT, size: 10, bold: c === 2, color: { argb: ['skipped', 'upcoming', 'unreached'].includes(state) ? COLORS.muted : COLORS.ink } };
      cell.alignment = { vertical: 'middle', horizontal: c === 1 ? 'center' : 'left', indent: c === 1 ? 0 : 1 };
    });
    for (let c = 1; c <= LAST; c += 1) row.getCell(c).border = { bottom: thin() };
    r += 1;
  });
  r += 1;

  // 02 Données de la demande
  const entries = Object.entries(request.data || {});
  r = sectionTitle(sheet, r, LAST, '02', 'Données de la demande', `${entries.length} champ(s)`);
  headerRow(sheet, r, ['Champ', 'Valeur', '', '', '', '']);
  sheet.mergeCells(r, 2, r, LAST);
  r += 1;
  entries.forEach(([key, value], i) => {
    const row = sheet.getRow(r);
    sheet.mergeCells(r, 2, r, LAST);
    row.getCell(1).value = fieldLabel(key);
    row.getCell(1).font = { name: FONT, size: 9, bold: true, color: { argb: COLORS.muted } };
    const numeric = value !== '' && value !== null && Number.isFinite(Number(value)) && /montant|budget/i.test(key);
    row.getCell(2).value = numeric ? Number(value) : fieldValue(value);
    if (numeric) row.getCell(2).numFmt = key === 'montant' ? '#,##0.00 "DT"' : '#,##0.00';
    row.getCell(2).font = { name: FONT, size: 10.5, color: { argb: COLORS.ink } };
    row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 };
    row.getCell(1).alignment = { vertical: 'middle', indent: 1 };
    for (let c = 1; c <= LAST; c += 1) {
      if (i % 2) row.getCell(c).fill = fill(COLORS.paper);
      row.getCell(c).border = { bottom: thin() };
    }
    row.height = 20;
    r += 1;
  });
  const attachments = Array.isArray(request.attachments) ? request.attachments : [];
  if (attachments.length) {
    const row = sheet.getRow(r);
    sheet.mergeCells(r, 2, r, LAST);
    row.getCell(1).value = 'Pièces jointes';
    row.getCell(1).font = { name: FONT, size: 9, bold: true, color: { argb: COLORS.muted } };
    row.getCell(1).alignment = { indent: 1 };
    row.getCell(2).value = attachments.map((a) => String(a).split(/[\\/]/).pop()).join(', ');
    row.getCell(2).font = { name: FONT, size: 10.5, color: { argb: COLORS.ink } };
    row.getCell(2).alignment = { vertical: 'middle', wrapText: true, indent: 1 };
    row.getCell(1).alignment = { vertical: 'middle', indent: 1 };
    row.height = 20;
    for (let c = 1; c <= LAST; c += 1) row.getCell(c).border = { bottom: thin() };
    r += 1;
  }
  r += 1;

  // 03 Historique des décisions
  r = sectionTitle(sheet, r, LAST, '03', 'Historique des décisions', `${history.length} action(s)`);
  headerRow(sheet, r, ['Date', 'Étape', 'Décision', 'Par', 'Commentaire', '']);
  sheet.mergeCells(r, 5, r, LAST);
  r += 1;
  if (!history.length) {
    sheet.getCell(r, 1).value = 'Aucune décision enregistrée pour le moment.';
    sheet.getCell(r, 1).font = { name: FONT, italic: true, color: { argb: COLORS.muted } };
    r += 1;
  }
  history.forEach((entry, i) => {
    const row = sheet.getRow(r);
    sheet.mergeCells(r, 5, r, LAST);
    row.getCell(1).value = toDate(entry.timestamp);
    row.getCell(1).numFmt = DATE_FMT;
    row.getCell(2).value = entry.stepName || '';
    row.getCell(3).value = actionLabel(entry.action);
    row.getCell(4).value = entry.actorName || '';
    row.getCell(5).value = entry.comment || '';
    for (let c = 1; c <= LAST; c += 1) {
      const cell = row.getCell(c);
      cell.font = { name: FONT, size: 10, italic: c === 5, bold: c === 3, color: { argb: c === 3 ? ACTION_COLOR[entry.action] || COLORS.ink2 : c === 5 ? COLORS.ink2 : COLORS.ink } };
      cell.alignment = { vertical: 'top', wrapText: c === 5, indent: 1 };
      if (i % 2) cell.fill = fill(COLORS.paper);
      cell.border = { bottom: thin() };
    }
    const lines = Math.ceil(String(entry.comment || '').length / 45) || 1;
    row.height = Math.max(20, lines * 15);
    r += 1;
  });
  r += 2;

  sheet.mergeCells(r, 1, r, LAST);
  const foot = sheet.getCell(r, 1);
  foot.value = `Document généré automatiquement par SOTACIB Workflow le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`;
  foot.font = { name: FONT, size: 8.5, italic: true, color: { argb: COLORS.muted } };

  await save(workbook, `${request.reference}_recapitulatif.xlsx`);
};

// ---------------------------------------------------------------------------
// Export d'une liste de demandes (statistiques, tableau de bord administrateur)
// ---------------------------------------------------------------------------
export const exportRequestsExcel = async (requests, { title = 'Export des demandes', filtersLabel = '' } = {}) => {
  const ExcelJS = await loadExcel();
  const workbook = newWorkbook(ExcelJS, title);
  const sheet = workbook.addWorksheet('Demandes');
  const LAST = 8;
  sheet.columns = [
    { width: 15 }, { width: 24 }, { width: 16 }, { width: 24 }, { width: 22 }, { width: 22 }, { width: 18 }, { width: 18 },
  ];
  pageSetup(sheet, 'landscape');
  drawBanner(sheet, LAST, title, `${requests.length} demande(s)`);

  sheet.mergeCells(5, 1, 5, LAST);
  const info = sheet.getCell(5, 1);
  info.value = `Exporté le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}${filtersLabel ? `  ·  ${filtersLabel}` : ''}`;
  info.font = { name: FONT, size: 10, color: { argb: COLORS.muted } };

  // Indicateurs
  const count = (s) => requests.filter((r) => s.includes(r.status)).length;
  const kpis = [
    ['Total', requests.length, COLORS.ink],
    ['Approuvées', count(['approved']), COLORS.green],
    ['En cours', count(['in_progress', 'pending', 'returned']), COLORS.accent],
    ['Refusées', count(['rejected']), COLORS.red],
  ];
  kpis.forEach(([label, value, color], i) => {
    const col = i * 2 + 1;
    sheet.mergeCells(7, col, 7, col + 1);
    sheet.mergeCells(8, col, 8, col + 1);
    const l = sheet.getCell(7, col);
    l.value = label.toUpperCase();
    l.font = { name: FONT, size: 8, bold: true, color: { argb: COLORS.muted } };
    l.alignment = { indent: 1, vertical: 'bottom' };
    const v = sheet.getCell(8, col);
    v.value = value;
    v.font = { name: FONT, size: 20, bold: true, color: { argb: color } };
    v.alignment = { indent: 1, horizontal: 'left', vertical: 'middle' };
    for (let c = col; c <= col + 1; c += 1) {
      sheet.getCell(7, c).fill = fill(COLORS.paper);
      sheet.getCell(8, c).fill = fill(COLORS.paper);
      sheet.getCell(8, c).border = { bottom: { style: 'medium', color: { argb: color } } };
    }
  });
  sheet.getRow(7).height = 18;
  sheet.getRow(8).height = 30;

  // Tableau
  const HEAD = 10;
  headerRow(sheet, HEAD, ['Référence', 'Processus', 'Statut', 'Demandeur', 'Département', 'Chez', 'Création', 'Mise à jour']);
  requests.forEach((req, i) => {
    const row = sheet.getRow(HEAD + 1 + i);
    row.values = [
      req.reference,
      workflowLabel(req.workflowType),
      statusLabel(req.status),
      req.creator?.fullName || '',
      req.creator?.department || '',
      ['approved', 'rejected', 'draft'].includes(req.status) ? '' : req.assignee?.fullName || '',
      toDate(req.createdAt),
      toDate(req.updatedAt),
    ];
    row.height = 19;
    for (let c = 1; c <= LAST; c += 1) {
      const cell = row.getCell(c);
      cell.font = { name: FONT, size: 10, bold: c === 1, color: { argb: COLORS.ink } };
      cell.alignment = { vertical: 'middle', indent: 1 };
      if (i % 2) cell.fill = fill(COLORS.paper);
      cell.border = { bottom: thin() };
    }
    row.getCell(7).numFmt = DATE_FMT;
    row.getCell(8).numFmt = DATE_FMT;
    pill(row.getCell(3), statusLabel(req.status), STATUS_STYLE[req.status] || STATUS_STYLE.draft);
  });
  sheet.autoFilter = { from: { row: HEAD, column: 1 }, to: { row: HEAD + Math.max(1, requests.length), column: LAST } };
  sheet.views = [{ state: 'frozen', ySplit: HEAD, showGridLines: false }];

  // Feuille de synthèse
  const summary = workbook.addWorksheet('Synthèse');
  summary.columns = [{ width: 30 }, { width: 14 }, { width: 14 }];
  pageSetup(summary);
  drawBanner(summary, 3, 'Synthèse', '');
  let r = 5;
  const block = (heading, groups) => {
    headerRow(summary, r, [heading, 'Nombre', 'Part']);
    r += 1;
    groups.forEach(([label, value], i) => {
      const row = summary.getRow(r);
      row.values = [label, value, requests.length ? value / requests.length : 0];
      row.getCell(3).numFmt = '0.0%';
      for (let c = 1; c <= 3; c += 1) {
        row.getCell(c).font = { name: FONT, size: 10.5, color: { argb: COLORS.ink } };
        row.getCell(c).alignment = { indent: 1 };
        if (i % 2) row.getCell(c).fill = fill(COLORS.paper);
        row.getCell(c).border = { bottom: thin() };
      }
      r += 1;
    });
    r += 1;
  };
  const byStatus = Object.keys(STATUS_STYLE)
    .map((s) => [statusLabel(s), requests.filter((x) => x.status === s).length])
    .filter(([, n]) => n > 0);
  const types = [...new Set(requests.map((x) => x.workflowType))];
  const byType = types.map((t) => [workflowLabel(t), requests.filter((x) => x.workflowType === t).length]);
  block('Par statut', byStatus);
  block('Par processus', byType);

  await save(workbook, `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}_${fileDateStamp()}.xlsx`);
};
