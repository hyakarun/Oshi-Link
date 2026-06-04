import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { adminUnauthorized, requireAdmin } from '@/lib/admin/auth';
import { deleteEventCascade } from '@/lib/admin/cascade';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { env } = getRequestContext();
  const db = (env as { DB: D1Database }).DB;
  if (!(await requireAdmin(request, db))) return adminUnauthorized();

  const params = new URL(request.url).searchParams;
  const q = params.get('q')?.trim() || '';
  const groupId = params.get('group_id')?.trim() || '';
  const like = `%${q}%`;

  let query = `
    SELECT e.*, g.name as group_name, u.name as creator_name, u.email as creator_email
    FROM events e
    JOIN groups g ON g.id = e.group_id
    LEFT JOIN users u ON u.id = e.added_by
    WHERE 1=1
  `;
  const binds: string[] = [];

  if (groupId) {
    query += ' AND e.group_id = ?';
    binds.push(groupId);
  }
  if (q) {
    query += ' AND (e.title LIKE ? OR e.description LIKE ? OR g.name LIKE ?)';
    binds.push(like, like, like);
  }
  query += ' ORDER BY e.date DESC LIMIT 300';

  const result = await db.prepare(query).bind(...binds).all();
  return NextResponse.json({ events: result.results || [] });
}

export async function PATCH(request: NextRequest) {
  const { env } = getRequestContext();
  const db = (env as { DB: D1Database }).DB;
  if (!(await requireAdmin(request, db))) return adminUnauthorized();

  const body = (await request.json()) as {
    id: string;
    title?: string;
    description?: string | null;
    date?: string;
    end_time?: string | null;
    location?: string | null;
    address?: string | null;
    source_url?: string | null;
    group_id?: string;
  };

  if (!body.id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const existing = await db.prepare('SELECT * FROM events WHERE id = ?').bind(body.id).first<Record<string, unknown>>();
  if (!existing) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  if (body.group_id) {
    const group = await db.prepare('SELECT id FROM groups WHERE id = ?').bind(body.group_id).first();
    if (!group) {
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 });
    }
  }

  await db
    .prepare(
      `UPDATE events SET
        title = ?, description = ?, date = ?, end_time = ?,
        location = ?, address = ?, source_url = ?, group_id = ?
      WHERE id = ?`
    )
    .bind(
      body.title?.trim() || existing.title,
      body.description !== undefined ? body.description : existing.description,
      body.date || existing.date,
      body.end_time !== undefined ? body.end_time : existing.end_time,
      body.location !== undefined ? body.location : existing.location,
      body.address !== undefined ? body.address : existing.address,
      body.source_url !== undefined ? body.source_url : existing.source_url,
      body.group_id || existing.group_id,
      body.id
    )
    .run();

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const { env } = getRequestContext();
  const db = (env as { DB: D1Database }).DB;
  if (!(await requireAdmin(request, db))) return adminUnauthorized();

  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const event = await db.prepare('SELECT id FROM events WHERE id = ?').bind(id).first();
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  await deleteEventCascade(db, id);
  return NextResponse.json({ ok: true });
}
