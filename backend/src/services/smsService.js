const twilio = require('twilio');

let client = null;

const initClient = () => {
  if (client) return client;
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.warn('Twilio is not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
    return null;
  }
  client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  return client;
};

const isTwilioConfigured = () => {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER
  );
};

const sendSMS = async (to, body) => {
  if (!isTwilioConfigured()) {
    console.warn('Twilio SMS skipped because configuration is incomplete.');
    return false;
  }
  if (!to) {
    console.warn('Twilio SMS skipped because recipient phone number is missing.');
    return false;
  }

  try {
    const client = initClient();
    if (!client) return false;
    await client.messages.create({
      body,
      from: process.env.TWILIO_FROM_NUMBER,
      to,
    });
    console.log(`📱 SMS sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Twilio SMS error:', error);
    return false;
  }
};

const sendStepNotification = async (to, requestRef, stepName, note = '') => {
  const noteText = note ? ` Note: ${note}` : '';
  const body = `Demande ${requestRef} en attente de ${stepName}.${noteText}`;
  return sendSMS(to, body);
};

const sendRejection = async (to, requestRef, reason) => {
  const body = `Votre demande ${requestRef} a été refusée. Motif : ${reason}`;
  return sendSMS(to, body);
};

const sendFinalNotification = async (to, requestRef) => {
  const body = `Votre demande ${requestRef} a été approuvée.`;
  return sendSMS(to, body);
};

module.exports = {
  sendSMS,
  sendStepNotification,
  sendRejection,
  sendFinalNotification,
};
