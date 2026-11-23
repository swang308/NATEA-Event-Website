type EmailRecipient = { email: string; name?: string };
import { createClient } from "@supabase/supabase-js";

export async function sendBrevoEmail(subject: string, recipients: EmailRecipient[], htmlContent: string) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "NATEA";
  if (!apiKey || !senderEmail || recipients.length === 0) {
    console.warn("Brevo email skipped: missing configuration or recipients.");
    return;
  }
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "accept": "application/json", "api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({ sender: { email: senderEmail, name: senderName }, to: recipients, subject, htmlContent }),
  });
  if (!response.ok) throw new Error(`Brevo email failed: ${response.status}`);
}

export async function sendPublishedEventAnnouncement(title: string, description: string, location: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.warn("Brevo announcement skipped: Supabase service-role configuration is missing.");
    return;
  }
  const adminClient = createClient(url, serviceKey);
  const { data: subscribers, error } = await adminClient.from("newsletter_subscribers").select("email, name");
  if (error) throw new Error(`Unable to load announcement subscribers: ${error.message}`);
  await sendBrevoEmail(`New NATEA event: ${title}`, (subscribers ?? []).map((subscriber) => ({ email: subscriber.email, name: subscriber.name ?? undefined })), `<h2>${title}</h2><p>${description}</p><p>${location}</p>`);
}

export async function getAdminEmailRecipients(): Promise<EmailRecipient[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return [];
  const adminClient = createClient(url, serviceKey);
  const { data: admins, error } = await adminClient.from("profiles").select("email, display_name").eq("role", "admin");
  if (error) throw new Error(`Unable to load admin recipients: ${error.message}`);
  return (admins ?? []).map((admin) => ({ email: admin.email, name: admin.display_name }));
}

export async function getProfileEmailRecipient(userId: string): Promise<EmailRecipient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  const adminClient = createClient(url, serviceKey);
  const { data: profile, error } = await adminClient.from("profiles").select("email, display_name").eq("id", userId).maybeSingle();
  if (error) throw new Error(`Unable to load profile recipient: ${error.message}`);
  return profile ? { email: profile.email, name: profile.display_name } : null;
}

export async function sendPaymentReminderEmail({
  toEmail,
  toName,
  eventTitle,
  amount,
  deadline,
  eventUrl,
}: {
  toEmail: string;
  toName: string;
  eventTitle: string;
  amount: string;
  deadline: string;
  eventUrl: string;
}) {
  const html = `<div style="font-family: 'DM Sans', Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; color: #17202b;">
  <div style="background: linear-gradient(135deg, #2ea6b5 0%, #7b2d8e 100%); padding: 32px 24px; text-align: center;">
    <div style="display: inline-block; background: rgba(255,255,255,0.2); border-radius: 12px; padding: 8px 14px; color: #ffffff; font-size: 24px; font-weight: bold;">N</div>
    <div style="color: #ffffff; font-size: 22px; font-weight: bold; letter-spacing: 1px; margin-top: 12px;">NATEA</div>
    <div style="color: rgba(255,255,255,0.85); font-size: 13px; margin-top: 4px;">TORONTO IT COMMUNITY</div>
  </div>
  <div style="padding: 32px 24px;">
    <h2 style="font-size: 22px; margin: 0 0 16px; color: #17202b;">Payment reminder: ${eventTitle}</h2>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Hi ${toName}, you RSVP'd for <strong>${eventTitle}</strong> but haven't paid yet. Please pay <strong>${amount}</strong> by card by <strong>${deadline}</strong> to keep your spot.</p>
    <p style="margin: 28px 0; text-align: center;">
      <a href="${eventUrl}" style="display: inline-block; background: #2ea6b5; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 15px; padding: 14px 32px; border-radius: 999px;">Pay now</a>
    </p>
  </div>
  <div style="border-top: 1px solid #eeeeee; padding: 20px 24px; text-align: center;">
    <p style="font-size: 13px; color: #888888; margin: 0;">Learn together, in Toronto.</p>
    <p style="font-size: 13px; color: #888888; margin: 8px 0 0;">— The NATEA team</p>
  </div>
</div>`;

  await sendBrevoEmail(`Payment reminder: ${eventTitle}`, [{ email: toEmail, name: toName }], html);
}


