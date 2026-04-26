import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = (env as any).DB;

    if (!db) {
      return NextResponse.json({ error: 'DB not bound' }, { status: 500 });
    }

    const result = await db.prepare('SELECT * FROM events ORDER BY date ASC').all();
    return NextResponse.json(result.results ?? []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = getRequestContext();
    if (!ctx || !ctx.env || !(ctx.env as any).DB) {
      return NextResponse.json({ error: 'D1 binding not found' }, { status: 500 });
    }
    const db = (ctx.env as any).DB;

    const body = await request.json() as any;
    const { group_id, title, date, end_time, description, category, location, user_id, source_url } = body;
    const added_by = user_id;

    // Validate required fields
    if (!group_id || !title || !date) {
      return NextResponse.json({ error: 'Missing required fields: group_id, title, date' }, { status: 400 });
    }

    // Validate URL safety if source_url is provided
    let safeSourceUrl = source_url;
    if (safeSourceUrl) {
      if (!safeSourceUrl.startsWith('http://') && !safeSourceUrl.startsWith('https://')) {
        safeSourceUrl = 'https://' + safeSourceUrl;
      }
      try {
        const u = new URL(safeSourceUrl);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          return NextResponse.json({ error: '無効なURLプロトコルです' }, { status: 400 });
        }
        safeSourceUrl = u.toString();
      } catch {
        return NextResponse.json({ error: '無効なURLフォーマットです' }, { status: 400 });
      }
    }

    // Generate UUID safely
    const eventId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2) + Date.now().toString(36);

    const target_added_by = added_by || 'system_user';

    // 0. Ensure user exists (upsert) to satisfy FK constraint
    const userEmail = `${target_added_by}@oshi-link.app`;
    await db.prepare(
      'INSERT OR IGNORE INTO users (id, name, email) VALUES (?, ?, ?)'
    ).bind(target_added_by, target_added_by, userEmail).run();

    await db.prepare(
      'INSERT INTO events (id, group_id, title, date, end_time, description, category, location, source_url, added_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      eventId, 
      group_id, 
      title, 
      date,
      end_time || null, 
      description || null, 
      category || '出演',
      location || null,
      safeSourceUrl || null, 
      target_added_by
    ).run();

    // 2. Insert Verification (Optional)
    if (source_url) {
      const verifyId = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : Math.random().toString(36).substring(2) + Date.now().toString(36);

      await db.prepare(
        'INSERT INTO verifications (id, event_id, user_id, verification_status, source_url) VALUES (?, ?, ?, ?, ?)'
      ).bind(verifyId, eventId, target_added_by, 'pending', source_url).run();
    }

    return NextResponse.json({ id: eventId }, { status: 201 });
  } catch (error: any) {
    console.error('POST Error:', error);
    return NextResponse.json({ error: 'Server collision or DB error', details: error.message }, { status: 500 });
  }
}
