import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface Env {
  DB: D1Database;
}

// GET /api/groups/follow?user_id=xxx  → フォロー中グループ一覧
export async function GET(request: NextRequest) {
  const env = process.env as unknown as Env;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');

  if (!userId) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 });
  }

  try {
    const result = await env.DB.prepare(`
      SELECT g.id, g.name, g.description, g.avatar_url, g.created_at
      FROM user_group_follows f
      JOIN groups g ON f.group_id = g.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `).bind(userId).all();

    return NextResponse.json({ groups: result.results });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/groups/follow  → フォロー / アンフォロー（トグル）
export async function POST(request: NextRequest) {
  const env = process.env as unknown as Env;

  try {
    const body = await request.json() as { user_id: string; group_id: string; action?: 'follow' | 'unfollow' };
    const { user_id, group_id, action } = body;

    if (!user_id || !group_id) {
      return NextResponse.json({ error: 'user_id and group_id required' }, { status: 400 });
    }

    // 既存チェック
    const existing = await env.DB.prepare(
      'SELECT id FROM user_group_follows WHERE user_id = ? AND group_id = ?'
    ).bind(user_id, group_id).first();

    if (existing || action === 'unfollow') {
      // アンフォロー
      await env.DB.prepare(
        'DELETE FROM user_group_follows WHERE user_id = ? AND group_id = ?'
      ).bind(user_id, group_id).run();
      return NextResponse.json({ status: 'unfollowed' });
    } else {
      // フォロー
      const id = crypto.randomUUID();
      await env.DB.prepare(
        'INSERT INTO user_group_follows (id, user_id, group_id) VALUES (?, ?, ?)'
      ).bind(id, user_id, group_id).run();
      return NextResponse.json({ status: 'followed' });
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