export async function sendRsvpConfirmationEmail({
  toEmail,
  toName,
  eventTitle,
  eventDate,
  eventLocation,
  eventUrl,
  totalCents,
  guestName,
  etransferEmail,
}: {
  toEmail: string;
  toName: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  eventUrl: string;
  totalCents: number;
  guestName: string | null;
  etransferEmail: string | null;
}) {
  const total = `$${(totalCents / 100).toFixed(2)} CAD`;
  const isPaidEvent = totalCents > 0;
  const paymentBlock = isPaidEvent
    ? `<p style="font-size: 15px; line-height: 1.6; margin: 0 0 8px;">Please send <strong>${total}</strong> by e-Transfer to <strong>${etransferEmail ?? "the organizer"}</strong>.</p>
       <p style="font-size: 15px; line-height: 1.6; margin: 0 0 8px;">After you send it, go to My Events and click "I've sent it" so the organizer can confirm your payment.</p>`
    : `<p style="font-size: 15px; line-height: 1.6; margin: 0 0 8px;">This event is free — no payment needed.</p>`;
  const guestBlock = guestName
    ? `<p style="font-size: 15px; line-height: 1.6; margin: 0 0 8px;">Guest: <strong>${guestName}</strong></p>`
    : "";

  const html = `<div style="font-family: 'DM Sans', Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; color: #17202b;">
  <div style="background: linear-gradient(135deg, #2ea6b5 0%, #7b2d8e 100%); padding: 32px 24px; text-align: center;">
    <div style="display: inline-block; background: rgba(255,255,255,0.2); border-radius: 12px; padding: 8px 14px; color: #ffffff; font-size: 24px; font-weight: bold;">N</div>
    <div style="color: #ffffff; font-size: 22px; font-weight: bold; letter-spacing: 1px; margin-top: 12px;">NATEA</div>
    <div style="color: rgba(255,255,255,0.85); font-size: 13px; margin-top: 4px;">TORONTO IT COMMUNITY</div>
  </div>
  <div style="padding: 32px 24px;">
    <h2 style="font-size: 22px; margin: 0 0 16px; color: #17202b;">You're going to ${eventTitle}!</h2>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Hi ${toName}, thanks for signing up. Here are the details:</p>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 8px;">📅 ${eventDate}</p>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 8px;">📍 ${eventLocation}</p>
    ${guestBlock}
    ${paymentBlock}
    <p style="margin: 28px 0; text-align: center;">
      <a href="${eventUrl}" style="display: inline-block; background: #2ea6b5; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 15px; padding: 14px 32px; border-radius: 999px;">View event</a>
    </p>
  </div>
  <div style="border-top: 1px solid #eeeeee; padding: 20px 24px; text-align: center;">
    <p style="font-size: 13px; color: #888888; margin: 0;">Learn together, in Toronto.</p>
    <p style="font-size: 13px; color: #888888; margin: 8px 0 0;">— The NATEA team</p>
  </div>
</div>`;

  await sendBrevoEmail(`You're going to ${eventTitle}`, [{ email: toEmail, name: toName }], html);
}

