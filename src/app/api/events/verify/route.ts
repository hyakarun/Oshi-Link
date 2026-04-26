import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { env } = getRequestContext();
    const db = (env as any).DB;
    const { event_id, user_id, status, comment } = await request.json() as any;

    if (!event_id || !user_id || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 既存の自分の投票があれば更新、なければ挿入
    await db.prepare(`
      INSERT INTO verifications (id, event_id, user_id, verification_status, source_url)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, event_id) DO UPDATE SET
        verification_status = excluded.verification_status,
        source_url = excluded.source_url,
        created_at = CURRENT_TIMESTAMP
    `).bind(crypto.randomUUID(), event_id, user_id, status, comment || null).run();

    // 最新の統計を取得
    const stats = await db.prepare(`
      SELECT 
        SUM(CASE WHEN verification_status = 'confirmed' THEN 1 ELSE 0 END) as confirms,
        SUM(CASE WHEN verification_status = 'disputed' THEN 1 ELSE 0 END) as disputes
      FROM verifications WHERE event_id = ?
    `).bind(event_id).first();

    const confirms = Number(stats.confirms || 0);
    const disputes = Number(stats.disputes || 0);

    // 一定数以上の「不正確」投票で自動削除
    if (disputes >= 5) {
      await db.prepare('DELETE FROM events WHERE id = ?').bind(event_id).run();
      await db.prepare('DELETE FROM verifications WHERE event_id = ?').bind(event_id).run();
      return NextResponse.json({ success: true, deleted: true });
    }

    // 合意形成ロジック（例：確認数が5以上かつ不正確の3倍以上なら「確定」）
    const is_tentative = (confirms >= 5 && confirms > disputes * 3) ? 0 : 1;

    await db.prepare(`
      UPDATE events 
      SET confirms_count = ?, disputes_count = ?, is_tentative = ? 
      WHERE id = ?
    `).bind(confirms, disputes, is_tentative, event_id).run();

    return NextResponse.json({ success: true, confirms, disputes, is_tentative });
  } catch (error: any) {
    console.error('Verify API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
