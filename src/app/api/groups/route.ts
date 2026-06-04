import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getSessionUser } from '@/app/api/auth/me/route';
import { fetchGroupsList } from '@/lib/api/calendar-data';

export const runtime = 'edge';

// GET /api/groups → 全グループ一覧 + フォロー状態 + フォロワー数
export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = (env as unknown as { DB: D1Database }).DB;

    const user = await getSessionUser(db, request);
    const groups = await fetchGroupsList(db, user?.id);

    return NextResponse.json({ groups });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/groups → グループを新規作成
export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = (env as unknown as { DB: D1Database }).DB;

    const user = await getSessionUser(db, request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, avatar_url } = await request.json() as {
      name: string; description?: string; avatar_url?: string;
    };
    
    let safeAvatarUrl = avatar_url;
    if (safeAvatarUrl) {
      if (!safeAvatarUrl.startsWith('http://') && !safeAvatarUrl.startsWith('https://')) {
        safeAvatarUrl = 'https://' + safeAvatarUrl;
      }
      try {
        const u = new URL(safeAvatarUrl);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          return NextResponse.json({ error: '無効なURLプロトコルです' }, { status: 400 });
        }
        safeAvatarUrl = u.toString();
      } catch {
        return NextResponse.json({ error: '無効なURLフォーマットです' }, { status: 400 });
      }
    }

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (name.length > 50) {
      return NextResponse.json({ error: '名前が長すぎます（最大50文字）' }, { status: 400 });
    }
    if (description && description.length > 500) {
      return NextResponse.json({ error: '説明文が長すぎます（最大500文字）' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    await db.prepare(
      'INSERT INTO groups (id, name, description, avatar_url) VALUES (?, ?, ?, ?)'
    ).bind(id, name, description || null, safeAvatarUrl || null).run();

    // 作成者を自動フォロー
    const followId = crypto.randomUUID();
    await db.prepare(
      'INSERT OR IGNORE INTO user_group_follows (id, user_id, group_id) VALUES (?, ?, ?)'
    ).bind(followId, user.id, id).run();

    return NextResponse.json(
      { id, name, description, avatar_url, event_count: 0, follower_count: 1, is_following: true },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
