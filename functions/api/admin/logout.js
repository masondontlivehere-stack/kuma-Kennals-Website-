// POST /api/admin/logout
import { json } from '../../../lib/http.js';
import { sessionCookie } from '../../../lib/security.js';

export function onRequestPost() {
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', 0) });
}
