import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getSessionUser } from '@/app/api/auth/me/route';

export const runtime = 'edge';

// 提案一覧の取得
export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = (env as any).DB;
    const { searchParams } = new URL(request.url);
    const event_id = searchParams.get('event_id');

    if (!event_id) {
      return NextResponse.json({ error: 'event_id is required' }, { status: 400 });
    }

    // セッションユーザーを取得（投票済みか確認するため）
    const user = await getSessionUser(db, request);
    const userId = user?.id || null;

    // 提案一覧を取得
    const proposals = await db.prepare(`
      SELECT p.*, u.name as user_name,
      (SELECT COUNT(*) FROM proposal_votes v WHERE v.proposal_id = p.id) as vote_count
      FROM event_proposals p
      JOIN users u ON p.user_id = u.id
      WHERE p.event_id = ?
      ORDER BY p.created_at ASC
    `).bind(event_id).all();

    // 現状維持の投票数を取得
    const currentVotes = await db.prepare(`
      SELECT COUNT(*) as count FROM proposal_votes WHERE event_id = ? AND proposal_id IS NULL
    `).bind(event_id).first() as { count: number };

    // ユーザーがどこに投票したか取得
    const myVote = userId ? await db.prepare(`
      SELECT proposal_id FROM proposal_votes WHERE event_id = ? AND user_id = ?
    `).bind(event_id, userId).first() as { proposal_id: string | null } : null;

    return NextResponse.json({
      proposals: proposals.results,
      current_votes: currentVotes?.count || 0,
      my_vote: myVote ? (myVote.proposal_id || 'current') : null
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 修正案の投稿
export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = (env as any).DB;
    const user = await getSessionUser(db, request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as any;
    const { event_id, title, description, reason, location, address, latitude, longitude, source_url } = body;

    if (!event_id || !title) {
      console.log('Missing fields:', { event_id, title });
      return NextResponse.json({ error: 'event_id and title are required' }, { status: 400 });
    }

    // 対象イベントのグループが公式カレンダーかチェック
    const event = await db.prepare('SELECT group_id FROM events WHERE id = ?').bind(event_id).first() as { group_id: string } | null;
    if (!event) {
      return NextResponse.json({ error: 'イベントが見つかりません' }, { status: 404 });
    }

    const isGroupOfficial = await db.prepare(
      'SELECT 1 FROM group_officials WHERE group_id = ?'
    ).bind(event.group_id).first();

    if (isGroupOfficial) {
      const isOfficialGroupUser = await db.prepare(
        'SELECT 1 FROM group_officials WHERE group_id = ? AND user_id = ?'
      ).bind(event.group_id, user.id).first();

      if (!isOfficialGroupUser && !user.is_official) {
        return NextResponse.json({ error: '公式カレンダーの予定に修正提案を送信することはできません' }, { status: 403 });
      }
    }

    // 先着3件チェック
    const countResult = await db.prepare(`
      SELECT COUNT(*) as count FROM event_proposals WHERE event_id = ?
    `).bind(event_id).first() as { count: number };

    if (countResult && countResult.count >= 3) {
      return NextResponse.json({ error: '提案は最大3件までです。すでに満計です。' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    try {
      await db.prepare(`
        INSERT INTO event_proposals (id, event_id, user_id, title, description, reason, location, address, latitude, longitude, source_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, 
        event_id, 
        user.id, 
        title, 
        description || null, 
        reason || null,
        location || null, 
        address || null, 
        latitude ?? null, 
        longitude ?? null, 
        source_url || null
      ).run();
      
      return NextResponse.json({ success: true, id });
    } catch (dbError: any) {
      console.error('DB Error creating proposal:', dbError);
      return NextResponse.json({ error: 'データベースエラーが発生しました', details: dbError.message }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 提案への投票（proposal_id が null なら「現状維持」）
export async function PUT(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = (env as any).DB;
    const user = await getSessionUser(db, request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as any;
    const { event_id, proposal_id } = body;

    if (!event_id) {
      return NextResponse.json({ error: 'event_id is required' }, { status: 400 });
    }

    if (proposal_id) {
      const proposal = await db.prepare(`
        SELECT id FROM event_proposals WHERE id = ? AND event_id = ?
      `).bind(proposal_id, event_id).first();

      if (!proposal) {
        return NextResponse.json({ error: 'Invalid proposal ID for this event' }, { status: 400 });
      }
    }

    await db.prepare(`
      DELETE FROM proposal_votes WHERE event_id = ? AND user_id = ?
    `).bind(event_id, user.id).run();

    await db.prepare(`
      INSERT INTO proposal_votes (event_id, user_id, proposal_id)
      VALUES (?, ?, ?)
    `).bind(event_id, user.id, proposal_id || null).run();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
