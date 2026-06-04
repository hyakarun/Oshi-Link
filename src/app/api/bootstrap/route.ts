import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getSessionUser } from '@/app/api/auth/me/route';
import { resolveDisputeWarning } from '@/lib/api/dispute-warning';
import {
  fetchGroupsList,
  fetchEventsList,
  fetchNewsItems,
} from '@/lib/api/calendar-data';

export const runtime = 'edge';

/** GET /api/bootstrap — 初回表示用（user + groups + events + news を1リクエスト） */
export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = (env as unknown as { DB: D1Database }).DB;
    const lite = request.nextUrl.searchParams.get('lite') === '1';

    const user = await getSessionUser(db, request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dispute_warning = await resolveDisputeWarning(db, user.id);

    const groupsPromise = fetchGroupsList(db, user.id);
    const eventsPromise = fetchEventsList(db, user.id);
    const newsPromise = lite ? Promise.resolve(null) : fetchNewsItems();

    const [groups, events, newsItems] = await Promise.all([
      groupsPromise,
      eventsPromise,
      newsPromise,
    ]);

    const body: Record<string, unknown> = {
      user,
      dispute_warning,
      groups,
      events,
    };

    if (newsItems !== null) {
      body.news = { items: newsItems };
    }

    return NextResponse.json(body);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('GET /api/bootstrap failed:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
