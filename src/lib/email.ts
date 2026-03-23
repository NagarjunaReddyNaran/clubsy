import nodemailer from "nodemailer";
import { logger } from "./logger";

// Lazy singleton — avoids connecting at module load time when SMTP isn't configured
let _transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (_transporter) return _transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  _transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT ?? "587"),
    secure: parseInt(SMTP_PORT ?? "587") === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return _transporter;
}

const FROM = process.env.SMTP_FROM ?? "Clubsy <noreply@clubsy.app>";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  const transporter = getTransporter();
  if (!transporter) {
    logger.warn("Email skipped — SMTP not configured", { to, subject });
    return { success: false, reason: "smtp_not_configured" };
  }
  try {
    const info = await transporter.sendMail({ from: FROM, to, subject, html });
    logger.info("Email sent", { to, subject, messageId: info.messageId });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error("Email send failed", { error, to, subject });
    return { success: false, error };
  }
}

export function getMembershipApprovedEmail(
  playerName: string,
  planName: string,
  endDate: string
) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2563eb; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Clubsy</h1>
      </div>
      <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #111827;">Membership Confirmed!</h2>
        <p style="color: #6b7280;">Hi ${playerName},</p>
        <p style="color: #6b7280;">Your <strong>${planName}</strong> membership has been activated.</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; color: #374151;">
            <strong>Valid until:</strong> ${endDate}
          </p>
        </div>
        <p style="color: #6b7280;">Visit the club and enjoy your membership benefits!</p>
        <a href="${process.env.NEXTAUTH_URL}/dashboard"
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          View Dashboard
        </a>
      </div>
    </div>
  `;
}

export function getExtensionReviewedEmail(
  playerName: string,
  approved: boolean,
  days: number,
  reviewNote?: string | null
) {
  const status = approved ? "Approved" : "Rejected";
  const color = approved ? "#16a34a" : "#dc2626";

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2563eb; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Clubsy</h1>
      </div>
      <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: ${color};">Extension Request ${status}</h2>
        <p style="color: #6b7280;">Hi ${playerName},</p>
        <p style="color: #6b7280;">
          Your request to extend your membership by <strong>${days} days</strong> has been
          <strong style="color: ${color};">${status.toLowerCase()}</strong>.
        </p>
        ${reviewNote ? `<p style="color: #6b7280; font-style: italic;">Note: ${reviewNote}</p>` : ""}
        <a href="${process.env.NEXTAUTH_URL}/dashboard/membership"
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          View Membership
        </a>
      </div>
    </div>
  `;
}

export function getMembershipExpiryReminderEmail(
  playerName: string,
  planName: string,
  daysLeft: number
) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2563eb; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Clubsy</h1>
      </div>
      <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #d97706;">Membership Expiring Soon</h2>
        <p style="color: #6b7280;">Hi ${playerName},</p>
        <p style="color: #6b7280;">
          Your <strong>${planName}</strong> membership expires in
          <strong style="color: #d97706;">${daysLeft} day${daysLeft !== 1 ? "s" : ""}</strong>.
        </p>
        <p style="color: #6b7280;">Renew now to continue enjoying club benefits without interruption.</p>
        <a href="${process.env.NEXTAUTH_URL}/dashboard/plans"
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          Renew Membership
        </a>
      </div>
    </div>
  `;
}
