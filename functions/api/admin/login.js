// POST /api/admin/login  { password }
import { json, readJSON, serverError } from '../../../lib/http.js';
import { getDB } from '../../../lib/db.js';
import { passwordMatches, createSession, sessionCookie, clientKey, recentCount, recordEvent } from '../../../lib/security.js';

const MAX_FAILURES = 8;          // per 15 minutes, per connection
const WINDOW = 15 * 60;

export async function onRequestPost({ request, env }) {
  try {
    const { body, error } = await readJSON(request, 2000);
    if (error) return error;

    const db = await getDB(env);
    const key = await clientKey(env, request);
    if ((await recentCount(db, 'login_fail', key, WINDOW)) >= MAX_FAILURES) {
      return json({ ok: false, error: 'too_many_attempts' }, 429, { 'Retry-After': String(WINDOW) });
    }

    if (!(await passwordMatches(env, body.password))) {
      await recordEvent(db, 'login_fail', key);
      await new Promise((r) => setTimeout(r, 400));
      return json({ ok: false, error: 'invalid_password' }, 401);
    }

    const token = await createSession(env);
    return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(token) });
  } catch (err) {
    return serverError(err);
  }
}
