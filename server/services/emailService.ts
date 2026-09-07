import { DataStore } from '../models/index.js';

export interface EmailPayload {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  type?: 'verification' | 'password_reset' | 'order_confirmation' | 'low_stock_alert' | 'general';
  metadata?: Record<string, any>;
}

export async function sendEmailNotification(payload: EmailPayload): Promise<{ success: boolean; id: string }> {
  const emailId = `eml_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const db = DataStore.getData();

  const newEmail = {
    id: emailId,
    to: payload.to,
    subject: payload.subject,
    content: payload.text || payload.html || '',
    type: (payload.type || 'general') as any,
    metadata: payload.metadata || {},
    createdAt: new Date().toISOString(),
  };

  db.emails.unshift(newEmail);
  DataStore.saveToDisk();

  console.log(`✉️ [EmailService] Dispatched to <${payload.to}>: "${payload.subject}"`);

  return { success: true, id: emailId };
}
