// Email notifications via Resend (https://resend.com).
// Needs RESEND_API_KEY and NOTIFY_EMAIL. Optional: NOTIFY_FROM (a sender on a
// domain verified in Resend) and CONFIRM_APPLICANTS=true to also email applicants.
import { describe } from './application.js';
import { reference } from './db.js';

export function emailConfigured(env) {
  return Boolean(env.RESEND_API_KEY && env.NOTIFY_EMAIL);
}

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function send(env, payload) {
  const base = (env.RESEND_API_URL || 'https://api.resend.com').replace(/\/$/, '');
  const res = await fetch(base + '/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`Email service responded ${res.status}: ${detail}`);
  }
}

export async function notifyBreeder(env, app, origin) {
  if (!emailConfigured(env)) return { skipped: true };
  const d = describe(app);
  const ref = reference(app.id);
  const link = `${origin}/admin/#${app.id}`;
  const rows = [
    ['Name', app.name],
    ['Email', app.email],
    ['Phone', app.phone],
    ['Location', `${app.city}, ${app.state}`],
    ['Home', d.home],
    ['Timeline', d.timeline],
    ['Preference', d.sex],
    ['Experience', d.experience],
  ];
  const html = `<!doctype html><html><body style="margin:0;background:#f8f5f0;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1c1815">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
  <p style="margin:0 0 4px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#9a4f1d">New puppy application · ${esc(ref)}</p>
  <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-weight:400;font-size:28px">${esc(app.name)}</h1>
  <table role="presentation" style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e7e0d6;border-radius:10px">
    ${rows.map(([k, v]) => `<tr><td style="padding:10px 14px;border-bottom:1px solid #efe8de;color:#6b625a;font-size:13px;width:120px">${esc(k)}</td><td style="padding:10px 14px;border-bottom:1px solid #efe8de;font-size:15px">${esc(v)}</td></tr>`).join('')}
  </table>
  <h2 style="margin:24px 0 8px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#6b625a">What they need</h2>
  <p style="margin:0;white-space:pre-wrap;font-size:15px;line-height:1.6">${esc(app.message)}</p>
  <p style="margin:28px 0 0"><a href="${esc(link)}" style="display:inline-block;background:#ad5a24;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:15px">Open in dashboard</a></p>
  <p style="margin:20px 0 0;font-size:13px;color:#6b625a">Reply to this email to answer ${esc(app.name.split(' ')[0])} directly.</p>
</div></body></html>`;
  const text = [
    `New puppy application ${ref}`,
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    'What they need:',
    app.message,
    '',
    `Open in dashboard: ${link}`,
  ].join('\n');

  await send(env, {
    from: env.NOTIFY_FROM || 'Kuma Kennels <onboarding@resend.dev>',
    to: String(env.NOTIFY_EMAIL).split(',').map((s) => s.trim()).filter(Boolean),
    reply_to: app.email,
    subject: `New puppy application — ${app.name} (${app.city}, ${app.state})`,
    html,
    text,
  });
  return { sent: true };
}

export async function confirmApplicant(env, app) {
  if (!emailConfigured(env) || env.CONFIRM_APPLICANTS !== 'true' || !env.NOTIFY_FROM) return { skipped: true };
  const first = app.name.split(' ')[0];
  const ref = reference(app.id);
  await send(env, {
    from: env.NOTIFY_FROM,
    to: [app.email],
    subject: 'We received your puppy application — Kuma Kennels',
    text: `Hi ${first},\n\nThank you for applying for a Turkish Boz Shepherd puppy. We read every application personally and will be in touch soon.\n\nYour reference: ${ref}\n\n— Kuma Kennels`,
  });
  return { sent: true };
}
