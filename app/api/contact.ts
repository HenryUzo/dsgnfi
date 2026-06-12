/// <reference types="node" />
import { Resend } from 'resend';

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

type ContactPayload = {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  website?: string;
  company?: string;
  budget?: string;
};

export default async function handler(req: { method?: string; body?: ContactPayload | string }, res: { status: (code: number) => { json: (data: unknown) => void } }) {


  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let payload: ContactPayload = {};
  if (typeof req.body === 'string') {
    try {
      payload = JSON.parse(req.body) as ContactPayload;
    } catch {
      res.status(400).json({ error: 'Invalid JSON' });
      return;
    }
  } else if (req.body && typeof req.body === 'object') {
    payload = req.body as ContactPayload;
  }
  const { name, email, subject, message, website, company, budget } = payload;

  if (website) {
    res.status(200).json({ ok: true });
    return;
  }

  if (!name || !email || !subject || !message) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  if (!EMAIL_REGEX.test(email)) {
    res.status(400).json({ error: 'Invalid email address' });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server not configured' });
    return;
  }

  const resend = new Resend(apiKey);
  const from = process.env.CONTACT_FROM_EMAIL || 'Contact Form <onboarding@resend.dev>';

  const text = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Subject: ${subject}`,
    company ? `Company: ${company}` : null,
    budget ? `Budget: ${budget}` : null,
    '',
    message,
  ]
    .filter(Boolean)
    .join('\n');

try {
  const { data, error } = await resend.emails.send({
    from,
    to: "support@dsgnfi.com",
    subject: `New Contact: ${subject}`,
    replyTo: email,
    text,
  });

  if (error) {
    console.error("Resend error:", error);
    res.status(502).json({ error: "Email send failed" });
    return;
  }

  res.status(200).json({ ok: true, id: data?.id });
  return;
} catch (err) {
  console.error("Send exception:", err);
  res.status(502).json({ error: "Email send failed" });
  return;
}

}
