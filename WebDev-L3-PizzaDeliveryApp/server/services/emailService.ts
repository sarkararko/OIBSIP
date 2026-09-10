import nodemailer from 'nodemailer';
import { DataStore } from '../models/index.js';

export interface EmailPayload {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  content?: string;
  type?: 'verification' | 'password_reset' | 'order_confirmation' | 'low_stock_alert' | 'general';
  metadata?: Record<string, any>;
}

export interface SmtpConfigInfo {
  isConfigured: boolean;
  host: string;
  port: number;
  secure: boolean;
  userConfigured: boolean;
  fromAddress: string;
}

/**
 * Reads and returns sanitized SMTP configuration info without exposing passwords.
 */
export function getSmtpConfigInfo(): SmtpConfigInfo {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 465;
  const isSecure =
    process.env.SMTP_SECURE === 'true' ||
    process.env.SMTP_SECURE === '1' ||
    port === 465;
  const user = process.env.SMTP_USER || '';
  const from = process.env.EMAIL_FROM || (user ? `PizzaCraft <${user}>` : 'PizzaCraft <noreply@pizzacraft.com>');

  return {
    isConfigured: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
    host,
    port,
    secure: isSecure,
    userConfigured: Boolean(process.env.SMTP_USER),
    fromAddress: from,
  };
}

/**
 * Creates and returns an initialized Nodemailer SMTP transporter.
 * Throws an error if required credentials are not configured.
 */
