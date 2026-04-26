import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getSessionUser } from '@/app/api/auth/me/route';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { env } = getRequestContext();
    const db = (env as any).DB;
    
    // セッションからユーザーを取得（外部からの user_id 指定を無視し、自身のIDを強制）
    const user = await getSessionUser(db, request as any);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as any;
    const { event_id, status, comment } = body;
    const user_id = user.id;

    console.log('Verify Request:', { event_id, user_id, status });

    if (!event_id || !user_id || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. 既存の自分の投票を処理 (INSERT OR REPLACE で代用して ON CONFLICT の構文問題を回避)
    // D1の ON CONFLICT が不安定な場合があるため、明示的な DELETE -> INSERT も検討
    await db.prepare(`
      DELETE FROM verifications WHERE user_id = ? AND event_id = ?
    `).bind(user_id, event_id).run();

    const verifyId = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO verifications (id, event_id, user_id, verification_status, source_url)
      VALUES (?, ?, ?, ?, ?)
    `).bind(verifyId, event_id, user_id, status, comment || null).run();

    // 2. 最新の統計を取得
    const stats: any = await db.prepare(`
      SELECT 
        SUM(CASE WHEN verification_status = 'confirmed' THEN 1 ELSE 0 END) as confirms,
        SUM(CASE WHEN verification_status = 'disputed' THEN 1 ELSE 0 END) as disputes
      FROM verifications WHERE event_id = ?
    `).bind(event_id).first();

    const confirms = Number(stats?.confirms || 0);
    const disputes = Number(stats?.disputes || 0);

    console.log('Stats calculated:', { confirms, disputes });

    // 3. 一定数以上の「不正確」投票で自動削除 (FK制約を考慮して子テーブルから先に消す)
    if (disputes >= 5) {
      await db.prepare('DELETE FROM verifications WHERE event_id = ?').bind(event_id).run();
      await db.prepare('DELETE FROM events WHERE id = ?').bind(event_id).run();
      return NextResponse.json({ success: true, deleted: true });
    }

    // 4. 合意形成ロジック
    const is_tentative = (confirms >= 5 && confirms > disputes * 3) ? 0 : 1;

    await db.prepare(`
      UPDATE events 
      SET confirms_count = ?, disputes_count = ?, is_tentative = ? 
      WHERE id = ?
    `).bind(confirms, disputes, is_tentative, event_id).run();

    return NextResponse.json({ success: true, confirms, disputes, is_tentative });
  } catch (error: any) {
    console.error('Verify API Error Details:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
