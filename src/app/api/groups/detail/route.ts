import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

interface Env {
  DB: D1Database;
}

// GET /api/groups/detail?group_id=xxx
export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = (env as unknown as Env).DB;
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    if (!groupId) {
      return NextResponse.json({ error: 'group_idが必要です' }, { status: 400 });
    }

    // 1. グループ基本情報の取得
    const group = await db.prepare(`
      SELECT 
        g.id, 
        g.name, 
        g.description, 
        g.avatar_url, 
        g.created_at,
        EXISTS(SELECT 1 FROM group_officials o WHERE o.group_id = g.id) as is_official
      FROM groups g
      WHERE g.id = ?
    `).bind(groupId).first() as {
      id: string;
      name: string;
      description: string | null;
      avatar_url: string | null;
      created_at: string;
      is_official: number;
    } | null;

    if (!group) {
      return NextResponse.json({ error: 'カレンダーが見つかりません' }, { status: 404 });
    }

    // 2. 統計データの取得（フォロワー数、総イベント数）
    const stats = await db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM user_group_follows WHERE group_id = ?) as follower_count,
        (SELECT COUNT(*) FROM events WHERE group_id = ?) as event_count
    `).bind(groupId, groupId).first() as {
      follower_count: number;
      event_count: number;
    };

    // 3. 今日以降の直近3件のイベントを取得
    const todayStr = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z';
    const upcomingEventsResult = await db.prepare(`
      SELECT id, title, date, location
      FROM events
      WHERE group_id = ? AND date >= ?
      ORDER BY date ASC
      LIMIT 3
    `).bind(groupId, todayStr).all();

    return NextResponse.json({
      group: {
        ...group,
        is_official: !!group.is_official,
        follower_count: stats.follower_count,
        event_count: stats.event_count,
      },
      upcoming_events: upcomingEventsResult.results
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
