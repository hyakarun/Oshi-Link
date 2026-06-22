import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { syncPremiumStatus } from '@/lib/premium';

export const runtime = 'edge';

interface Env {
  DB: D1Database;
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
  DISCORD_BOT_TOKEN?: string;
  DISCORD_GUILD_ID?: string;
  MEMBER_ROLE_ID?: string;
}

interface DiscordProfile {
  id: string;
  username: string;
  global_name?: string;
  email?: string;
  avatar?: string;
}

// GET /api/auth/discord/callback  → 認可コードを受けてセッションを発行
export async function GET(request: NextRequest) {
  const { env } = getRequestContext();
  const e = env as unknown as Env;
  const db = e.DB;
  const origin = request.nextUrl.origin;

  const fail = (message: string) => {
    const url = new URL(`${origin}/login`);
    url.searchParams.set('error', message);
    return NextResponse.redirect(url, { status: 303 });
  };

  const code = request.nextUrl.searchParams.get('code');
  if (!code) {
    return fail('Discord認証がキャンセルされました');
  }

  let group = '';
  const stateStr = request.nextUrl.searchParams.get('state');
  if (stateStr) {
    try {
      group = (JSON.parse(decodeURIComponent(stateStr)) as { group?: string }).group || '';
    } catch (err) {
      console.error('Failed to parse Discord state:', err);
    }
  }

  try {
    const redirectUri = `${origin}/api/auth/discord/callback`;

    // 1. 認可コードをアクセストークンに交換
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: e.DISCORD_CLIENT_ID,
        client_secret: e.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenRes.ok) {
      return fail('Discordトークンの取得に失敗しました');
    }
    const token = (await tokenRes.json()) as { access_token: string };

    // 2. プロフィール取得
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!userRes.ok) {
      return fail('Discordユーザー情報の取得に失敗しました');
    }
    const profile = (await userRes.json()) as DiscordProfile;

    const name = profile.global_name || profile.username;
    const email = profile.email || `${profile.id}@discord.local`;
    const avatar = profile.avatar
      ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
      : null;

    // 3. discord_id または email でユーザーを突合（既存Googleアカウントと統合）
    let user = (await db
      .prepare('SELECT id FROM users WHERE discord_id = ? OR email = ?')
      .bind(profile.id, email)
      .first()) as { id: string } | null;

    if (!user) {
      const userId = crypto.randomUUID();
      await db
        .prepare(
          'INSERT INTO users (id, name, email, discord_id, avatar_url, is_official) VALUES (?, ?, ?, ?, ?, 0)',
        )
        .bind(userId, name, email, profile.id, avatar)
        .run();
      user = { id: userId };
    } else {
      await db
        .prepare('UPDATE users SET discord_id = ?, avatar_url = COALESCE(?, avatar_url) WHERE id = ?')
        .bind(profile.id, avatar, user.id)
        .run();
    }

    // 4. Whop→Discordロールに基づく会員状態を同期（失敗しても致命的でない）
    try {
      await syncPremiumStatus(db, e, user.id, profile.id);
    } catch (err) {
      console.error('premium sync failed on login:', err);
    }

    // 5. セッション発行（30日間）
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await db
      .prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
      .bind(sessionToken, user.id, expiresAt)
      .run();

    const redirectUrl = new URL(`${origin}/login`);
    redirectUrl.searchParams.set('session_token', sessionToken);
    if (group) {
      redirectUrl.searchParams.set('group', group);
    }
    return NextResponse.redirect(redirectUrl, { status: 303 });
  } catch (err: unknown) {
    console.error('Discord Auth Error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return fail(`認証処理中にエラーが発生しました: ${message}`);
  }
}
