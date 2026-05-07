const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { User } = require('../models');

const getSotacibLogoPath = () => path.join(__dirname, '../../../frontend/src/assets/sotacib-logo.jpg');
const getSecondaryLogoPath = () => path.join(__dirname, '../../../frontend/src/assets/logo.png');

const toDisplayText = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const addSectionHeader = (doc, title, color, icon = '') => {
  doc.moveDown(1.5);

  // Section background with solid color
  const sectionY = doc.y - 5;
  doc.rect(40, sectionY, doc.page.width - 80, 40).fillColor(color).fill();

  // Add subtle overlay
  doc.fillColor('black').opacity(0.1);
  doc.rect(40, sectionY + 20, doc.page.width - 80, 20).fill();
  doc.opacity(1);

  // Section title with enhanced styling
  doc.fillColor('white').fontSize(18).font('Helvetica-Bold');
  if (icon) doc.text(icon, 60, sectionY + 10);
  doc.text(` ${title.toUpperCase()}`, 85, sectionY + 12);

  // Add subtitle with different style
  doc.fontSize(10).fillColor('lightgray').font('Helvetica-Oblique');
  const subtitles = {
    'Détails de la demande': 'Informations spécifiques au processus',
    'Validations par département': 'Approbations et validations',
    'Historique complet': 'Chronologie des actions',
    'Étapes du workflow': 'Déroulement du processus'
  };
  if (subtitles[title]) {
    doc.text(subtitles[title], 85, sectionY + 25);
  }

  doc.moveDown(2.5);
};

const addInfoCard = (doc, title, fields, bgColor = [248, 250, 252], borderColor = [226, 232, 240]) => {
  const cardY = doc.y;
  const cardHeight = 30 + (fields.length * 20);

  // Enhanced card background with shadow effect
  doc.rect(45, cardY + 3, doc.page.width - 90, cardHeight).fillColor('black').opacity(0.15).fill();
  doc.opacity(1);
  doc.rect(40, cardY, doc.page.width - 80, cardHeight).fillColor(bgColor).strokeColor(borderColor).stroke();

  // Add subtle header
  doc.rect(40, cardY, doc.page.width - 80, 25).fillColor([241, 245, 249]).fill();

  // Enhanced title with multiple styles
  doc.fillColor([15, 23, 42]).fontSize(14).font('Helvetica-Bold').text(title, 55, cardY + 6);
  doc.fontSize(9).fillColor([100, 116, 139]).font('Helvetica-Oblique').text('Informations détaillées', 55, cardY + 18);

  // Enhanced fields with better typography
  let fieldY = cardY + 32;
  fields.forEach(([label, value], index) => {
    // Alternating background for fields
    if (index % 2 === 0) {
      doc.rect(50, fieldY - 2, doc.page.width - 100, 16).fillColor([248, 250, 252]).fill();
    }

    // Label with enhanced style
    doc.fontSize(10).fillColor([71, 85, 105]).font('Helvetica-Bold').text(`${label}:`, 55, fieldY, { continued: true });
    
    // Value with different style based on content
    const displayValue = toDisplayText(value);
    if (displayValue.length > 50) {
      doc.fontSize(9).fillColor([15, 23, 42]).font('Helvetica').text(` ${displayValue}`);
    } else {
      doc.fontSize(10).fillColor([30, 41, 59]).font('Helvetica').text(` ${displayValue}`);
    }
    
    fieldY += 18;
  });

  doc.y = cardY + cardHeight + 10;
};

