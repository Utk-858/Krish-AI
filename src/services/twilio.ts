
'use server';

import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhoneNumber) {
    console.warn("Twilio credentials are not fully set in .env file. WhatsApp notifications will be disabled.");
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  if (!client || !twilioPhoneNumber) {
    console.log(`Twilio not configured. Mock sending message to ${to}: "${body}"`);
    return;
  }

  try {
    await client.messages.create({
      from: twilioPhoneNumber,
      to: `whatsapp:${to}`,
      body: body,
    });
    console.log(`WhatsApp message sent to ${to}`);
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error);
    // In a real app, you might want more robust error handling,
    // like notifying an admin or retrying.
    throw new Error('Twilio message sending failed.');
  }
}