export async function sendPaymentConfirmedEmail({
  toEmail,
  toName,
  eventTitle,
  eventDate,
  eventLocation,
  eventUrl,
  totalCents,
  guestName,
}: {
  toEmail: string;
  toName: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  eventUrl: string;
  totalCents: number;
  guestName: string | null;
}) {
  const total = `$${(totalCents / 100).toFixed(2)} CAD`;
  const guestBlock = guestName
    ? `<p style="font-size: 15px; line-height: 1.6; margin: 0 0 8px;">Guest: <strong>${guestName}</strong></p>`
    : "";

  const html = `<div style="font-family: 'DM Sans', Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; color: #17202b;">
  <div style="background: linear-gradient(135deg, #2ea6b5 0%, #7b2d8e 100%); padding: 32px 24px; text-align: center;">
    <div style="display: inline-block; background: rgba(255,255,255,0.2); border-radius: 12px; padding: 8px 14px; color: #ffffff; font-size: 24px; font-weight: bold;">N</div>
    <div style="color: #ffffff; font-size: 22px; font-weight: bold; letter-spacing: 1px; margin-top: 12px;">NATEA</div>
    <div style="color: rgba(255,255,255,0.85); font-size: 13px; margin-top: 4px;">TORONTO IT COMMUNITY</div>
  </div>
  <div style="padding: 32px 24px;">
    <h2 style="font-size: 22px; margin: 0 0 16px; color: #17202b;">Your payment was confirmed!</h2>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Hi ${toName}, the organizer confirmed your payment of <strong>${total}</strong> for <strong>${eventTitle}</strong>. You're all set — see you there!</p>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 8px;">📅 ${eventDate}</p>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 8px;">📍 ${eventLocation}</p>
    ${guestBlock}
    <p style="margin: 28px 0; text-align: center;">
      <a href="${eventUrl}" style="display: inline-block; background: #2ea6b5; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 15px; padding: 14px 32px; border-radius: 999px;">View event</a>
    </p>
  </div>
  <div style="border-top: 1px solid #eeeeee; padding: 20px 24px; text-align: center;">
    <p style="font-size: 13px; color: #888888; margin: 0;">Learn together, in Toronto.</p>
    <p style="font-size: 13px; color: #888888; margin: 8px 0 0;">— The NATEA team</p>
  </div>
</div>`;

  await sendBrevoEmail(`Your payment was confirmed: ${eventTitle}`, [{ email: toEmail, name: toName }], html);
}

export async function sendPaymentReportedEmail({
  toEmail,
  toName,
  attendeeName,
  eventTitle,
  eventDate,
  totalCents,
  guestName,
  deadline,
  reviewUrl,
}: {
  toEmail: string;
  toName: string;
  attendeeName: string;
  eventTitle: string;
  eventDate: string;
  totalCents: number;
  guestName: string | null;
  deadline: string;
  reviewUrl: string;
}) {
  const total = `$${(totalCents / 100).toFixed(2)} CAD`;
  const guestBlock = guestName
    ? `<p style="font-size: 15px; line-height: 1.6; margin: 0 0 8px;">Guest: <strong>${guestName}</strong></p>`
    : "";

  const html = `<div style="font-family: 'DM Sans', Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; color: #17202b;">
  <div style="background: linear-gradient(135deg, #2ea6b5 0%, #7b2d8e 100%); padding: 32px 24px; text-align: center;">
    <div style="display: inline-block; background: rgba(255,255,255,0.2); border-radius: 12px; padding: 8px 14px; color: #ffffff; font-size: 24px; font-weight: bold;">N</div>
    <div style="color: #ffffff; font-size: 22px; font-weight: bold; letter-spacing: 1px; margin-top: 12px;">NATEA</div>
    <div style="color: rgba(255,255,255,0.85); font-size: 13px; margin-top: 4px;">TORONTO IT COMMUNITY</div>
  </div>
  <div style="padding: 32px 24px;">
    <h2 style="font-size: 22px; margin: 0 0 16px; color: #17202b;">Payment reported for ${eventTitle}</h2>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Hi ${toName}, <strong>${attendeeName}</strong> reported a payment of <strong>${total}</strong> for <strong>${eventTitle}</strong>.</p>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 8px;">📅 ${eventDate}</p>
    ${guestBlock}
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Please review and confirm the e-Transfer before the deadline of <strong>${deadline}</strong>.</p>
    <p style="margin: 28px 0; text-align: center;">
      <a href="${reviewUrl}" style="display: inline-block; background: #2ea6b5; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 15px; padding: 14px 32px; border-radius: 999px;">Review payment confirmations</a>
    </p>
  </div>
  <div style="border-top: 1px solid #eeeeee; padding: 20px 24px; text-align: center;">
    <p style="font-size: 13px; color: #888888; margin: 0;">Learn together, in Toronto.</p>
    <p style="font-size: 13px; color: #888888; margin: 8px 0 0;">— The NATEA team</p>
  </div>
</div>`;

  await sendBrevoEmail(`Payment reported for ${eventTitle}`, [{ email: toEmail, name: toName }], html);
}

