import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

interface Env {
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
}

// POST /api/auth/google  → Google IDトークンを検証してログイン
export async function POST(request: NextRequest) {
  const { env } = getRequestContext();
  const db = (env as unknown as Env).DB;
  const clientId = (env as unknown as Env).GOOGLE_CLIENT_ID;

  try {
    const { credential, is_official, calendar_name } = await request.json() as {
      credential: string; is_official?: boolean; calendar_name?: string;
    };

    if (!credential) {
      return NextResponse.json({ error: 'トークンが必要です' }, { status: 400 });
    }

    if (is_official && (!calendar_name || calendar_name.trim().length === 0)) {
      return NextResponse.json({ error: '公式カレンダーとして登録する場合はカレンダー名を入力してください' }, { status: 400 });
    }

    // 1. Googleのトークン検証エンドポイントを叩く (Edge環境で最も安全かつ簡単な方法)
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!googleRes.ok) {
      return NextResponse.json({ error: 'Googleトークンの検証に失敗しました' }, { status: 401 });
    }

    const profile = await googleRes.json() as {
      sub: string; // Google User ID
      email: string;
      name: string;
      picture?: string;
      aud: string; // Client ID
    };
    console.log('Google profile:', profile);
    console.log('Request body:', { is_official, calendar_name });

    // 2. Client ID の一致確認 (重要)
    // clientId が未設定 (ローカル開発等) の場合は aud 検証をスキップ
    if (clientId && profile.aud !== clientId) {
      return NextResponse.json({ error: '不正なクライアントIDです' }, { status: 401 });
    }

    // 3. ユーザーを検索・登録
    let user = await db.prepare('SELECT * FROM users WHERE google_id = ? OR email = ?')
      .bind(profile.sub, profile.email)
      .first() as { id: string; name: string; email: string; google_id?: string, avatar_url?: string } | null;

    const isNewUser = !user;

    if (!user) {
      const userId = crypto.randomUUID();
      const officialFlag = is_official ? 1 : 0;
      await db.prepare('INSERT INTO users (id, name, email, google_id, avatar_url, is_official) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(userId, profile.name, profile.email, profile.sub, profile.picture || null, officialFlag)
        .run();
      user = { id: userId, name: profile.name, email: profile.email, google_id: profile.sub, avatar_url: profile.picture };
    } else {
      // 既存ユーザー情報の更新（Google IDの紐付けやアイコンの更新を強制）
      await db.prepare('UPDATE users SET google_id = ?, avatar_url = COALESCE(?, avatar_url) WHERE id = ?')
        .bind(profile.sub, profile.picture || null, user.id)
        .run();
      // userオブジェクトに最新のpictureを反映させる
      user.avatar_url = profile.picture || user.avatar_url;
    }

    // 新規ユーザーかつ公式登録の場合：カレンダー作成 + group_officials登録
    if (isNewUser && is_official && calendar_name?.trim()) {
      const groupId = crypto.randomUUID();
      await db.prepare('INSERT INTO groups (id, name) VALUES (?, ?)').bind(groupId, calendar_name.trim()).run();
      const officialId = crypto.randomUUID();
      await db.prepare('INSERT INTO group_officials (id, group_id, user_id) VALUES (?, ?, ?)').bind(officialId, groupId, user.id).run();
    }

    // 4. セッション発行 (30日間)
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').bind(sessionToken, user.id, expiresAt).run();

    return NextResponse.json({
      ok: true,
      sessionToken,
      user: { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url },
    });

  } catch (e: any) {
    console.error('Google Auth Error:', e);
    return NextResponse.json({ error: `認証処理中にエラーが発生しました: ${e?.message || e}` }, { status: 500 });
  }
}
