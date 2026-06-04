import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { adminUnauthorized, requireAdmin } from '@/lib/admin/auth';
import {
  approveOfficialApplication,
  rejectOfficialApplication,
} from '@/lib/admin/official-applications';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { env } = getRequestContext();
  const db = (env as { DB: D1Database }).DB;
  if (!(await requireAdmin(request, db))) return adminUnauthorized();

  const systemOfficials = await db
    .prepare(
      `SELECT id, name, email, is_official, status, created_at
       FROM users WHERE is_official = 1 ORDER BY created_at DESC`
    )
    .all();

  const links = await db
    .prepare(
      `SELECT go.id, go.group_id, go.user_id, g.name as group_name, u.name as user_name, u.email as user_email
       FROM group_officials go
       JOIN groups g ON g.id = go.group_id
       JOIN users u ON u.id = go.user_id
       ORDER BY g.name ASC`
    )
    .all();

  const calendars = await db
    .prepare(
      `SELECT g.id, g.name, g.status,
        EXISTS(SELECT 1 FROM group_officials o WHERE o.group_id = g.id) as is_official
       FROM groups g ORDER BY g.name ASC`
    )
    .all();

  const users = await db
    .prepare('SELECT id, name, email FROM users ORDER BY email ASC LIMIT 500')
    .all();

  const pendingApplications = await db
    .prepare(
      `SELECT oa.id, oa.user_id, oa.calendar_name, oa.status, oa.admin_note, oa.created_at, oa.reviewed_at,
              u.name as user_name, u.email as user_email
       FROM official_applications oa
       JOIN users u ON u.id = oa.user_id
       WHERE oa.status = 'pending'
       ORDER BY oa.created_at ASC`
    )
    .all();

  return NextResponse.json({
    system_officials: systemOfficials.results || [],
    pending_applications: pendingApplications.results || [],
    links: links.results || [],
    calendars: (calendars.results || []).map((c: Record<string, unknown>) => ({
      ...c,
      is_official: !!c.is_official,
    })),
    users: users.results || [],
  });
}

/** 公式アカウント任命・カレンダー紐付け・公式カレンダー新規作成 */
export async function POST(request: NextRequest) {
  const { env } = getRequestContext();
  const db = (env as { DB: D1Database }).DB;
  if (!(await requireAdmin(request, db))) return adminUnauthorized();

  const body = (await request.json()) as {
    action: 'appoint_system' | 'link' | 'create_official_calendar' | 'review_application';
    user_id?: string;
    group_id?: string;
    calendar_name?: string;
    calendar_description?: string;
    application_id?: string;
    decision?: 'approve' | 'reject';
    admin_note?: string;
  };

  if (body.action === 'appoint_system') {
    if (!body.user_id) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    }
    await db.prepare('UPDATE users SET is_official = 1 WHERE id = ?').bind(body.user_id).run();
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'link') {
    if (!body.user_id || !body.group_id) {
      return NextResponse.json({ error: 'user_id and group_id required' }, { status: 400 });
    }
    const user = await db.prepare('SELECT id FROM users WHERE id = ?').bind(body.user_id).first();
    const group = await db.prepare('SELECT id FROM groups WHERE id = ?').bind(body.group_id).first();
    if (!user || !group) {
      return NextResponse.json({ error: 'User or calendar not found' }, { status: 404 });
    }
    const linkId = crypto.randomUUID();
    await db
      .prepare('INSERT OR IGNORE INTO group_officials (id, group_id, user_id) VALUES (?, ?, ?)')
      .bind(linkId, body.group_id, body.user_id)
      .run();
    const followId = crypto.randomUUID();
    await db
      .prepare('INSERT OR IGNORE INTO user_group_follows (id, user_id, group_id) VALUES (?, ?, ?)')
      .bind(followId, body.user_id, body.group_id)
      .run();
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'create_official_calendar') {
    if (!body.user_id || !body.calendar_name?.trim()) {
      return NextResponse.json({ error: 'user_id and calendar_name required' }, { status: 400 });
    }
    const user = await db.prepare('SELECT id FROM users WHERE id = ?').bind(body.user_id).first();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const groupId = crypto.randomUUID();
    await db
      .prepare('INSERT INTO groups (id, name, description, status) VALUES (?, ?, ?, ?)')
      .bind(groupId, body.calendar_name.trim(), body.calendar_description?.trim() || null, 'active')
      .run();
    const officialId = crypto.randomUUID();
    await db
      .prepare('INSERT INTO group_officials (id, group_id, user_id) VALUES (?, ?, ?)')
      .bind(officialId, groupId, body.user_id)
      .run();
    const followId = crypto.randomUUID();
    await db
      .prepare('INSERT OR IGNORE INTO user_group_follows (id, user_id, group_id) VALUES (?, ?, ?)')
      .bind(followId, body.user_id, groupId)
      .run();
    return NextResponse.json({ ok: true, group_id: groupId });
  }

  if (body.action === 'review_application') {
    if (!body.application_id || !body.decision) {
      return NextResponse.json({ error: 'application_id and decision required' }, { status: 400 });
    }
    if (body.decision === 'approve') {
      const result = await approveOfficialApplication(db, body.application_id, body.admin_note);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true, group_id: result.group_id });
    }
    const result = await rejectOfficialApplication(db, body.application_id, body.admin_note);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  const { env } = getRequestContext();
  const db = (env as { DB: D1Database }).DB;
  if (!(await requireAdmin(request, db))) return adminUnauthorized();

  const params = new URL(request.url).searchParams;
  const type = params.get('type');
  const id = params.get('id');
  const userId = params.get('user_id');
  const groupId = params.get('group_id');

  if (type === 'system' && userId) {
    await db.prepare('UPDATE users SET is_official = 0 WHERE id = ?').bind(userId).run();
    return NextResponse.json({ ok: true });
  }

  if (type === 'link' && userId && groupId) {
    await db
      .prepare('DELETE FROM group_officials WHERE user_id = ? AND group_id = ?')
      .bind(userId, groupId)
      .run();
    return NextResponse.json({ ok: true });
  }

  if (type === 'link' && id) {
    await db.prepare('DELETE FROM group_officials WHERE id = ?').bind(id).run();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid delete params' }, { status: 400 });
}
