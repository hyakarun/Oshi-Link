import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { adminUnauthorized, requireAdmin } from '@/lib/admin/auth';
import { deleteUserCascade } from '@/lib/admin/cascade';
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
          `SELECT u.id, u.name, u.email, u.status, u.is_official, u.created_at,
            (SELECT COUNT(*) FROM user_group_follows f WHERE f.user_id = u.id) as follow_count,
            (SELECT COUNT(*) FROM events e WHERE e.added_by = u.id) as event_count
          FROM users u
          WHERE u.email LIKE ? OR u.name LIKE ?
          ORDER BY u.created_at DESC LIMIT 200`
        )
        .bind(like, like)
        .all()
    : await db
        .prepare(
          `SELECT u.id, u.name, u.email, u.status, u.is_official, u.created_at,
            (SELECT COUNT(*) FROM user_group_follows f WHERE f.user_id = u.id) as follow_count,
            (SELECT COUNT(*) FROM events e WHERE e.added_by = u.id) as event_count
          FROM users u ORDER BY u.created_at DESC LIMIT 200`
        )
        .all();

  const users = (result.results || []).map((u: Record<string, unknown>) => ({
    ...u,
    is_official: !!u.is_official,
  }));

  return NextResponse.json({ users });
}

export async function PATCH(request: NextRequest) {
  const { env } = getRequestContext();
  const db = (env as { DB: D1Database }).DB;
  if (!(await requireAdmin(request, db))) return adminUnauthorized();

  const body = (await request.json()) as {
    id: string;
    name?: string;
    status?: string;
    is_official?: boolean;
  };

  if (!body.id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const existing = await db.prepare('SELECT * FROM users WHERE id = ?').bind(body.id).first<{
    id: string;
    name: string;
    status: string;
    is_official: number;
  }>();

  if (!existing) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const status = body.status !== undefined ? parseStatus(body.status) : parseStatus(existing.status);
  if (body.status !== undefined && !status) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const name = body.name?.trim() || existing.name;
  const isOfficial = body.is_official !== undefined ? (body.is_official ? 1 : 0) : existing.is_official;

  await db
    .prepare('UPDATE users SET name = ?, status = ?, is_official = ? WHERE id = ?')
    .bind(name, status || 'active', isOfficial, body.id)
    .run();

  if (status === 'banned' || status === 'frozen') {
    await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(body.id).run();
  }

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

  const user = await db.prepare('SELECT id, email FROM users WHERE id = ?').bind(id).first<{
    id: string;
    email: string;
  }>();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  await deleteUserCascade(db, user.id, user.email);
  return NextResponse.json({ ok: true });
}
