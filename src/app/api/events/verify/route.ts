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

    // 2. 最新の統計を取得 (ユーザーのステータスに応じた重み付け)
    // 課金ユーザーは3倍の影響度
    const statsResult = await db.prepare(`
      SELECT 
        SUM(CASE WHEN v.verification_status = 'confirmed' THEN (CASE WHEN u.premium_status = 'pro' THEN 3 ELSE 1 END) ELSE 0 END) as confirms,
        SUM(CASE WHEN v.verification_status = 'disputed' THEN (CASE WHEN u.premium_status = 'pro' THEN 3 ELSE 1 END) ELSE 0 END) as disputes
      FROM verifications v
      JOIN users u ON v.user_id = u.id
      WHERE v.event_id = ?
    `).bind(event_id).first() as { confirms: number; disputes: number };

    const confirms = Number(statsResult?.confirms || 0);
    const disputes = Number(statsResult?.disputes || 0);

    console.log('Stats calculated:', { confirms, disputes });

    // 3. 判定ロジックの更新
    // 正確（Verified）: 100pt以上に達した場合
    const verified = confirms >= 100 ? 1 : 0;
    const is_tentative = verified ? 0 : 1; 

    // 不正確（Disputed）: 50pt以上に達した場合
    const disputed = disputes >= 50 ? 1 : 0;

    await db.prepare(`
      UPDATE events 
      SET confirms_count = ?, disputes_count = ?, is_tentative = ?, verified = ?, disputed = ?
      WHERE id = ?
    `).bind(confirms, disputes, is_tentative, verified, disputed, event_id).run();

    return NextResponse.json({ success: true, confirms, disputes, is_tentative, verified, disputed, user_vote: status });
  } catch (error: any) {
    console.error('Verify API Error Details:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
