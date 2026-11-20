// Sessions, password checks, hashing and rate limiting.
import { ConfigError } from './http.js';

const enc = new TextEncoder();
export const SESSION_COOKIE = 'kk_admin';
export const SESSION_SECONDS = 60 * 60 * 12; // 12 hours
const MIN_PASSWORD = 12;

function b64url(bytes) {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function sha256(text) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(text)));
}
async function sha256Hex(text) {
  return [...(await sha256(text))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function equalBytes(a, b) {
  if (a.length !== b.length) return false;
  if (crypto.subtle.timingSafeEqual) return crypto.subtle.timingSafeEqual(a, b);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export function assertAdminConfigured(env) {
  if (!env.ADMIN_PASSWORD) throw new ConfigError('ADMIN_PASSWORD is not set.');
  if (String(env.ADMIN_PASSWORD).length < MIN_PASSWORD) {
    throw new ConfigError(`ADMIN_PASSWORD must be at least ${MIN_PASSWORD} characters.`);
  }
}

function secret(env) {
  // A separate SESSION_SECRET is optional; otherwise sessions are tied to the
  // admin password, so changing the password signs everyone out.
  return env.SESSION_SECRET || 'kuma-kennels-session:' + env.ADMIN_PASSWORD;
}

async function hmacKey(env) {
  return crypto.subtle.importKey('raw', enc.encode(secret(env)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function passwordMatches(env, input) {
  const a = await sha256('pw:' + String(input || ''));
  const b = await sha256('pw:' + String(env.ADMIN_PASSWORD));
  return equalBytes(a, b);
}

export async function createSession(env) {
  const exp = Date.now() + SESSION_SECONDS * 1000;
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(env), enc.encode('admin.' + exp));
  return exp + '.' + b64url(sig);
}

export async function verifySession(env, token) {
  if (!token || typeof token !== 'string') return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  try {
    return await crypto.subtle.verify('HMAC', await hmacKey(env), fromB64url(sig), enc.encode('admin.' + exp));
  } catch {
    return false;
  }
}

export function sessionCookie(token, maxAge = SESSION_SECONDS) {
  return `${SESSION_COOKIE}=${token}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export async function clientKey(env, request) {
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
  return sha256Hex('ip:' + secret(env) + ':' + ip);
}

// ---- Rate limiting (stored in D1, so it works across all edge locations) ----
export async function recentCount(db, kind, key, windowSeconds) {
  const since = Math.floor(Date.now() / 1000) - windowSeconds;
  const row = await db
    .prepare('SELECT COUNT(*) AS n FROM rate_events WHERE kind = ? AND key = ? AND ts > ?')
    .bind(kind, key, since)
    .first();
  return row ? row.n : 0;
}

export async function recordEvent(db, kind, key) {
  const now = Math.floor(Date.now() / 1000);
  await db.prepare('INSERT INTO rate_events (kind, key, ts) VALUES (?, ?, ?)').bind(kind, key, now).run();
  if (Math.random() < 0.05) {
    await db.prepare('DELETE FROM rate_events WHERE ts < ?').bind(now - 86400).run();
  }
}
