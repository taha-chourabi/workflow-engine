const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { User } = require('../models');

const toDisplayText = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const addSectionTitle = (doc, title) => {
  doc.moveDown();
  doc.fontSize(12).fillColor('#111827').text(title, { underline: true });
  doc.moveDown(0.3);
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
    const doc = new PDFDocument({ margin: 50 });
    const filename = `request_${request.reference}_${Date.now()}.pdf`;
    const filepath = path.join(__dirname, '../../uploads/pdfs', filename);
    if (!fs.existsSync(path.dirname(filepath))) fs.mkdirSync(path.dirname(filepath), { recursive: true });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    doc.fontSize(20).fillColor('#0f172a').text('SOTACIB', { align: 'center' });
    doc.fontSize(14).fillColor('#111827').text('Récapitulatif de la demande', { align: 'center' });
    doc.moveDown(1.2);

    doc.fontSize(10).fillColor('#111827').text(`Référence: ${toDisplayText(request.reference)}`);
    doc.text(`Processus: ${toDisplayText(request.workflowType)}`);
    doc.text(`Demandeur: ${toDisplayText(user?.fullName || request?.creator?.fullName || request.createdBy)}`);
    doc.text(`Date de création: ${request.createdAt ? new Date(request.createdAt).toLocaleString() : '-'}`);
    doc.text(`Statut final: ${toDisplayText(requestStatus)}`);

    addSectionTitle(doc, 'Détails de la demande');
    doc.fontSize(10).fillColor('#111827');
    Object.entries(requestData).forEach(([key, value]) => {
      doc.text(`${key}: ${toDisplayText(value)}`);
    });

    addSectionTitle(doc, 'Validations par département');
    doc.fontSize(10).fillColor('#111827');
    const departments = Object.keys(validatorsByDepartment);
    if (departments.length === 0) {
      doc.text('Aucune validation enregistrée.');
    } else {
      departments.forEach((department) => {
        doc.font('Helvetica-Bold').text(`${department}:`);
        doc.font('Helvetica');
        validatorsByDepartment[department].forEach((validator) => {
          doc.text(`- ${validator}`);
        });
        doc.moveDown(0.2);
      });
    }

    addSectionTitle(doc, 'Historique complet');
    doc.fontSize(10).fillColor('#111827');
    history.forEach((entry) => {
      const actor = actorById[Number(entry?.actor)];
      const actorName = entry?.actorName || actor?.fullName || entry?.actor || 'Système';
      const actorDept = actor?.department ? ` (${actor.department})` : '';
      const timestamp = entry?.timestamp ? new Date(entry.timestamp).toLocaleString() : '-';
      doc.text(`${timestamp} - ${toDisplayText(entry?.stepName)} - ${toDisplayText(entry?.action)} par ${actorName}${actorDept}`);
      if (entry?.comment) {
        doc.fillColor('#374151').text(`  Note: ${entry.comment}`);
        doc.fillColor('#111827');
      }
    });

    addSectionTitle(doc, 'Étapes du workflow');
    const workflowSteps = Array.isArray(workflowDef?.steps) ? workflowDef.steps : [];
    if (!workflowSteps.length) {
      doc.fontSize(10).text('Aucune étape définie.');
    } else {
      workflowSteps.forEach((step, idx) => {
        doc.fontSize(10).text(`${idx + 1}. ${toDisplayText(step?.name)} (${toDisplayText(step?.actorType)}:${toDisplayText(step?.actorValue)})`);
      });
    }

    doc.end();

    stream.on('finish', () => resolve(`/uploads/pdfs/${filename}`));
    stream.on('error', reject);
  });
};

module.exports = { generateRequestPDF };