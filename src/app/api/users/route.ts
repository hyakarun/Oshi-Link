import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getSessionUser } from '@/app/api/auth/me/route';

export const runtime = 'edge';

// Update current user profile
export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = (env as any).DB;

    const user = await getSessionUser(db, request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const reqData = await request.json() as any;
    const name = reqData.name !== undefined ? reqData.name : user.name;
    const avatar_url = reqData.avatar_url !== undefined ? reqData.avatar_url : user.avatar_url;
    const email_enabled = reqData.email_enabled !== undefined ? reqData.email_enabled : user.email_enabled;
    const push_enabled = reqData.push_enabled !== undefined ? reqData.push_enabled : user.push_enabled;
    const notification_timing = reqData.notification_timing !== undefined ? reqData.notification_timing : user.notification_timing;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    await db.prepare(`
      UPDATE users SET 
        name = ?, 
        avatar_url = ?, 
        email_enabled = ?, 
        push_enabled = ?, 
        notification_timing = ? 
      WHERE id = ?
    `).bind(
      name, 
      avatar_url || null, 
      email_enabled ? 1 : 0, 
      push_enabled ? 1 : 0, 
      notification_timing || '10m', 
      user.id
    ).run();

    return NextResponse.json({ 
      id: user.id, 
      name, 
      avatar_url, 
      email_enabled: !!email_enabled, 
      push_enabled: !!push_enabled, 
      notification_timing: notification_timing || '10m' 
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Get User (Safe fields only)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    
    if (!userId) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const { env } = getRequestContext();
    const db = (env as any).DB;

    // プライバシーのため、emailやgoogle_idは返さない
    const user = await db.prepare('SELECT id, name, avatar_url, is_official FROM users WHERE id = ?').bind(userId).first();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
