// GET /api/admin/session — confirms the cookie is valid and reports setup status.
import { json } from '../../../lib/http.js';
import { emailConfigured } from '../../../lib/notify.js';

export function onRequestGet({ env }) {
  return json({ ok: true, email: emailConfigured(env) });
}
