import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

interface Env {
  DB: D1Database;
}

// セッショントークンからユーザーを取得する共通関数（他のAPIからも利用可能）
export async function getSessionUser(db: D1Database, request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '') || '';
  if (!token) return null;

  const session = await db.prepare(
    'SELECT s.*, u.id as uid, u.name, u.email, u.avatar_url, u.premium_status, u.notifications_enabled, u.email_enabled, u.push_enabled, u.notification_timing, u.is_official FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ?'
  ).bind(token).first() as {
    token: string; user_id: string; expires_at: string;
    uid: string; name: string; email: string; avatar_url: string; premium_status: string;
    notifications_enabled: number; email_enabled: number; push_enabled: number; notification_timing: string;
    is_official: number;
  } | null;

  if (!session) return null;
  if (new Date(session.expires_at) < new Date()) return null;

  return { 
    id: session.uid, 
    name: session.name, 
    email: session.email, 
    avatar_url: session.avatar_url,
    premium_status: session.premium_status || 'free',
    notifications_enabled: !!session.notifications_enabled,
    email_enabled: !!session.email_enabled,
    push_enabled: !!session.push_enabled,
    is_official: !!session.is_official,
    notification_timing: (session.notification_timing || '10m') as any
  };
}

// GET /api/auth/me  → セッションから現在のユーザーを取得
export async function GET(request: NextRequest) {
  const { env } = getRequestContext();
  const db = (env as unknown as Env).DB;

  const user = await getSessionUser(db, request);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  // 不正確（disputed）と判定され、かつ未確認の予定があるかチェック
  let hasNewDispute = false;
  try {
    const disputed = await db.prepare(
      'SELECT id FROM events WHERE created_by = ? AND disputed = 1 AND dispute_acknowledged = 0 LIMIT 1'
    ).bind(user.id).all();

    hasNewDispute = !!(disputed.results && disputed.results.length > 0);

    if (hasNewDispute) {
      // 今回のログインで警告を出すため、既読（1）に更新
      await db.prepare(
        'UPDATE events SET dispute_acknowledged = 1 WHERE created_by = ? AND disputed = 1 AND dispute_acknowledged = 0'
      ).bind(user.id).run();
    }
  } catch (err) {
    console.error('Dispute warning check failed:', err);
  }

  return NextResponse.json({ 
    user, 
    dispute_warning: hasNewDispute 
  });
}

// DELETE /api/auth/me  → ログアウト（セッション削除）
export async function DELETE(request: NextRequest) {
  const { env } = getRequestContext();
  const db = (env as unknown as Env).DB;

  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '') || '';

  if (token) {
    await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
  }

  return NextResponse.json({ ok: true });
}
