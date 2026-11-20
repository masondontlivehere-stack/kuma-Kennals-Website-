// Guards every /api/admin/* route except login.
import { json, getCookie, sameOrigin, serverError } from '../../../lib/http.js';
import { assertAdminConfigured, verifySession, SESSION_COOKIE } from '../../../lib/security.js';

const OPEN = new Set(['/api/admin/login']);

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  try {
    assertAdminConfigured(env);
  } catch (err) {
    return serverError(err);
  }

  if (!OPEN.has(url.pathname)) {
    const ok = await verifySession(env, getCookie(request, SESSION_COOKIE));
    if (!ok) return json({ ok: false, error: 'unauthorized' }, 401);
  }
  if (!['GET', 'HEAD'].includes(request.method) && !sameOrigin(request)) {
    return json({ ok: false, error: 'forbidden' }, 403);
  }

  const res = await context.next();
  const out = new Response(res.body, res);
  out.headers.set('Cache-Control', 'no-store');
  out.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return out;
}
