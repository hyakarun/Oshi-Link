import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getSessionUser } from '@/app/api/auth/me/route';
import { submitOfficialApplication } from '@/lib/admin/official-applications';

export const runtime = 'edge';

// POST /api/groups/official-application → 公式カレンダー申請（承認までカレンダーは作成しない）
export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = (env as unknown as { DB: D1Database }).DB;

    const user = await getSessionUser(db, request);
    if (!user) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    const { calendar_name } = (await request.json()) as { calendar_name?: string };
    const result = await submitOfficialApplication(db, user.id, calendar_name || '');
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      already_pending: !!result.already_pending,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '申請に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
