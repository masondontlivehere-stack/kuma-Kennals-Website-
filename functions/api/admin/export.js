// GET /api/admin/export — every application as a CSV download.
import { serverError } from '../../../lib/http.js';
import { getDB, reference } from '../../../lib/db.js';
import { describe } from '../../../lib/application.js';

function cell(v) {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // stop spreadsheet formula injection
  return '"' + s.replace(/"/g, '""') + '"';
}

export async function onRequestGet({ env }) {
  try {
    const db = await getDB(env);
    const { results } = await db.prepare('SELECT * FROM applications ORDER BY created_at DESC').all();
    const head = ['Reference', 'Submitted', 'Status', 'Name', 'Email', 'Phone', 'City', 'State', 'Home', 'Timeline', 'Preference', 'Experience', 'Message', 'Notes'];
    const lines = [head.map(cell).join(',')];
    for (const r of results) {
      const d = describe(r);
      lines.push([reference(r.id), r.created_at, r.status, r.name, r.email, r.phone, r.city, r.state, d.home, d.timeline, d.sex, d.experience, r.message, r.notes].map(cell).join(','));
    }
    const date = new Date().toISOString().slice(0, 10);
    return new Response('﻿' + lines.join('\r\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="kuma-kennels-applications-${date}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return serverError(err);
  }
}
