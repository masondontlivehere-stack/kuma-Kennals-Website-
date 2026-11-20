// Small HTTP helpers shared by every function.

export class ConfigError extends Error {}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}

export function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(/;\s*/)) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i) === name) return decodeURIComponent(part.slice(i + 1));
  }
  return null;
}

// Browsers send Origin on cross-site POSTs; reject anything that isn't us.
export function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

export async function readJSON(request, maxBytes = 20000) {
  const type = request.headers.get('Content-Type') || '';
  if (!type.toLowerCase().includes('application/json')) {
    return { error: json({ ok: false, error: 'Expected JSON.' }, 415) };
  }
  const raw = await request.text();
  if (raw.length > maxBytes) return { error: json({ ok: false, error: 'Request too large.' }, 413) };
  try {
    const body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('not an object');
    return { body };
  } catch {
    return { error: json({ ok: false, error: 'Invalid JSON.' }, 400) };
  }
}

export function serverError(err) {
  if (err instanceof ConfigError) {
    return json({ ok: false, error: 'not_configured', detail: err.message }, 503);
  }
  console.error(err && err.stack ? err.stack : err);
  return json({ ok: false, error: 'server_error' }, 500);
}
