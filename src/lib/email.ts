import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  if (process.env.NODE_ENV === "development" && !process.env.SMTP_USER) {
    console.log("[EMAIL MOCK]", { to, subject });
    return { success: true, mock: true };
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || "Clubsy <noreply@clubsy.app>",
      to,
      subject,
      html,
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email send error:", error);
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
