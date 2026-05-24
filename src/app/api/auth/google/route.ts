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
    let credential = '';
    let is_official = false;
    let calendar_name = '';
    let group = '';

    const bodyText = await request.text();

    if (bodyText.trim().startsWith('{')) {
      const body = JSON.parse(bodyText) as {
        credential: string; is_official?: boolean; calendar_name?: string; group?: string;
      };
      credential = body.credential;
      is_official = !!body.is_official;
      calendar_name = body.calendar_name || '';
      group = body.group || '';
    } else {
      const params = new URLSearchParams(bodyText);
      credential = params.get('credential') || '';
      const stateStr = params.get('state') || '';
      if (stateStr) {
        try {
          const state = JSON.parse(decodeURIComponent(stateStr)) as {
            is_official?: boolean;
            calendar_name?: string;
            group?: string;
          };
          is_official = !!state.is_official;
          calendar_name = state.calendar_name || '';
          group = state.group || '';
        } catch (err) {
          console.error('Failed to parse state:', err);
        }
      }
    }

    if (!credential) {
      const redirectUrl = new URL(`${request.nextUrl.origin}/login`);
      redirectUrl.searchParams.set('error', 'トークンが必要です');
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }

    if (is_official && (!calendar_name || calendar_name.trim().length === 0)) {
      const redirectUrl = new URL(`${request.nextUrl.origin}/login`);
      redirectUrl.searchParams.set('error', '公式カレンダーとして登録する場合はカレンダー名を入力してください');
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }

    // 1. Googleのトークン検証エンドポイントを叩く (Edge環境で最も安全かつ簡単な方法)
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!googleRes.ok) {
      const redirectUrl = new URL(`${request.nextUrl.origin}/login`);
      redirectUrl.searchParams.set('error', 'Googleトークンの検証に失敗しました');
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }

    const profile = await googleRes.json() as {
      sub: string; // Google User ID
      email: string;
      name: string;
      picture?: string;
      aud: string; // Client ID
    };
    console.log('Google profile:', profile);

    // 2. Client ID の一致確認 (重要)
    if (clientId && profile.aud !== clientId) {
      const redirectUrl = new URL(`${request.nextUrl.origin}/login`);
      redirectUrl.searchParams.set('error', '不正なクライアントIDです');
      return NextResponse.redirect(redirectUrl, { status: 303 });
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

    // 5. ログイン画面へトークン付きでリダイレクト (303 See Other で GET に強制)
    const redirectUrl = new URL(`${request.nextUrl.origin}/login`);
    redirectUrl.searchParams.set('session_token', sessionToken);
    if (group) {
      redirectUrl.searchParams.set('group', group);
    }
    return NextResponse.redirect(redirectUrl, { status: 303 });

  } catch (e: any) {
    console.error('Google Auth Error:', e);
    const redirectUrl = new URL(`${request.nextUrl.origin}/login`);
    redirectUrl.searchParams.set('error', `認証処理中にエラーが発生しました: ${e?.message || e}`);
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }
}
