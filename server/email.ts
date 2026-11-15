import nodemailer from 'nodemailer';

export interface BulkQuoteEmailPayload {
  referenceCode: string;
  toEmail: string;
  companyName: string;
  location: string;
  quantityRequired: string;
  phoneContact: string;
  customerEmail?: string;
  productInterest?: string;
  notes?: string;
}

export async function sendBulkQuoteEmail(payload: BulkQuoteEmailPayload): Promise<{ sent: boolean; log: string }> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || `Zobowellness <${payload.toEmail}>`;

  if (!host || !user || !pass) {
    const log = `Recorded for ${payload.toEmail} (SMTP not configured in environment; saved in Admin Bulk Quotations desk with reference ${payload.referenceCode}).`;
    return { sent: false, log };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: payload.toEmail,
      replyTo: payload.customerEmail || undefined,
      subject: `[Bulk Quotation ${payload.referenceCode}] ${payload.companyName} — ${payload.quantityRequired}`,
      text: [
        `New Bulk Quotation Request (${payload.referenceCode})`,
        `--------------------------------------------------`,
        `Company Name: ${payload.companyName}`,
        `Location: ${payload.location}`,
        `Quantity Required: ${payload.quantityRequired}`,
        `Phone Contact: ${payload.phoneContact}`,
        payload.customerEmail ? `Email: ${payload.customerEmail}` : '',
        payload.productInterest ? `Product Interest: ${payload.productInterest}` : '',
        payload.notes ? `Notes: ${payload.notes}` : '',
        `--------------------------------------------------`,
        `Submitted via Zobowellness Bulk Quotation System.`,
      ]
        .filter(Boolean)
        .join('\n'),
    });

    return { sent: true, log: `Email dispatched to ${payload.toEmail}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { sent: false, log: `Email delivery attempt failed (${msg}); saved in Admin dashboard.` };
  }
}
