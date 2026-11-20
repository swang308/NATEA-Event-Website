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

export async function sendPaymentReminderEmail(recipient: EmailRecipient, eventTitle: string, amount: string, email: string, deadline: string) {
  await sendBrevoEmail(
    `Payment reminder: ${eventTitle}`,
    [recipient],
    `<p>Please send ${amount} by Interac e-Transfer to ${email} for <strong>${eventTitle}</strong>.</p><p>Please send payment by <strong>${deadline}</strong>.</p>`,
  );
}
