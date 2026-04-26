import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getSessionUser } from '@/app/api/auth/me/route';

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

export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = (env as any).DB;

    // セッションからユーザーを取得
    const user = await getSessionUser(db, request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as any;
    const { group_id, title, date, end_time, description, category, location, source_url } = body;
    const added_by = user.id;

    // Validate required fields and lengths
    if (!group_id || !title || !date) {
      return NextResponse.json({ error: 'Missing required fields: group_id, title, date' }, { status: 400 });
    }
    if (title.length > 100) {
      return NextResponse.json({ error: 'タイトルが長すぎます（最大100文字）' }, { status: 400 });
    }
    if (description && description.length > 2000) {
      return NextResponse.json({ error: '説明文が長すぎます（最大2000文字）' }, { status: 400 });
    }

    // Validate URL safety
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

    const eventId = crypto.randomUUID();

    await db.prepare(
      'INSERT INTO events (id, group_id, title, date, end_time, description, category, location, source_url, added_by, is_tentative) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)'
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
      added_by
    ).run();

    // デフォルトで投稿者を最初の「正確」投票者として登録
    const verifyId = crypto.randomUUID();
    await db.prepare(
      'INSERT INTO verifications (id, event_id, user_id, verification_status, source_url) VALUES (?, ?, ?, ?, ?)'
    ).bind(verifyId, eventId, added_by, 'confirmed', safeSourceUrl || null).run();

    return NextResponse.json({ id: eventId }, { status: 201 });
  } catch (error: any) {
    console.error('POST Error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