export async function sendEventReminderEmail({
  toEmail,
  toName,
  eventTitle,
  eventDate,
  eventLocation,
  eventUrl,
  guestName,
}: {
  toEmail: string;
  toName: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  eventUrl: string;
  guestName: string | null;
}) {
  const guestBlock = guestName
    ? `<p style="font-size: 15px; line-height: 1.6; margin: 0 0 8px;">Guest: <strong>${guestName}</strong></p>`
    : "";

  const html = `<div style="font-family: 'DM Sans', Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; color: #17202b;">
  <div style="background: linear-gradient(135deg, #2ea6b5 0%, #7b2d8e 100%); padding: 32px 24px; text-align: center;">
    <div style="display: inline-block; background: rgba(255,255,255,0.2); border-radius: 12px; padding: 8px 14px; color: #ffffff; font-size: 24px; font-weight: bold;">N</div>
    <div style="color: #ffffff; font-size: 22px; font-weight: bold; letter-spacing: 1px; margin-top: 12px;">NATEA</div>
    <div style="color: rgba(255,255,255,0.85); font-size: 13px; margin-top: 4px;">TORONTO IT COMMUNITY</div>
  </div>
  <div style="padding: 32px 24px;">
    <h2 style="font-size: 22px; margin: 0 0 16px; color: #17202b;">See you tomorrow — ${eventTitle}!</h2>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Hi ${toName}, your event is tomorrow. Here are the details:</p>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 8px;">📅 ${eventDate}</p>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 8px;">📍 ${eventLocation}</p>
    ${guestBlock}
    <p style="margin: 28px 0; text-align: center;">
      <a href="${eventUrl}" style="display: inline-block; background: #2ea6b5; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 15px; padding: 14px 32px; border-radius: 999px;">View event</a>
    </p>
  </div>
  <div style="border-top: 1px solid #eeeeee; padding: 20px 24px; text-align: center;">
    <p style="font-size: 13px; color: #888888; margin: 0;">Learn together, in Toronto.</p>
    <p style="font-size: 13px; color: #888888; margin: 8px 0 0;">— The NATEA team</p>
  </div>
</div>`;

  await sendBrevoEmail(`Tomorrow: ${eventTitle}`, [{ email: toEmail, name: toName }], html);
}

export async function sendWaitlistPromotedEmail({
  toEmail,
  toName,
  eventTitle,
  eventDate,
  eventLocation,
  eventUrl,
  amount,
}: {
  toEmail: string;
  toName: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  eventUrl: string;
  amount: string;
}) {
  const html = `<div style="font-family: 'DM Sans', Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; color: #17202b;">
  <div style="background: linear-gradient(135deg, #2ea6b5 0%, #7b2d8e 100%); padding: 32px 24px; text-align: center;">
    <div style="display: inline-block; background: rgba(255,255,255,0.2); border-radius: 12px; padding: 8px 14px; color: #ffffff; font-size: 24px; font-weight: bold;">N</div>
    <div style="color: #ffffff; font-size: 22px; font-weight: bold; letter-spacing: 1px; margin-top: 12px;">NATEA</div>
    <div style="color: rgba(255,255,255,0.85); font-size: 13px; margin-top: 4px;">TORONTO IT COMMUNITY</div>
  </div>
  <div style="padding: 32px 24px;">
    <h2 style="font-size: 22px; margin: 0 0 16px; color: #17202b;">You're in — ${eventTitle}!</h2>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Hi ${toName}, a spot opened up and you've been moved off the waitlist. Please pay <strong>${amount}</strong> by card to confirm your spot.</p>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 8px;">📅 ${eventDate}</p>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 8px;">📍 ${eventLocation}</p>
    <p style="margin: 28px 0; text-align: center;">
      <a href="${eventUrl}" style="display: inline-block; background: #2ea6b5; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 15px; padding: 14px 32px; border-radius: 999px;">Pay now</a>
    </p>
  </div>
  <div style="border-top: 1px solid #eeeeee; padding: 20px 24px; text-align: center;">
    <p style="font-size: 13px; color: #888888; margin: 0;">Learn together, in Toronto.</p>
    <p style="font-size: 13px; color: #888888; margin: 8px 0 0;">— The NATEA team</p>
  </div>
</div>`;

  await sendBrevoEmail(`You're in: ${eventTitle}`, [{ email: toEmail, name: toName }], html);
}
