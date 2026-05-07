const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { User } = require('../models');

const toDisplayText = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const addSectionHeader = (doc, title, color, icon = '') => {
  doc.moveDown(1.5);

  // Section background with gradient effect
  const sectionY = doc.y - 5;
  doc.rect(40, sectionY, doc.page.width - 80, 35).fill(color);

  // Section title with icon
  doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold');
  if (icon) doc.text(icon, 60, sectionY + 8);
  doc.text(` ${title.toUpperCase()}`, 85, sectionY + 10);

  doc.moveDown(2);
};

const addInfoCard = (doc, title, fields, bgColor = '#f8fafc', borderColor = '#e2e8f0') => {
  const cardY = doc.y;
  const cardHeight = 25 + (fields.length * 18);

  // Card background with subtle shadow effect
  doc.rect(45, cardY + 2, doc.page.width - 90, cardHeight).fill('#000000').opacity(0.1);
  doc.opacity(1);
  doc.rect(40, cardY, doc.page.width - 80, cardHeight).fillAndStroke(bgColor, borderColor);

  // Title
  doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold').text(title, 55, cardY + 8);

  // Fields
  let fieldY = cardY + 25;
  fields.forEach(([label, value]) => {
    doc.fontSize(9).fillColor('#64748b').text(`${label}:`, 55, fieldY, { continued: true });
    doc.fillColor('#0f172a').text(` ${toDisplayText(value)}`);
    fieldY += 15;
  });

  doc.y = cardY + cardHeight + 10;
};

const addTableRow = (doc, columns, y, isHeader = false) => {
  const colWidth = (doc.page.width - 100) / columns.length;
  let x = 50;

  columns.forEach((col, index) => {
    const cellWidth = index === 0 ? colWidth + 20 : colWidth - 5;

    if (isHeader) {
      doc.rect(x, y, cellWidth, 20).fill('#f1f5f9');
      doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold').text(col, x + 5, y + 5);
    } else {
      doc.rect(x, y, cellWidth, 18).fillAndStroke('#ffffff', '#e5e7eb');
      doc.fillColor('#374151').fontSize(9).font('Helvetica').text(col, x + 5, y + 4);
    }

    x += cellWidth;
  });
};