const addTableRow = (doc, columns, y, isHeader = false) => {
  const colWidth = (doc.page.width - 100) / columns.length;
  let x = 50;

  columns.forEach((col, index) => {
    const cellWidth = index === 0 ? colWidth + 20 : colWidth - 5;

    if (isHeader) {
      // Enhanced header with solid color
      doc.rect(x, y, cellWidth, 22).fillColor([248, 250, 252]).fill();
      doc.rect(x, y, cellWidth, 22).strokeColor([203, 213, 225]).stroke();
      
      // Enhanced header text
      doc.fillColor([15, 23, 42]).fontSize(11).font('Helvetica-Bold').text(col, x + 6, y + 6);
    } else {
      // Enhanced cell with alternating colors
      const bgColor = index % 2 === 0 ? 'white' : [249, 250, 251];
      doc.rect(x, y, cellWidth, 20).fillColor(bgColor).fill();
      doc.rect(x, y, cellWidth, 20).strokeColor([229, 231, 235]).stroke();
      
      // Enhanced cell text with better typography
      const displayText = toDisplayText(col);
      if (displayText.length > 30) {
        doc.fillColor([55, 65, 81]).fontSize(8).font('Helvetica').text(displayText, x + 6, y + 6);
      } else {
        doc.fillColor([31, 41, 55]).fontSize(9).font('Helvetica').text(displayText, x + 6, y + 6);
      }
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

    // Get logo paths once at the beginning
    const sotacibLogoPath = getSotacibLogoPath();
    const secondaryLogoPath = getSecondaryLogoPath();

    const filename = `request_${request.reference}_${Date.now()}.pdf`;
    const filepath = path.join(__dirname, '../../uploads/pdfs', filename);
    if (!fs.existsSync(path.dirname(filepath))) fs.mkdirSync(path.dirname(filepath), { recursive: true });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Ultra-professional header with dual logos and solid colors
    doc.rect(0, 0, doc.page.width, 120).fillColor([15, 23, 42]).fill(); // #0f172a
    doc.rect(0, 100, doc.page.width, 20).fillColor([59, 130, 246]).fill(); // #3b82f6

    // Dual logo placement - SOTACIB logo on left, secondary logo on right
    
    // Left logo - SOTACIB main logo
    if (fs.existsSync(sotacibLogoPath)) {
      try {
        doc.image(sotacibLogoPath, 45, 20, { fit: [80, 80] });
      } catch (error) {
        console.log('Error loading SOTACIB logo:', error.message);
      }
    }
    
    // Right logo - Secondary logo
    if (fs.existsSync(secondaryLogoPath)) {
      try {
        doc.image(secondaryLogoPath, doc.page.width - 125, 20, { fit: [80, 80] });
      } catch (error) {
        console.log('Error loading secondary logo:', error.message);
      }
    }

    // Company information between logos
    doc.fillColor('white').fontSize(32).font('Helvetica-Bold').text('SOTACIB', 140, 35);
    doc.fontSize(16).fillColor('white').text('Société Tunisienne d\'Assurances et de Réassurances', 140, 60);
    doc.fontSize(12).fillColor('lightgray').font('Helvetica-Oblique').text('RÉCAPITULATIF PROFESSIONNEL DE DEMANDE', 140, 80);

    // Professional decorative elements
    doc.fillColor([59, 130, 246]).fill();
    doc.circle(140, 105, 3).fill();
    doc.circle(150, 105, 3).fill();
    doc.circle(160, 105, 3).fill();

    // Side accent lines
    doc.fillColor([59, 130, 246]);
    doc.rect(0, 0, 3, 120).fill();
    doc.rect(doc.page.width - 3, 0, 3, 120).fill();

    doc.moveDown(4);

    // Main title with enhanced styling and multiple font styles
    doc.fontSize(26).fillColor([15, 23, 42]).font('Helvetica-Bold').text('RAPPORT DE DEMANDE', { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(14).fillColor([59, 130, 246]).font('Helvetica-Oblique').text('Document Officiel de Validation & Suivi', { align: 'center' });
    doc.moveDown(0.1);
    doc.fontSize(11).fillColor([100, 116, 139]).font('Helvetica').text('Généré par le système de workflow SOTACIB', { align: 'center' });

    // Status indicator
    let statusColor;
    if (requestStatus === 'approved') statusColor = [16, 185, 129]; // #10b981
    else if (requestStatus === 'rejected') statusColor = [239, 68, 68]; // #ef4444
    else statusColor = [245, 158, 11]; // #f59e0b
    
    doc.moveDown(1);
    doc.circle(300, doc.y, 8).fillColor(statusColor).fill();
    doc.fillColor('white').fontSize(10).font('Helvetica-Bold').text(requestStatus?.toUpperCase() || 'EN COURS', 285, doc.y - 5);

    doc.moveDown(2);

    // Request summary card
    addInfoCard(doc, '📋 INFORMATIONS PRINCIPALES', [
      ['Référence', request.reference],
      ['Processus', request.workflowType],
      ['Demandeur', user?.fullName || request?.creator?.fullName || request.createdBy],
      ['Date de création', request.createdAt ? new Date(request.createdAt).toLocaleString('fr-FR') : '-'],
      ['Statut final', requestStatus]
    ], [240, 249, 255], [59, 130, 246]);

    // Request details section
    addSectionHeader(doc, 'Détails de la demande', [59, 130, 246], '📝');

    if (Object.keys(requestData).length === 0) {
      doc.fontSize(11).fillColor([100, 116, 139]).text('Aucune donnée spécifique saisie pour cette demande.', { align: 'center' });
    } else {
      // Enhanced table for request data with better typography
      const tableY = doc.y;
      doc.rect(40, tableY, doc.page.width - 80, 28).fillColor([241, 245, 249]).fill();
      doc.rect(40, tableY, doc.page.width - 80, 28).strokeColor([203, 213, 225]).stroke();
      
      doc.fillColor([15, 23, 42]).fontSize(14).font('Helvetica-Bold').text('📊 DONNÉES SAISIES', 50, tableY + 6);
      doc.fontSize(9).fillColor([100, 116, 139]).font('Helvetica-Oblique').text('Champs spécifiques au processus', 50, tableY + 17);

      let dataY = tableY + 32;
      Object.entries(requestData).forEach(([key, value], index) => {
        // Enhanced alternating background
        const bgColor = index % 2 === 0 ? 'white' : [248, 250, 252];
        doc.rect(40, dataY, doc.page.width - 80, 22).fillColor(bgColor).fill();
        doc.rect(40, dataY, doc.page.width - 80, 22).strokeColor([241, 245, 249]).stroke();
        
        // Enhanced label styling
        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        doc.fillColor([71, 85, 105]).fontSize(11).font('Helvetica-Bold').text(
          `${formattedKey}:`,
          50, dataY + 6, { continued: true }
        );
        
        // Enhanced value styling based on content
        const displayValue = toDisplayText(value);
        if (displayValue.length > 60) {
          doc.fontSize(9).fillColor([55, 65, 81]).font('Helvetica').text(` ${displayValue}`);
        } else {
          doc.fontSize(10).fillColor([30, 41, 59]).font('Helvetica').text(` ${displayValue}`);
        }
        
        dataY += 22;
      });
      doc.y = dataY + 15;
    }

    // Validations section
    addSectionHeader(doc, 'Validations par département', [16, 185, 129], '✅');

    const departments = Object.keys(validatorsByDepartment);
    if (departments.length === 0) {
      doc.fontSize(11).fillColor([100, 116, 139]).text('Aucune validation enregistrée pour cette demande.', { align: 'center' });
    } else {
      departments.forEach((department) => {
        doc.moveDown(0.5);
        // Enhanced department header
        doc.fontSize(14).fillColor([15, 23, 42]).font('Helvetica-Bold').text(`🏢 ${department}`, 50, doc.y);
        doc.fontSize(9).fillColor([100, 116, 139]).font('Helvetica-Oblique').text('Validateurs autorisés', 50, doc.y + 12);
        doc.moveDown(0.8);
        
        validatorsByDepartment[department].forEach((validator, index) => {
          // Enhanced validator styling with alternating background
          const bgColor = index % 2 === 0 ? 'white' : [240, 253, 244];
          doc.rect(60, doc.y - 2, doc.page.width - 120, 18).fillColor(bgColor).fill();
          doc.rect(60, doc.y - 2, doc.page.width - 120, 18).strokeColor([220, 252, 231]).stroke();
          
          doc.fontSize(11).fillColor([5, 150, 105]).font('Helvetica-Bold').text(`✓ ${validator}`, 65, doc.y + 3);
          doc.moveDown(0.5);
        });
      });
    }

    // History section with table
    addSectionHeader(doc, 'Historique complet', [245, 158, 11], '📊');

    if (history.length === 0) {
      doc.fontSize(11).fillColor([100, 116, 139]).text('Aucun historique disponible.', { align: 'center' });
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
          // Enhanced comment styling
          doc.rect(50, tableY, doc.page.width - 100, 24).fillColor([254, 243, 199]).fill();
          doc.rect(50, tableY, doc.page.width - 100, 24).strokeColor([245, 158, 11]).stroke();
          
          // Comment header
          doc.fillColor([146, 64, 14]).fontSize(10).font('Helvetica-Bold').text('💬 Commentaire:', 60, tableY + 4);
          // Comment text with better typography
          doc.fillColor([120, 53, 15]).fontSize(9).font('Helvetica').text(entry.comment, 60, tableY + 14);
          tableY += 24;
        }
      });

      doc.y = tableY + 10;
    }

    // Workflow steps section
    addSectionHeader(doc, 'Étapes du workflow', [139, 92, 246], '🔄');

    const workflowSteps = Array.isArray(workflowDef?.steps) ? workflowDef.steps : [];
    if (!workflowSteps.length) {
      doc.fontSize(11).fillColor([100, 116, 139]).text('Aucune étape définie pour ce workflow.', { align: 'center' });
    } else {
      workflowSteps.forEach((step, idx) => {
        // Enhanced step background with solid colors
        const stepBg = idx % 2 === 0 ? [250, 245, 255] : [243, 232, 255];
        doc.rect(50, doc.y, doc.page.width - 100, 30).fillColor(stepBg).fill();
        doc.rect(50, doc.y, doc.page.width - 100, 30).strokeColor([233, 213, 255]).stroke();
        
        // Step number with enhanced styling
        doc.fillColor([107, 33, 168]).fontSize(14).font('Helvetica-Bold').text(`${idx + 1}.`, 60, doc.y + 8);
        
        // Step name with better typography
        const stepName = toDisplayText(step?.name);
        doc.fillColor([30, 27, 75]).fontSize(12).font('Helvetica-Bold').text(` ${stepName}`, 85, doc.y + 8);
        
        // Actor info with different style
        const actorInfo = `(${toDisplayText(step?.actorType)}:${toDisplayText(step?.actorValue)})`;
        doc.fillColor([124, 58, 237]).fontSize(9).font('Helvetica-Oblique').text(actorInfo, 85, doc.y + 20);
        
        doc.y += 30;
      });
    }

    // Ultra-professional footer with dual logos and enhanced styling
    const footerY = doc.page.height - 80;
    
    // Footer background with solid colors
    doc.rect(0, footerY, doc.page.width, 80).fillColor([30, 41, 59]).fill();

    // Footer accent bar
    doc.rect(0, footerY, doc.page.width, 3).fillColor([59, 130, 246]).fill();

    // Small logos in footer
    
    // Left small logo
    if (fs.existsSync(sotacibLogoPath)) {
      try {
        doc.image(sotacibLogoPath, 50, footerY + 35, { fit: [40, 40] });
      } catch (error) {
        console.log('Error loading footer SOTACIB logo:', error.message);
      }
    }
    
    // Right small logo
    if (fs.existsSync(secondaryLogoPath)) {
      try {
        doc.image(secondaryLogoPath, doc.page.width - 90, footerY + 35, { fit: [40, 40] });
      } catch (error) {
        console.log('Error loading footer secondary logo:', error.message);
      }
    }

    // Footer text content
    doc.fillColor('white').fontSize(10).font('Helvetica-Bold').text('SOTACIB', doc.page.width / 2, footerY + 15, { align: 'center' });
    doc.fontSize(8).fillColor('lightgray').font('Helvetica').text('Société Tunisienne d\'Assurances et de Réassurances', doc.page.width / 2, footerY + 28, { align: 'center' });
    doc.fontSize(7).fillColor([148, 163, 184]).text('Document généré automatiquement par le système de workflow', doc.page.width / 2, footerY + 40, { align: 'center' });
    doc.fontSize(6).fillColor([100, 116, 139]).text(`Généré le ${new Date().toLocaleString('fr-FR')} | Référence: ${request.reference} | Page 1/1`, doc.page.width / 2, footerY + 52, { align: 'center' });

    // Professional footer decorative elements
    doc.fillColor([59, 130, 246]).opacity(0.5);
    doc.rect(100, footerY + 65, doc.page.width - 200, 1).fill();
    doc.opacity(1);
    
    // Small decorative circles
    doc.fillColor([59, 130, 246]).opacity(0.3);
    doc.circle(doc.page.width / 2 - 20, footerY + 67, 2).fill();
    doc.circle(doc.page.width / 2, footerY + 67, 2).fill();
    doc.circle(doc.page.width / 2 + 20, footerY + 67, 2).fill();
    doc.opacity(1);

    // Side accent lines for footer
    doc.fillColor([59, 130, 246]);
    doc.rect(0, footerY, 3, 80).fill();
    doc.rect(doc.page.width - 3, footerY, 3, 80).fill();

    doc.end();

    stream.on('finish', () => resolve(`/uploads/pdfs/${filename}`));
    stream.on('error', reject);
  });
};

module.exports = { generateRequestPDF };