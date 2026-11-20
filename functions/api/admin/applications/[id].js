// GET / PATCH / DELETE /api/admin/applications/:id
import { json, readJSON, serverError } from '../../../../lib/http.js';
import { getDB, STATUSES, PUBLIC_COLUMNS } from '../../../../lib/db.js';

function parseId(params) {
  const id = Number(params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function onRequestGet({ env, params }) {
  try {
    const id = parseId(params);
    if (!id) return json({ ok: false, error: 'not_found' }, 404);
    const db = await getDB(env);
    const item = await db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM applications WHERE id = ?`).bind(id).first();
    if (!item) return json({ ok: false, error: 'not_found' }, 404);
    return json({ ok: true, item });
  } catch (err) {
    return serverError(err);
  }
}

export async function onRequestPatch({ request, env, params }) {
  try {
    const id = parseId(params);
    if (!id) return json({ ok: false, error: 'not_found' }, 404);
    const { body, error } = await readJSON(request, 12000);
    if (error) return error;

    const sets = [];
    const binds = [];
    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) return json({ ok: false, error: 'bad_status' }, 400);
      sets.push('status = ?'); binds.push(body.status);
    }
    if (body.notes !== undefined) {
      if (typeof body.notes !== 'string') return json({ ok: false, error: 'bad_notes' }, 400);
      sets.push('notes = ?'); binds.push(body.notes.slice(0, 5000));
    }
    if (!sets.length) return json({ ok: false, error: 'nothing_to_update' }, 400);
    sets.push('updated_at = ?'); binds.push(new Date().toISOString());

    const db = await getDB(env);
    const item = await db
      .prepare(`UPDATE applications SET ${sets.join(', ')} WHERE id = ? RETURNING ${PUBLIC_COLUMNS}`)
      .bind(...binds, id)
      .first();
    if (!item) return json({ ok: false, error: 'not_found' }, 404);
    return json({ ok: true, item });
  } catch (err) {
    return serverError(err);
  }
}

export async function onRequestDelete({ env, params }) {
  try {
    const id = parseId(params);
    if (!id) return json({ ok: false, error: 'not_found' }, 404);
    const db = await getDB(env);
    const res = await db.prepare('DELETE FROM applications WHERE id = ?').bind(id).run();
    if (!res.meta.changes) return json({ ok: false, error: 'not_found' }, 404);
    return json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
