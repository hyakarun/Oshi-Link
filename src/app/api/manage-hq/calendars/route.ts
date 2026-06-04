import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { adminUnauthorized, requireAdmin } from '@/lib/admin/auth';
import { deleteGroupCascade } from '@/lib/admin/cascade';
import { parseStatus } from '@/lib/admin/moderation';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { env } = getRequestContext();
  const db = (env as { DB: D1Database }).DB;
  if (!(await requireAdmin(request, db))) return adminUnauthorized();

  const q = new URL(request.url).searchParams.get('q')?.trim() || '';
  const like = `%${q}%`;

  const result = q
    ? await db
        .prepare(
          `SELECT g.id, g.name, g.description, g.avatar_url, g.status, g.created_at,
            EXISTS(SELECT 1 FROM group_officials o WHERE o.group_id = g.id) as is_official,
            (SELECT COUNT(*) FROM user_group_follows f WHERE f.group_id = g.id) as follower_count,
            (SELECT COUNT(*) FROM events e WHERE e.group_id = g.id) as event_count
          FROM groups g
          WHERE g.name LIKE ? OR g.description LIKE ?
          ORDER BY g.created_at DESC LIMIT 200`
        )
        .bind(like, like)
        .all()
    : await db
        .prepare(
          `SELECT g.id, g.name, g.description, g.avatar_url, g.status, g.created_at,
            EXISTS(SELECT 1 FROM group_officials o WHERE o.group_id = g.id) as is_official,
            (SELECT COUNT(*) FROM user_group_follows f WHERE f.group_id = g.id) as follower_count,
            (SELECT COUNT(*) FROM events e WHERE e.group_id = g.id) as event_count
          FROM groups g ORDER BY g.created_at DESC LIMIT 200`
        )
        .all();

  const calendars = (result.results || []).map((g: Record<string, unknown>) => ({
    ...g,
    is_official: !!g.is_official,
  }));

  return NextResponse.json({ calendars });
}

export async function PATCH(request: NextRequest) {
  const { env } = getRequestContext();
  const db = (env as { DB: D1Database }).DB;
  if (!(await requireAdmin(request, db))) return adminUnauthorized();

  const body = (await request.json()) as {
    id: string;
    name?: string;
    description?: string | null;
    avatar_url?: string | null;
    status?: string;
  };

  if (!body.id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const existing = await db.prepare('SELECT * FROM groups WHERE id = ?').bind(body.id).first<{
    id: string;
    name: string;
    description: string | null;
    avatar_url: string | null;
    status: string;
  }>();

  if (!existing) {
    return NextResponse.json({ error: 'Calendar not found' }, { status: 404 });
  }

  const status =
    body.status !== undefined ? parseStatus(body.status) : parseStatus(existing.status);
  if (body.status !== undefined && !status) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  await db
    .prepare('UPDATE groups SET name = ?, description = ?, avatar_url = ?, status = ? WHERE id = ?')
    .bind(
      body.name?.trim() || existing.name,
      body.description !== undefined ? body.description : existing.description,
      body.avatar_url !== undefined ? body.avatar_url : existing.avatar_url,
      status || 'active',
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

  const group = await db.prepare('SELECT id FROM groups WHERE id = ?').bind(id).first();
  if (!group) {
    return NextResponse.json({ error: 'Calendar not found' }, { status: 404 });
  }

  await deleteGroupCascade(db, id);
  return NextResponse.json({ ok: true });
}
