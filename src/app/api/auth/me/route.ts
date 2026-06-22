import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getLatestOfficialApplication } from '@/lib/admin/official-applications';
import { resolveDisputeWarning } from '@/lib/api/dispute-warning';
import { isPremiumStale, syncPremiumStatus, type PremiumEnv } from '@/lib/premium';

export const runtime = 'edge';

interface Env extends PremiumEnv {
  DB: D1Database;
}

// セッショントークンからユーザーを取得する共通関数（他のAPIからも利用可能）
export async function getSessionUser(db: D1Database, request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '') || '';
  if (!token) return null;

  const session = await db.prepare(
    'SELECT s.*, u.id as uid, u.name, u.email, u.avatar_url, u.premium_status, u.discord_id, u.premium_synced_at, u.notifications_enabled, u.email_enabled, u.push_enabled, u.notification_timing, u.is_official, COALESCE(u.status, \'active\') as status FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ?'
  ).bind(token).first() as {
    token: string; user_id: string; expires_at: string;
    uid: string; name: string; email: string; avatar_url: string; premium_status: string;
    discord_id: string | null; premium_synced_at: string | null;
    notifications_enabled: number; email_enabled: number; push_enabled: number; notification_timing: string;
    is_official: number;
    status: string;
  } | null;

  if (!session) return null;
  if (new Date(session.expires_at) < new Date()) return null;
  if (session.status === 'banned' || session.status === 'frozen') return null;

  let official_groups: string[] = [];
  try {
    const officials = await db.prepare(
      'SELECT group_id FROM group_officials WHERE user_id = ?'
    ).bind(session.uid).all() as { results: { group_id: string }[] };
    official_groups = officials.results?.map(r => r.group_id) || [];
  } catch (err) {
    console.error('Failed to fetch official groups:', err);
  }

  let official_application: {
    status: string;
    calendar_name: string;
    admin_note?: string | null;
  } | null = null;
  try {
    const app = await getLatestOfficialApplication(db, session.uid);
    if (app && (app.status === 'pending' || app.status === 'rejected')) {
      official_application = {
        status: app.status,
        calendar_name: app.calendar_name,
        admin_note: app.admin_note,
      };
    }
  } catch (err) {
    console.error('Failed to fetch official application:', err);
  }

  return { 
    id: session.uid, 
    name: session.name, 
    email: session.email, 
    avatar_url: session.avatar_url,
    discord_id: session.discord_id,
    premium_synced_at: session.premium_synced_at,
    premium_status: session.premium_status || 'free',
    notifications_enabled: !!session.notifications_enabled,
    email_enabled: !!session.email_enabled,
    push_enabled: !!session.push_enabled,
    is_official: !!session.is_official,
    official_groups,
    official_application,
    notification_timing: (session.notification_timing || '10m') as any
  };
}

// GET /api/auth/me  → セッションから現在のユーザーを取得
export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = (env as unknown as Env).DB;

    const user = await getSessionUser(db, request);
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Discord連携済みユーザーは、Whop→ロール連動で会員状態を定期的に再同期
    if (user.discord_id && isPremiumStale(user.premium_synced_at)) {
      try {
        const synced = await syncPremiumStatus(
          db,
          env as unknown as Env,
          user.id,
          user.discord_id,
        );
        if (synced) {
          user.premium_status = synced;
        }
      } catch (err) {
        console.error('premium sync failed on /me:', err);
      }
    }

    const hasNewDispute = await resolveDisputeWarning(db, user.id);

    return NextResponse.json({ 
      user, 
      dispute_warning: hasNewDispute 
    });
  } catch (error: any) {
    console.error('GET /api/auth/me failed:', error);
    return NextResponse.json({ error: `auth_me_failed: ${error?.message || error}` }, { status: 500 });
  }
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
