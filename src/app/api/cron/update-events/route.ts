import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = (env as any).DB;
    
    // セキュリティチェック（Cron実行時のみ許可）
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Bearer ${(env as any).CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. 提案があるイベントIDの一覧を取得
    const eventsWithProposals = await db.prepare(`
      SELECT DISTINCT event_id FROM event_proposals
    `).all();

    const results = [];

    for (const row of (eventsWithProposals.results || [])) {
      const eventId = row.event_id;

      // 2. 投票を集計
      // 現状維持
      const currentVotesResult = await db.prepare(`
        SELECT COUNT(*) as count FROM proposal_votes WHERE event_id = ? AND proposal_id IS NULL
      `).bind(eventId).first() as { count: number };
      const currentVotes = currentVotesResult?.count || 0;

      // 各提案
      const proposalVotes = await db.prepare(`
        SELECT p.*, COUNT(v.user_id) as vote_count
        FROM event_proposals p
        LEFT JOIN proposal_votes v ON p.id = v.proposal_id
        WHERE p.event_id = ?
        GROUP BY p.id
        ORDER BY vote_count DESC, p.created_at ASC
      `).bind(eventId).all();

      const topProposal = proposalVotes.results?.[0] as any;
      const topVotes = topProposal?.vote_count || 0;

      // 3. 判定: 提案が現状維持を上回った場合のみ更新
      if (topProposal && topVotes > currentVotes) {
        // 更新実行
        await db.prepare(`
          UPDATE events 
          SET title = ?, description = ?, location = ?, address = ?, latitude = ?, longitude = ?, source_url = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(
          topProposal.title,
          topProposal.description,
          topProposal.location,
          topProposal.address,
          topProposal.latitude,
          topProposal.longitude,
          topProposal.source_url,
          eventId
        ).run();
        
        results.push({ eventId, status: 'updated', winner: topProposal.id });
      } else {
        results.push({ eventId, status: 'kept_current' });
      }

      // 4. クリーンアップ（そのイベントの提案と投票を削除）
      await db.prepare('DELETE FROM proposal_votes WHERE event_id = ?').bind(eventId).run();
      await db.prepare('DELETE FROM event_proposals WHERE event_id = ?').bind(eventId).run();
    }

    return NextResponse.json({ success: true, processed: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
