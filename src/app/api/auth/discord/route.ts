import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

interface Env {
  DISCORD_CLIENT_ID: string;
}

// GET /api/auth/discord  → Discord OAuth 認可画面へリダイレクト
export async function GET(request: NextRequest) {
  const { env } = getRequestContext();
  const clientId = (env as unknown as Env).DISCORD_CLIENT_ID;

  if (!clientId) {
    const redirectUrl = new URL(`${request.nextUrl.origin}/login`);
    redirectUrl.searchParams.set('error', 'Discordログインが設定されていません');
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  const origin = request.nextUrl.origin;
  const group = request.nextUrl.searchParams.get('group') || '';
  const state = encodeURIComponent(JSON.stringify({ group }));

  const authorizeUrl = new URL('https://discord.com/oauth2/authorize');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', `${origin}/api/auth/discord/callback`);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('scope', 'identify email');
  authorizeUrl.searchParams.set('state', state);

  return NextResponse.redirect(authorizeUrl.toString(), { status: 302 });
}
