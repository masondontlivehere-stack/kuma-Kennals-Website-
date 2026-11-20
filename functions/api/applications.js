// POST /api/applications — public endpoint the application form submits to.
import { json, readJSON, sameOrigin, serverError } from '../../lib/http.js';
import { getDB, reference } from '../../lib/db.js';
import { validateApplication } from '../../lib/application.js';
import { clientKey, recentCount, recordEvent } from '../../lib/security.js';
import { notifyBreeder, confirmApplicant } from '../../lib/notify.js';

const MAX_PER_HOUR = 5;

export async function onRequestPost({ request, env, waitUntil }) {
  try {
    if (!sameOrigin(request)) return json({ ok: false, error: 'forbidden' }, 403);

    const { body, error } = await readJSON(request);
    if (error) return error;

    // Spam traps: a hidden field people never see, and forms filled faster than a human can.
    const honeypot = typeof body.website === 'string' && body.website.trim() !== '';
    const elapsed = Number(body.elapsed_ms);
    const tooFast = Number.isFinite(elapsed) && elapsed > 0 && elapsed < 2500;
    if (honeypot || tooFast) return json({ ok: true, reference: 'KK-0000' }, 201);

    const { errors, value } = validateApplication(body);
    if (Object.keys(errors).length) return json({ ok: false, errors }, 400);

    const db = await getDB(env);
    const key = await clientKey(env, request);
    if ((await recentCount(db, 'apply', key, 3600)) >= MAX_PER_HOUR) {
      return json({ ok: false, error: 'rate_limited' }, 429, { 'Retry-After': '3600' });
    }

    const now = new Date().toISOString();
    const row = await db
      .prepare(
        `INSERT INTO applications
           (created_at, status, name, email, phone, city, state, home, timeline, timeline_custom, sex, experience, message, ip_hash)
         VALUES (?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING id`
      )
      .bind(now, value.name, value.email, value.phone, value.city, value.state, value.home, value.timeline,
        value.timeline_custom || null, value.sex || null, value.experience || null, value.message, key)
      .first();
    await recordEvent(db, 'apply', key);

    const app = { id: row.id, created_at: now, ...value };
    const origin = new URL(request.url).origin;

    // Send emails after responding, and record the outcome for the dashboard.
    waitUntil(
      (async () => {
        try {
          const result = await notifyBreeder(env, app, origin);
          if (result.sent) {
            await db.prepare('UPDATE applications SET notified_at = ?, notify_error = NULL WHERE id = ?')
              .bind(new Date().toISOString(), app.id).run();
          }
        } catch (err) {
          console.error('notify failed', err);
          await db.prepare('UPDATE applications SET notify_error = ? WHERE id = ?')
            .bind(String(err.message || err).slice(0, 500), app.id).run();
        }
        try { await confirmApplicant(env, app); } catch (err) { console.error('confirmation failed', err); }
      })()
    );

    return json({ ok: true, id: app.id, reference: reference(app.id) }, 201);
  } catch (err) {
    return serverError(err);
  }
}

export function onRequestGet() {
  return json({ ok: false, error: 'method_not_allowed' }, 405, { Allow: 'POST' });
}
