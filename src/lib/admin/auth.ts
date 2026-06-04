import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'mgmt_session';
const SESSION_HOURS = 12;

export type AdminEnv = {
  DB: D1Database;
  ADMIN_PASSWORD?: string;
};

export function getAdminPassword(env: AdminEnv): string | undefined {
  const fromBinding = env.ADMIN_PASSWORD?.trim();
  if (fromBinding) return fromBinding;
  // Local dev: .dev.vars / .env.local via Next.js
  if (typeof process !== 'undefined' && process.env?.ADMIN_PASSWORD) {
    return process.env.ADMIN_PASSWORD.trim();
  }
  return undefined;
}

export async function requireAdmin(request: NextRequest, db: D1Database) {
  const token =
    request.cookies.get(COOKIE_NAME)?.value ||
    request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ||
    '';

  if (!token) return null;

  const session = await db
    .prepare('SELECT token, expires_at FROM admin_sessions WHERE token = ?')
    .bind(token)
    .first<{ token: string; expires_at: string }>();

  if (!session || new Date(session.expires_at) < new Date()) {
    return null;
  }

  return session;
}

export function adminUnauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function createAdminSession(db: D1Database) {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000).toISOString();
  await db.prepare('INSERT INTO admin_sessions (token, expires_at) VALUES (?, ?)').bind(token, expiresAt).run();
  return { token, expiresAt };
}

export function setAdminSessionCookie(response: NextResponse, token: string, expiresAt: string) {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(expiresAt),
  });
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
