import { Resend } from 'resend';
import { DataStore } from '../models/index.js';

let resendClient: Resend | null = null;

/**
 * Returns an initialized Resend API client using the environment API key.
 * Throws a clear error if RESEND_API_KEY is not configured.
 */
export function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'RESEND_API_KEY is missing. Please configure RESEND_API_KEY in your environment variables.'
    );
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

/**
 * Resolves the configured sender email address.
 * Falls back to the Resend testing sender (onboarding@resend.dev) if EMAIL_FROM is not explicitly defined.
 */
export function getSenderEmail(): string {
  return process.env.EMAIL_FROM?.trim() || 'PizzaCraft <onboarding@resend.dev>';
}

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
 * Reads and returns email delivery configuration info.
 * Maintained for backward compatibility.
 */
export function getSmtpConfigInfo(): SmtpConfigInfo {
  const isConfigured = Boolean(process.env.RESEND_API_KEY?.trim());
  const from = getSenderEmail();

  return {
    isConfigured,
    host: 'api.resend.com',
    port: 443,
    secure: true,
    userConfigured: isConfigured,
    fromAddress: from,
  };
}

/**
 * Sends a real PizzaCraft verification email containing a 6-digit OTP using the Resend Email API.
 */
export async function sendVerificationEmail(
  to: string,
  name: string,
  otp: string
): Promise<{ success: boolean; messageId: string }> {
  const resend = getResendClient();
  const fromAddress = process.env.EMAIL_FROM?.trim() || getSenderEmail();

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
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [to],
      subject,
      html: htmlBody,
      text: textBody,
    });

    if (error) {
      console.error(`❌ [EmailService] Resend API error dispatching verification email to <${to}>:`, error);
      throw new Error(`Unable to send verification email: ${error.message || 'Resend error'}`);
    }

    const messageId = data?.id || '';
    console.log(`✅ [EmailService] Verification OTP successfully dispatched to <${to}> via Resend API. Email ID: ${messageId}`);
    return { success: true, messageId };
  } catch (err: any) {
    console.error(`❌ [EmailService] Failed to send verification email to <${to}>:`, err?.message || err);
    throw new Error('Unable to send verification email. Please try again.');
  }
}

/**
 * Sends a real PizzaCraft password reset email containing a 6-digit code or reset token using the Resend Email API.
 */
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetCodeOrToken: string
): Promise<{ success: boolean; messageId: string }> {
  const resend = getResendClient();
  const fromAddress = getSenderEmail();

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
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [to],
      subject,
      html: htmlBody,
      text: textBody,
    });

    if (error) {
      console.error(`❌ [EmailService] Resend API error dispatching password reset email to <${to}>:`, error);
      throw new Error(`Unable to send password reset email: ${error.message || 'Resend error'}`);
    }

    const messageId = data?.id || '';
    console.log(`✅ [EmailService] Password reset code successfully sent to <${to}> via Resend API. Email ID: ${messageId}`);
    return { success: true, messageId };
  } catch (err: any) {
    console.error(`❌ [EmailService] Failed to send password reset email to <${to}>:`, err?.message || err);
    throw new Error('Unable to send password reset email. Please try again.');
  }
}

/**
 * General email notification dispatcher (used for order confirmation and inventory low-stock alerts).
 * Delivers via Resend API when RESEND_API_KEY is configured.
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

  // If RESEND_API_KEY is configured, also deliver through Resend API
  if (process.env.RESEND_API_KEY?.trim()) {
    try {
      const resend = getResendClient();
      const fromAddress = getSenderEmail();

      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: [payload.to],
        subject: payload.subject,
        text: payload.text || payload.content || '',
        html: payload.html,
      });

      if (error) {
        console.warn(`⚠️ [EmailService] Resend API returned error for notification to <${payload.to}>: ${error.message}`);
      } else {
        console.log(`✉️ [EmailService] Real notification email delivered to <${payload.to}> via Resend. Resend ID: ${data?.id}`);
      }
    } catch (err: any) {
      console.warn(`⚠️ [EmailService] Resend delivery skipped for notification: ${err?.message || err}`);
    }
  } else {
    console.log(`✉️ [EmailService] Recorded notification for <${payload.to}>: "${payload.subject}" (RESEND_API_KEY not configured)`);
  }

  return { success: true, id: emailId };
}

