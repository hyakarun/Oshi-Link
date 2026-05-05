import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getSessionUser } from '@/app/api/auth/me/route';

export const runtime = 'edge';

// GET /api/groups/follow  → フォロー中グループ一覧
export async function GET(request: NextRequest) {
  const { env } = getRequestContext();
  const db = (env as any).DB;
  
  const user = await getSessionUser(db, request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await db.prepare(`
      SELECT g.id, g.name, g.description, g.avatar_url, g.created_at, f.custom_bg_image, f.custom_theme_color
      FROM user_group_follows f
      JOIN groups g ON f.group_id = g.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `).bind(user.id).all();

    return NextResponse.json({ groups: result.results });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/groups/follow  → フォロー / アンフォロー（トグル）
export async function POST(request: NextRequest) {
  const { env } = getRequestContext();
  const db = (env as any).DB;

  const user = await getSessionUser(db, request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as { group_id: string; action?: 'follow' | 'unfollow' };
    const { group_id, action } = body;

    if (!group_id) {
      return NextResponse.json({ error: 'group_id required' }, { status: 400 });
    }

    // 既存チェック
    const existing = await db.prepare(
      'SELECT id FROM user_group_follows WHERE user_id = ? AND group_id = ?'
    ).bind(user.id, group_id).first();

    if (existing || action === 'unfollow') {
      // アンフォロー
      await db.prepare(
        'DELETE FROM user_group_follows WHERE user_id = ? AND group_id = ?'
      ).bind(user.id, group_id).run();
      return NextResponse.json({ status: 'unfollowed' });
    } else {
      // フォロー制限チェック
      const followCountResult = await db.prepare(
        'SELECT COUNT(*) as count FROM user_group_follows WHERE user_id = ?'
      ).bind(user.id).first() as { count: number };
      
      const followCount = followCountResult.count;
      const premiumStatus = user.premium_status || 'free';

      let limit = 1; // 無課金・買い切り（広告削除のみ）
      if (premiumStatus === 'pro') limit = 10; // プロ（サブスクリプション）

      if (followCount >= limit) {
        return NextResponse.json({ 
          error: `フォロー上限に達しました（${limit}件）。アップグレードを検討してください。`,
          limitReached: true 
        }, { status: 403 });
      }

      // フォロー
      const id = crypto.randomUUID();
      await db.prepare(
        'INSERT INTO user_group_follows (id, user_id, group_id) VALUES (?, ?, ?)'
      ).bind(id, user.id, group_id).run();
      return NextResponse.json({ status: 'followed' });
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH /api/groups/follow  → 個人設定 (カスタム背景/カラー) の更新
export async function PATCH(request: NextRequest) {
  const { env } = getRequestContext();
  const db = (env as any).DB;

  const user = await getSessionUser(db, request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as { group_id: string; custom_bg_image: string | null; custom_theme_color: string | null };
    const { group_id, custom_bg_image, custom_theme_color } = body;

    if (!group_id) {
      return NextResponse.json({ error: 'group_id required' }, { status: 400 });
    }

    // UPDATE
    const updateResult = await db.prepare(
      'UPDATE user_group_follows SET custom_bg_image = ?, custom_theme_color = ? WHERE user_id = ? AND group_id = ?'
    ).bind(custom_bg_image || null, custom_theme_color || null, user.id, group_id).run();

    if (updateResult.meta.changes === 0) {
      return NextResponse.json({ error: 'Not following this group' }, { status: 404 });
    }

    return NextResponse.json({ status: 'updated' });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
