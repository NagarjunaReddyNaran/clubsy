import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { ContactSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

const SUBJECT_LABELS: Record<string, string> = {
  general: "General Inquiry",
  support: "Support",
  billing: "Billing",
};

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const limit = await rateLimit(`contact:${ip}`, 3, 60_000);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute before trying again." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, email, subject, message } = parsed.data;

  try {
    await prisma.contactSubmission.create({
      data: { name, email, subject, message },
    });

    // Notify admin via email — use CONTACT_EMAIL if set, fall back to SMTP_USER
    const adminEmail = process.env.CONTACT_EMAIL || process.env.SMTP_USER;
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: `[Clubsy Contact] ${SUBJECT_LABELS[subject] ?? subject} from ${name}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <h2 style="color:#111827">New Contact Submission</h2>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px 0;color:#6b7280;width:80px">Name</td><td style="padding:8px 0;color:#111827"><strong>${name}</strong></td></tr>
              <tr><td style="padding:8px 0;color:#6b7280">Email</td><td style="padding:8px 0"><a href="mailto:${email}" style="color:#2563eb">${email}</a></td></tr>
              <tr><td style="padding:8px 0;color:#6b7280">Subject</td><td style="padding:8px 0;color:#111827">${SUBJECT_LABELS[subject] ?? subject}</td></tr>
            </table>
            <div style="margin-top:16px;padding:16px;background:#f9fafb;border-radius:8px">
              <p style="margin:0;color:#374151;white-space:pre-wrap">${message}</p>
            </div>
            <p style="margin-top:16px;font-size:12px;color:#9ca3af">Submitted at ${new Date().toLocaleString()}</p>
          </div>
        `,
      });
    }

    // Send confirmation to the sender
    await sendEmail({
      to: email,
      subject: "We received your message — Clubsy",
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <div style="background:#1d4ed8;padding:20px 24px;border-radius:12px 12px 0 0">
            <span style="color:#fff;font-size:20px;font-weight:700">Clubsy</span>
          </div>
          <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
            <h2 style="color:#111827;margin:0 0 12px">Thanks for reaching out, ${name}!</h2>
            <p style="color:#6b7280;margin:0 0 16px">We've received your message and will get back to you within 1–2 business days.</p>
            <div style="background:#f9fafb;padding:16px;border-radius:8px;margin-bottom:16px">
              <p style="margin:0;font-size:13px;color:#6b7280"><strong>Your message:</strong></p>
              <p style="margin:8px 0 0;color:#374151;white-space:pre-wrap;font-size:14px">${message}</p>
            </div>
            <p style="color:#9ca3af;font-size:12px;margin:0">— The Clubsy Team</p>
          </div>
        </div>
      `,
    });

    logger.info("Contact form submitted", { name, email, subject });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    logger.error("Contact form error", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
