const nodemailer = require('nodemailer');

let transporter = null;

const initTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }
  return transporter;
};

const sendEmail = async (to, subject, html) => {
  try {
    const transporter = initTransporter();
    await transporter.sendMail({ from: `"SOTACIB Workflow" <${process.env.EMAIL_USER}>`, to, subject, html });
    console.log(`📧 Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
};

const sendPendingActivation = async (email, adminEmail) => {
  const html = `<h2>Nouvelle inscription en attente</h2><p>Utilisateur ${email} s'est inscrit.</p><a href="${process.env.FRONTEND_URL}/admin/users">Gérer</a>`;
  return sendEmail(adminEmail, 'Nouvelle inscription - SOTACIB', html);
};

const sendAccountActivated = async (email, fullName) => {
  const html = `<h2>Bienvenue ${fullName}</h2><p>Votre compte a été activé.</p><a href="${process.env.FRONTEND_URL}/login">Se connecter</a>`;
  return sendEmail(email, 'Compte activé - SOTACIB', html);
};

const sendStepNotification = async (email, requestRef, stepName, actionUrl, note = '') => {
  const noteBlock = note ? `<p><strong>Note précédente:</strong> ${note}</p>` : '';
  const html = `<h2>Action requise</h2><p>Demande ${requestRef} en attente de ${stepName}.</p>${noteBlock}<a href="${actionUrl}">Voir</a>`;
  return sendEmail(email, `Action requise - ${requestRef}`, html);
};

const sendRejection = async (email, requestRef, reason) => {
  const html = `<h2>Demande refusée</h2><p>${requestRef} refusée. Motif : ${reason}</p>`;
  return sendEmail(email, `Demande ${requestRef} refusée`, html);
};

const sendFinalPDF = async (email, requestRef, pdfBuffer) => {
  const html = `<h2>Demande finalisée</h2><p>${requestRef} terminée. PDF disponible dans votre espace.</p>`;
  return sendEmail(email, `Demande ${requestRef} finalisée`, html);
};

module.exports = { sendEmail, sendPendingActivation, sendAccountActivated, sendStepNotification, sendRejection, sendFinalPDF };