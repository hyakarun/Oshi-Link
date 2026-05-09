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
    console.log('Proposal POST Body:', body);
    const { event_id, title, description, location, address, latitude, longitude, source_url } = body;

    if (!event_id || !title) {
      console.log('Missing fields:', { event_id, title });
      return NextResponse.json({ error: 'event_id and title are required' }, { status: 400 });
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
        INSERT INTO event_proposals (id, event_id, user_id, title, description, location, address, latitude, longitude, source_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, 
        event_id, 
        user.id, 
        title, 
        description || null, 
        location || null, 
        address || null, 
        latitude ?? null, 
        longitude ?? null, 
        source_url || null
      ).run();
      
      console.log('Proposal created successfully:', id);
      return NextResponse.json({ success: true, id });
    } catch (dbError: any) {
      console.error('DB Error creating proposal:', dbError);
      return NextResponse.json({ error: 'データベースエラーが発生しました', details: dbError.message }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
