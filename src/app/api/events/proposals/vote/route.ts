import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getSessionUser } from '@/app/api/auth/me/route';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = (env as any).DB;
    const user = await getSessionUser(db, request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as any;
    const { event_id, proposal_id } = body; // proposal_id が null なら「現状維持」

    if (!event_id) {
      return NextResponse.json({ error: 'event_id is required' }, { status: 400 });
    }

    // セキュリティチェック: 提案IDが指定されたイベントに属しているか確認
    if (proposal_id) {
      const proposal = await db.prepare(`
        SELECT id FROM event_proposals WHERE id = ? AND event_id = ?
      `).bind(proposal_id, event_id).first();

      if (!proposal) {
        return NextResponse.json({ error: 'Invalid proposal ID for this event' }, { status: 400 });
      }
    }

    // INSERT OR REPLACE (UPSERT) を行う
    // D1で ON CONFLICT を使う場合は PRIMARY KEY が必要なので、SQLで DELETE & INSERT する
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
