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

    const id = crypto.randomUUID();
    
    // 既存の自分の投票があれば更新、なければ挿入
    await db.prepare(`
      INSERT INTO verifications (id, event_id, user_id, status, comment)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(event_id, user_id) DO UPDATE SET
        status = excluded.status,
        comment = excluded.comment,
        created_at = CURRENT_TIMESTAMP
    `).bind(id, event_id, user_id, status, comment || null).run();

    // イベントの検証ステータスを更新（簡易的な合意形成ロジック）
    // 本来は非同期で行うかバックグラウンドで行うべきですが、MVPとしてここでカウント
    const stats = await db.prepare(`
      SELECT 
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirms,
        SUM(CASE WHEN status = 'disputed' THEN 1 ELSE 0 END) as disputes
      FROM verifications WHERE event_id = ?
    `).bind(event_id).first();

    const verified = (stats.confirms || 0) > (stats.disputes || 0) ? 1 : 0;
    await db.prepare('UPDATE events SET verified = ? WHERE id = ?').bind(verified, event_id).run();

    return NextResponse.json({ success: true, verified });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
