/**
 * email.service.ts
 * Transactional email via Resend. All sends are queued asynchronously so API
 * responses never wait on email delivery.
 *
 * Falls back to a no-op if RESEND_API_KEY is absent.
 */
import { Resend } from 'resend';
import { env, resendEnabled } from '../../config/env.js';

let resend: Resend | null = null;

if (resendEnabled) {
  resend = new Resend(env.RESEND_API_KEY);
}

const FROM_ADDRESS = env.EMAIL_FROM || `noreply@${env.COLLEGE_EMAIL_DOMAIN}`;

// ── Fire-and-forget queue ─────────────────────────────────────────────────────

const queue = (fn: () => Promise<void>): void => {
  fn().catch((err) => {
    console.error('[email] Send failed:', (err as Error).message);
  });
};

// ── HTML template helpers ─────────────────────────────────────────────────────

const baseTemplate = (title: string, bodyHtml: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; }
    .wrapper { max-width: 560px; margin: 0 auto; padding: 40px 24px; }
    .logo { font-size: 18px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 32px; }
    .logo span { color: #2563eb; }
    h1 { font-size: 22px; font-weight: 600; margin: 0 0 12px; }
    p { font-size: 15px; line-height: 1.6; color: #444; margin: 0 0 16px; }
    .otp { font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #111; border: 1px solid #e5e7eb; padding: 16px 24px; display: inline-block; margin: 16px 0; }
    .note { font-size: 13px; color: #888; }
    .divider { border: none; border-top: 1px solid #f3f4f6; margin: 32px 0; }
    .footer { font-size: 12px; color: #aaa; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo">Camp<span>Exchange</span></div>
    ${bodyHtml}
    <hr class="divider" />
    <p class="footer">Camp-Exchange · Your campus marketplace. Do not share this email with anyone.</p>
  </div>
</body>
</html>
`;

// ── Email senders ─────────────────────────────────────────────────────────────

/** OTP verification email sent on registration */
export const sendOtpEmail = async (to: string, name: string, code: string): Promise<void> => {
  if (!resend) return; // no-op fallback

  const html = baseTemplate(
    'Verify your Camp-Exchange account',
    `
    <h1>Verify your email</h1>
    <p>Hi ${name},</p>
    <p>Enter this code in the app to verify your college email address:</p>
    <div class="otp">${code}</div>
    <p class="note">This code expires in 10 minutes. You can request a new one after 60 seconds.<br>If you did not create an account, ignore this email.</p>
    `
  );

  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `${code} – Your Camp-Exchange verification code`,
    html,
  });
};

/** Notifies seller when a payment proof arrives */
export const sendProofReceivedEmail = async (
  to: string,
  sellerName: string,
  itemTitle: string,
  amount: number,
  orderId: string
): Promise<void> => {
  if (!resend) return;

  queue(async () => {
    const html = baseTemplate(
      'Payment proof received',
      `
      <h1>Payment proof received</h1>
      <p>Hi ${sellerName},</p>
      <p>A buyer has uploaded payment proof for your listing <strong>${itemTitle}</strong> (₹${amount}).</p>
      <p>Log in to Camp-Exchange to review and confirm or reject the payment.</p>
      <p class="note">Order reference: ${orderId}</p>
      `
    );
    await resend!.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: `Payment proof received for "${itemTitle}"`,
      html,
    });
  });
};

/** Notifies buyer when seller confirms order */
export const sendOrderConfirmedEmail = async (
  to: string,
  buyerName: string,
  itemTitle: string,
  amount: number
): Promise<void> => {
  if (!resend) return;

  queue(async () => {
    const html = baseTemplate(
      'Order confirmed',
      `
      <h1>Order confirmed</h1>
      <p>Hi ${buyerName},</p>
      <p>The seller has confirmed your payment for <strong>${itemTitle}</strong> (₹${amount}).</p>
      <p>Please meet on campus to collect the item. Always inspect before accepting.</p>
      `
    );
    await resend!.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: `Order confirmed – "${itemTitle}"`,
      html,
    });
  });
};

/** Notifies buyer when seller rejects payment proof */
export const sendOrderRejectedEmail = async (
  to: string,
  buyerName: string,
  itemTitle: string,
  reason: string
): Promise<void> => {
  if (!resend) return;

  queue(async () => {
    const html = baseTemplate(
      'Payment proof not accepted',
      `
      <h1>Payment proof not accepted</h1>
      <p>Hi ${buyerName},</p>
      <p>The seller could not accept your payment proof for <strong>${itemTitle}</strong>.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>Please contact the seller via chat or try again with a valid screenshot.</p>
      `
    );
    await resend!.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: `Payment proof rejected – "${itemTitle}"`,
      html,
    });
  });
};

// ── Chat notification (throttled: max 1 per conversation per 15 min) ──────────

const chatNotifThrottle = new Map<string, number>(); // conversationId → timestamp

export const sendChatNotificationEmail = async (
  to: string,
  recipientName: string,
  senderName: string,
  itemTitle: string,
  conversationId: string,
  previewText: string
): Promise<void> => {
  if (!resend) return;

  const last = chatNotifThrottle.get(conversationId) ?? 0;
  const cooldownMs = 15 * 60 * 1000; // 15 minutes
  if (Date.now() - last < cooldownMs) return;

  chatNotifThrottle.set(conversationId, Date.now());

  queue(async () => {
    const html = baseTemplate(
      'New message on Camp-Exchange',
      `
      <h1>New message</h1>
      <p>Hi ${recipientName},</p>
      <p><strong>${senderName}</strong> sent you a message about <strong>${itemTitle}</strong>:</p>
      <p style="border-left:3px solid #e5e7eb; padding-left:12px; color:#555;">${previewText.slice(0, 200)}</p>
      <p>Log in to Camp-Exchange to reply.</p>
      `
    );
    await resend!.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: `New message from ${senderName} – Camp-Exchange`,
      html,
    });
  });
};
