import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

// GET /api/groups?user_id=xxx  → 全グループ一覧 + フォロー状態 + フォロワー数
export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = (env as unknown as { DB: D1Database }).DB;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    const result = await db.prepare(`
      SELECT
        g.id,
        g.name,
        g.description,
        g.avatar_url,
        g.created_at,
        COUNT(DISTINCT e.id) as event_count,
        COUNT(DISTINCT f.id) as follower_count
      FROM groups g
      LEFT JOIN events e ON e.group_id = g.id
      LEFT JOIN user_group_follows f ON f.group_id = g.id
      GROUP BY g.id
      ORDER BY follower_count DESC, g.name ASC
    `).all();

    let userFollowData: Record<string, { custom_bg_image: string | null; custom_theme_color: string | null }> = {};
    if (userId) {
      const followResult = await db.prepare(
        'SELECT group_id, custom_bg_image, custom_theme_color FROM user_group_follows WHERE user_id = ?'
      ).bind(userId).all();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (followResult.results as any[]).forEach(r => {
        userFollowData[r.group_id] = { custom_bg_image: r.custom_bg_image, custom_theme_color: r.custom_theme_color };
      });
    }

    const groups = (result.results as {
      id: string; name: string; description?: string;
      avatar_url?: string; event_count: number; follower_count: number;
    }[]).map(g => ({
      ...g,
      is_following: !!userFollowData[g.id],
      custom_bg_image: userFollowData[g.id]?.custom_bg_image,
      custom_theme_color: userFollowData[g.id]?.custom_theme_color,
    }));

    return NextResponse.json({ groups });
  } catch (error) {
    const e = error as Error;
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/groups  → グループを新規作成（誰でも作れるWiki型）
export async function POST(request: Request) {
  try {
    const { env } = getRequestContext();
    const db = (env as unknown as { DB: D1Database }).DB;
    const { name, description, avatar_url, created_by } = await request.json() as {
      name: string; description?: string; avatar_url?: string; created_by?: string;
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

    const id = crypto.randomUUID();
    await db.prepare(
      'INSERT INTO groups (id, name, description, avatar_url) VALUES (?, ?, ?, ?)'
    ).bind(id, name, description || null, safeAvatarUrl || null).run();

    // 作成者を自動フォロー
    if (created_by) {
      const followId = crypto.randomUUID();
      await db.prepare(
        'INSERT OR IGNORE INTO user_group_follows (id, user_id, group_id) VALUES (?, ?, ?)'
      ).bind(followId, created_by, id).run();
    }

    return NextResponse.json(
      { id, name, description, avatar_url, event_count: 0, follower_count: 0, is_following: true },
      { status: 201 }
    );
  } catch (error) {
    const e = error as Error;
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
