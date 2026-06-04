import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import {
  AdminEnv,
  clearAdminSessionCookie,
  createAdminSession,
  getAdminPassword,
  requireAdmin,
  setAdminSessionCookie,
} from '@/lib/admin/auth';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const { env } = getRequestContext();
  const db = (env as unknown as AdminEnv).DB;
  const adminPassword = getAdminPassword(env as unknown as AdminEnv);

  if (!adminPassword) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD is not configured' }, { status: 503 });
  }

  const body = (await request.json()) as { password?: string };
  if (body.password !== adminPassword) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const session = await createAdminSession(db);
  const response = NextResponse.json({ ok: true });
  setAdminSessionCookie(response, session.token, session.expiresAt);
  return response;
}

export async function GET(request: NextRequest) {
  const { env } = getRequestContext();
  const db = (env as unknown as AdminEnv).DB;
  const session = await requireAdmin(request, db);
  if (!session) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const { env } = getRequestContext();
  const db = (env as unknown as AdminEnv).DB;
  const session = await requireAdmin(request, db);
  if (session) {
    await db.prepare('DELETE FROM admin_sessions WHERE token = ?').bind(session.token).run();
  }
  const response = NextResponse.json({ ok: true });
  clearAdminSessionCookie(response);
  return response;
}