export function createMailTransporter(): ReturnType<typeof nodemailer.createTransport> {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 465;
  const isSecure =
    process.env.SMTP_SECURE === 'true' ||
    process.env.SMTP_SECURE === '1' ||
    port === 465;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (!user || !pass) {
    throw new Error(
      'SMTP credentials are missing. Please configure SMTP_USER and SMTP_PASS (Gmail App Password) in your environment variables.'
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: isSecure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

/**
 * Sends a real PizzaCraft verification email containing a 6-digit OTP.
 */
export async function sendVerificationEmail(
  to: string,
  name: string,
  otp: string
): Promise<{ success: boolean; messageId: string }> {
  const transporter = createMailTransporter();
  const fromAddress =
    process.env.EMAIL_FROM ||
    (process.env.SMTP_USER ? `PizzaCraft <${process.env.SMTP_USER}>` : 'PizzaCraft <noreply@pizzacraft.com>');

  const subject = 'PizzaCraft Email Verification';
  const formattedName = name?.trim() || 'Foodie';

  const textBody = `Hello ${formattedName},

Thank you for registering with PizzaCraft!

Your PizzaCraft verification code is: ${otp}

- The code expires in 10 minutes.
- Do not share the code with anyone.

If you did not request this registration, please safely ignore this email.

Best regards,
PizzaCraft Artisanal Stone-Fired Kitchen`;

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PizzaCraft Email Verification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f172a; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #1e293b; border-radius: 20px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #ea580c 50%, #f59e0b 100%); padding: 32px 24px; text-align: center;">
              <div style="font-size: 38px; line-height: 1; margin-bottom: 8px;">🍕</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">PizzaCraft</h1>
              <p style="margin: 6px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 13px; font-weight: 500;">Artisanal Stone-Fired Kitchen</p>
            </td>
          </tr>
          
          <!-- Content Body -->
          <tr>
            <td style="padding: 32px 28px;">
              <h2 style="margin: 0 0 12px 0; color: #f8fafc; font-size: 20px; font-weight: 700;">Verify Your Email Address</h2>
              <p style="margin: 0 0 24px 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                Welcome to PizzaCraft, <strong style="color: #f1f5f9;">${formattedName}</strong>! Please enter the 6-digit verification code below to verify your account and activate your profile:
              </p>

              <!-- OTP Code Display Card -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td align="center" style="background-color: #090d16; border: 2px dashed #f59e0b; border-radius: 14px; padding: 22px 16px;">
                    <div style="font-size: 12px; font-weight: 700; color: #fbbf24; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                      Verification Code
                    </div>
                    <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; color: #ffffff; letter-spacing: 8px;">
                      ${otp}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Expiry and Security Notice -->
              <div style="background-color: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; padding: 12px 14px; border-radius: 6px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; color: #fbbf24; line-height: 1.5;">
                  ⏱ <strong>The code expires in 10 minutes.</strong><br/>
                  🔒 <strong>Do not share the code with anyone.</strong> PizzaCraft will never ask for your code over the phone or chat.
                </p>
              </div>

              <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.5;">
                If you did not attempt to register an account on PizzaCraft, you can safely ignore this email. No account will be activated without this verification.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 28px; background-color: #0f172a; border-top: 1px solid #334155; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 11px;">
                PizzaCraft Artisanal Bar & Live Kitchen • All rights reserved 2026<br/>
                Automated notification sent to: ${to}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text: textBody,
      html: htmlBody,
    });

    console.log(`✅ [EmailService] Verification OTP successfully dispatched to <${to}> via SMTP. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`❌ [EmailService] Failed to send verification email to <${to}>:`, err?.message || err);
    throw new Error('Unable to send verification email. Please try again.');
  }
}

/**
 * Sends a real PizzaCraft password reset email containing a 6-digit code or reset token.
 */
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetCodeOrToken: string
): Promise<{ success: boolean; messageId: string }> {
  const transporter = createMailTransporter();
  const fromAddress =
    process.env.EMAIL_FROM ||
    (process.env.SMTP_USER ? `PizzaCraft <${process.env.SMTP_USER}>` : 'PizzaCraft <noreply@pizzacraft.com>');

  const subject = 'PizzaCraft Password Reset';
  const formattedName = name?.trim() || 'Foodie';

  const textBody = `Hello ${formattedName},

We received a request to reset your PizzaCraft account password.

Your PizzaCraft password reset code is: ${resetCodeOrToken}

- The code expires in 10 minutes.
- Do not share the code with anyone.

If you did not request a password reset, you can safely ignore this message. Your account remains secure.

Best regards,
PizzaCraft Artisanal Stone-Fired Kitchen`;

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PizzaCraft Password Reset</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f172a; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #1e293b; border-radius: 20px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #ea580c 50%, #f59e0b 100%); padding: 32px 24px; text-align: center;">
              <div style="font-size: 38px; line-height: 1; margin-bottom: 8px;">🍕</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800;">PizzaCraft</h1>
              <p style="margin: 6px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 13px;">Security & Password Recovery</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 28px;">
              <h2 style="margin: 0 0 12px 0; color: #f8fafc; font-size: 20px; font-weight: 700;">Password Reset Request</h2>
              <p style="margin: 0 0 24px 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                Hello <strong style="color: #f1f5f9;">${formattedName}</strong>, we received a request to reset your password. Use the verification code below:
              </p>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td align="center" style="background-color: #090d16; border: 2px dashed #38bdf8; border-radius: 14px; padding: 22px 16px;">
                    <div style="font-size: 12px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                      Reset Code
                    </div>
                    <div style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; color: #ffffff; letter-spacing: 6px;">
                      ${resetCodeOrToken}
                    </div>
                  </td>
                </tr>
              </table>

              <div style="background-color: rgba(56, 189, 248, 0.1); border-left: 4px solid #38bdf8; padding: 12px 14px; border-radius: 6px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; color: #38bdf8; line-height: 1.5;">
                  ⏱ <strong>The code expires in 10 minutes.</strong><br/>
                  🔒 <strong>Do not share the code with anyone.</strong>
                </p>
              </div>

              <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.5;">
                If you did not request a password reset, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 28px; background-color: #0f172a; border-top: 1px solid #334155; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 11px;">
                PizzaCraft Artisanal Bar & Live Kitchen • All rights reserved 2026<br/>
                Sent to: ${to}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text: textBody,
      html: htmlBody,
    });

    console.log(`✅ [EmailService] Password reset code successfully sent to <${to}> via SMTP. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`❌ [EmailService] Failed to send password reset email to <${to}>:`, err?.message || err);
    throw new Error('Unable to send password reset email. Please try again.');
  }
}

/**
 * General email notification dispatcher (used for order confirmation and inventory low-stock alerts).
 * Attempts real SMTP dispatch if configured.
 */
export async function sendEmailNotification(
  payload: EmailPayload
): Promise<{ success: boolean; id: string }> {
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

  // If SMTP is configured, also deliver through SMTP
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = createMailTransporter();
      const fromAddress =
        process.env.EMAIL_FROM ||
        `PizzaCraft <${process.env.SMTP_USER}>`;

      await transporter.sendMail({
        from: fromAddress,
        to: payload.to,
        subject: payload.subject,
        text: payload.text || payload.content || '',
        html: payload.html,
      });
      console.log(`✉️ [EmailService] Real SMTP delivered to <${payload.to}>: "${payload.subject}"`);
    } catch (err: any) {
      console.warn(`⚠️ [EmailService] Real SMTP delivery skipped for notification: ${err?.message || err}`);
    }
  } else {
    console.log(`✉️ [EmailService] Recorded notification for <${payload.to}>: "${payload.subject}"`);
  }

  return { success: true, id: emailId };
}

