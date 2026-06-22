import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { adminUnauthorized, requireAdmin } from '@/lib/admin/auth';
import { deleteEventCascade, deleteGroupCascade, deleteUserCascade } from '@/lib/admin/cascade';
import { parseStatus } from '@/lib/admin/moderation';
import {
  approveOfficialApplication,
  rejectOfficialApplication,
} from '@/lib/admin/official-applications';

export const runtime = 'edge';

type Resource = 'events' | 'officials' | 'users' | 'calendars';

function getResource(request: NextRequest): Resource | null {
  const r = new URL(request.url).searchParams.get('resource');
  if (r === 'events' || r === 'officials' || r === 'users' || r === 'calendars') return r;
  return null;
}

function unknownResource() {
  return NextResponse.json({ error: 'Unknown resource' }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const { env } = getRequestContext();
  const db = (env as { DB: D1Database }).DB;
  if (!(await requireAdmin(request, db))) return adminUnauthorized();

  const resource = getResource(request);
  const params = new URL(request.url).searchParams;

  if (resource === 'events') {
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

  if (resource === 'officials') {
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

  if (resource === 'users') {
    const q = params.get('q')?.trim() || '';
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

  if (resource === 'calendars') {
    const q = params.get('q')?.trim() || '';
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

  return unknownResource();
}

export async function POST(request: NextRequest) {
  const { env } = getRequestContext();
  const db = (env as { DB: D1Database }).DB;
  if (!(await requireAdmin(request, db))) return adminUnauthorized();

  const resource = getResource(request);
  if (resource !== 'officials') return unknownResource();

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

export async function PATCH(request: NextRequest) {
  const { env } = getRequestContext();
  const db = (env as { DB: D1Database }).DB;
  if (!(await requireAdmin(request, db))) return adminUnauthorized();

  const resource = getResource(request);

  if (resource === 'events') {
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

  if (resource === 'users') {
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

  if (resource === 'calendars') {
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

  return unknownResource();
}

export async function DELETE(request: NextRequest) {
  const { env } = getRequestContext();
  const db = (env as { DB: D1Database }).DB;
  if (!(await requireAdmin(request, db))) return adminUnauthorized();

  const resource = getResource(request);
  const params = new URL(request.url).searchParams;

  if (resource === 'events') {
    const id = params.get('id');
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

  if (resource === 'officials') {
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

  if (resource === 'users') {
    const id = params.get('id');
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

  if (resource === 'calendars') {
    const id = params.get('id');
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

  return unknownResource();
}