const generateRequestPDF = async (request, user, workflowDef, options = {}) => {
  const history = Array.isArray(options.history) ? options.history : (Array.isArray(request.history) ? request.history : []);
  const requestData = options.data || request.data || {};
  const requestStatus = options.status || request.status;

  const actorIds = [...new Set(
    history
      .map((entry) => Number(entry?.actor))
      .filter((id) => Number.isFinite(id) && id > 0)
  )];

  const actors = actorIds.length
    ? await User.findAll({ where: { id: actorIds }, attributes: ['id', 'fullName', 'department', 'role'] })
    : [];
  const actorById = actors.reduce((acc, actor) => {
    acc[actor.id] = actor;
    return acc;
  }, {});

  const validatedEntries = history.filter((entry) => entry?.action === 'validate');
  const validatorsByDepartment = {};
  validatedEntries.forEach((entry) => {
    const actor = actorById[Number(entry.actor)];
    const department = actor?.department || 'Non renseigné';
    const validatorName = entry.actorName || actor?.fullName || `User ${entry.actor}`;
    const role = actor?.role || '-';

    if (!validatorsByDepartment[department]) {
      validatorsByDepartment[department] = [];
    }
    const signature = `${validatorName} (${role})`;
    if (!validatorsByDepartment[department].includes(signature)) {
      validatorsByDepartment[department].push(signature);
    }
  });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 50,
      size: 'A4',
      info: {
        Title: `Demande ${request.reference}`,
        Author: 'SOTACIB',
        Subject: 'Récapitulatif Professionnel de Demande',
        Keywords: 'demande, workflow, validation, professionnel'
      }
    });

    const filename = `request_${request.reference}_${Date.now()}.pdf`;
    const filepath = path.join(__dirname, '../../uploads/pdfs', filename);
    if (!fs.existsSync(path.dirname(filepath))) fs.mkdirSync(path.dirname(filepath), { recursive: true });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Enhanced header with gradient and logo area
    doc.rect(0, 0, doc.page.width, 100).fill('#1e293b');
    doc.rect(0, 80, doc.page.width, 20).fill('#3b82f6');

    // Company branding
    doc.fillColor('#ffffff').fontSize(28).font('Helvetica-Bold').text('SOTACIB', 50, 25);
    doc.fontSize(14).fillColor('#e2e8f0').text('Société Tunisienne d\'Assurances et de Réassurances', 50, 55);
    doc.fontSize(11).fillColor('#94a3b8').text('RÉCAPITULATIF PROFESSIONNEL DE DEMANDE', 50, 75);

    // Decorative elements
    doc.circle(500, 40, 15).fill('#3b82f6');
    doc.circle(520, 35, 8).fill('#10b981');
    doc.circle(535, 45, 6).fill('#f59e0b');

    doc.moveDown(4);

    // Main title with enhanced styling
    doc.fontSize(22).fillColor('#1e293b').font('Helvetica-Bold').text('RAPPORT DE DEMANDE', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(13).fillColor('#64748b').text('Document Officiel de Validation & Suivi', { align: 'center' });

    // Status indicator
    const statusColor = requestStatus === 'approved' ? '#10b981' : requestStatus === 'rejected' ? '#ef4444' : '#f59e0b';
    doc.moveDown(1);
    doc.circle(300, doc.y, 8).fill(statusColor);
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold').text(requestStatus?.toUpperCase() || 'EN COURS', 285, doc.y - 5);

    doc.moveDown(2);

    // Request summary card
    addInfoCard(doc, '📋 INFORMATIONS PRINCIPALES', [
      ['Référence', request.reference],
      ['Processus', request.workflowType],
      ['Demandeur', user?.fullName || request?.creator?.fullName || request.createdBy],
      ['Date de création', request.createdAt ? new Date(request.createdAt).toLocaleString('fr-FR') : '-'],
      ['Statut final', requestStatus]
    ], '#f0f9ff', '#3b82f6');

    // Request details section
    addSectionHeader(doc, 'Détails de la demande', '#3b82f6', '📝');

    if (Object.keys(requestData).length === 0) {
      doc.fontSize(11).fillColor('#64748b').text('Aucune donnée spécifique saisie pour cette demande.', { align: 'center' });
    } else {
      // Create a table for request data
      const tableY = doc.y;
      doc.rect(40, tableY, doc.page.width - 80, 25).fill('#f8fafc');
      doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold').text('DONNÉES SAISIES', 50, tableY + 5);

      let dataY = tableY + 30;
      Object.entries(requestData).forEach(([key, value], index) => {
        const bgColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
        doc.rect(40, dataY, doc.page.width - 80, 20).fill(bgColor);
        doc.fillColor('#374151').fontSize(10).font('Helvetica-Bold').text(
          key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
          50, dataY + 5, { continued: true }
        );
        doc.fillColor('#1f2937').text(`: ${toDisplayText(value)}`);
        dataY += 20;
      });
      doc.y = dataY + 10;
    }

    // Validations section
    addSectionHeader(doc, 'Validations par département', '#10b981', '✅');

    const departments = Object.keys(validatorsByDepartment);
    if (departments.length === 0) {
      doc.fontSize(11).fillColor('#64748b').text('Aucune validation enregistrée pour cette demande.', { align: 'center' });
    } else {
      departments.forEach((department) => {
        doc.moveDown(0.5);
        doc.fontSize(13).fillColor('#1e293b').font('Helvetica-Bold').text(`🏢 ${department}:`);
        doc.moveDown(0.3);
        validatorsByDepartment[department].forEach((validator) => {
          doc.fontSize(10).fillColor('#059669').text(`✓ ${validator}`, { indent: 30 });
          doc.moveDown(0.2);
        });
      });
    }

    // History section with table
    addSectionHeader(doc, 'Historique complet', '#f59e0b', '📊');

    if (history.length === 0) {
      doc.fontSize(11).fillColor('#64748b').text('Aucun historique disponible.', { align: 'center' });
    } else {
      // Table header
      addTableRow(doc, ['Date & Heure', 'Étape', 'Action', 'Utilisateur'], doc.y, true);
      let tableY = doc.y + 20;

      history.forEach((entry, index) => {
        const actor = actorById[Number(entry?.actor)];
        const actorName = entry?.actorName || actor?.fullName || entry?.actor || 'Système';
        const timestamp = entry?.timestamp ? new Date(entry.timestamp).toLocaleString('fr-FR') : '-';

        addTableRow(doc, [
          timestamp,
          toDisplayText(entry?.stepName),
          toDisplayText(entry?.action),
          actorName
        ], tableY);

        tableY += 18;

        if (entry?.comment) {
          doc.rect(50, tableY, doc.page.width - 100, 20).fill('#fef3c7');
          doc.fillColor('#92400e').fontSize(9).text(`💬 ${entry.comment}`, 60, tableY + 5);
          tableY += 20;
        }
      });

      doc.y = tableY + 10;
    }

    // Workflow steps section
    addSectionHeader(doc, 'Étapes du workflow', '#8b5cf6', '🔄');

    const workflowSteps = Array.isArray(workflowDef?.steps) ? workflowDef.steps : [];
    if (!workflowSteps.length) {
      doc.fontSize(11).fillColor('#64748b').text('Aucune étape définie pour ce workflow.', { align: 'center' });
    } else {
      workflowSteps.forEach((step, idx) => {
        const stepBg = idx % 2 === 0 ? '#faf5ff' : '#f3e8ff';
        doc.rect(50, doc.y, doc.page.width - 100, 25).fill(stepBg);
        doc.fillColor('#6b21a8').fontSize(11).font('Helvetica-Bold').text(`${idx + 1}.`, 60, doc.y + 5, { continued: true });
        doc.fillColor('#1e1b4b').text(` ${toDisplayText(step?.name)}`, { continued: true });
        doc.fillColor('#7c3aed').text(` (${toDisplayText(step?.actorType)}:${toDisplayText(step?.actorValue)})`);
        doc.y += 25;
      });
    }

    // Enhanced footer with more professional styling
    const footerY = doc.page.height - 60;
    doc.rect(0, footerY, doc.page.width, 60).fill('#1e293b');

    doc.fillColor('#ffffff').fontSize(9).font('Helvetica').text('Document généré automatiquement par le système SOTACIB', 50, footerY + 10, { align: 'center' });
    doc.fontSize(8).fillColor('#cbd5e1').text(`Page 1/1 | Généré le ${new Date().toLocaleString('fr-FR')} | Référence: ${request.reference}`, 50, footerY + 25, { align: 'center' });

    // Decorative footer elements
    doc.fillColor('#3b82f6').fontSize(6).text('● ● ●', 50, footerY + 45, { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve(`/uploads/pdfs/${filename}`));
    stream.on('error', reject);
  });
};

module.exports = { generateRequestPDF };