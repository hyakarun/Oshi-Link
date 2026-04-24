import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

interface Env {
  DB: D1Database;
}

// GET /api/auth/verify?token=xxx  → Magic Link を検証してセッションを発行
export async function GET(request: NextRequest) {
  const { env } = getRequestContext();
  const db = (env as unknown as Env).DB;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'トークンが必要です' }, { status: 400 });
  }

  // 1. Magic Link を検索
  const link = await db.prepare(
    'SELECT * FROM magic_links WHERE token = ? AND used = 0'
  ).bind(token).first() as { token: string; email: string; expires_at: string } | null;

  if (!link) {
    return NextResponse.json({ error: 'リンクが無効です' }, { status: 400 });
  }

  // 2. 有効期限チェック
  if (new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ error: 'リンクの有効期限が切れています' }, { status: 400 });
  }

  // 3. Magic Link を使用済みにする（1回限り）
  await db.prepare('UPDATE magic_links SET used = 1 WHERE token = ?').bind(token).run();

  // 4. ユーザーを取得
  const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(link.email).first() as {
    id: string; name: string; email: string;
  } | null;

  if (!user) {
    return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
  }

  // 5. セッショントークンを生成（30日間有効）
  const sessionToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').bind(sessionToken, user.id, expiresAt).run();

  return NextResponse.json({
    ok: true,
    sessionToken,
    user: { id: user.id, name: user.name, email: user.email },
  });
}
