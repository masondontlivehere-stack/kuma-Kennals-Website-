// GET /api/admin/applications?status=new&q=smith
import { json, serverError } from '../../../../lib/http.js';
import { getDB, STATUSES, PUBLIC_COLUMNS } from '../../../../lib/db.js';

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'all';
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    if (status !== 'all' && !STATUSES.includes(status)) return json({ ok: false, error: 'bad_status' }, 400);

    const db = await getDB(env);
    const like = '%' + q.replace(/[\\%_]/g, (c) => '\\' + c) + '%';
    const { results } = await db
      .prepare(
        `SELECT ${PUBLIC_COLUMNS} FROM applications
         WHERE (?1 = 'all' OR status = ?1)
           AND (?2 = '' OR name LIKE ?3 ESCAPE '\\' OR email LIKE ?3 ESCAPE '\\' OR city LIKE ?3 ESCAPE '\\'
                OR phone LIKE ?3 ESCAPE '\\' OR message LIKE ?3 ESCAPE '\\' OR notes LIKE ?3 ESCAPE '\\')
         ORDER BY created_at DESC
         LIMIT 500`
      )
      .bind(status, q, like)
      .all();

    const countRows = await db.prepare('SELECT status, COUNT(*) AS n FROM applications GROUP BY status').all();
    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    let total = 0;
    for (const r of countRows.results) { counts[r.status] = r.n; total += r.n; }
    counts.all = total;

    return json({ ok: true, items: results, counts });
  } catch (err) {
    return serverError(err);
  }
}
