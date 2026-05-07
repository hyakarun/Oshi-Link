import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getSessionUser } from '@/app/api/auth/me/route';

export const runtime = 'edge';

function formatICSDate(dateStr: string, timeStr?: string | null) {
  if (!timeStr) {
    return dateStr.replace(/-/g, '');
  }
  const time = timeStr.replace(/:/g, '') + '00';
  return dateStr.replace(/-/g, '') + 'T' + time + 'Z';
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('id');

    const { env } = getRequestContext();
    const db = (env as any).DB;

    // proユーザーのみ許可
    const user = await getSessionUser(db, request as any);
    if (!user || (user as any).premium_status !== 'pro') {
      return NextResponse.json(
        { error: 'この機能は月額プランのみご利用いただけます。' },
        { status: 403 }
      );
    }

    let query = 'SELECT e.*, g.name as group_name FROM events e JOIN groups g ON e.group_id = g.id';
    const params: any[] = [];
    if (groupId && groupId !== '0') {
      query += ' WHERE e.group_id = ?';
      params.push(groupId);
    }
    query += ' ORDER BY e.date ASC';

    const events = await db.prepare(query).bind(...params).all();

    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Oshi-Link//Calendar//JP',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Oshi-Link (' + (groupId && groupId !== '0' ? 'Subscription' : 'All Events') + ')',
      'X-WR-TIMEZONE:Asia/Tokyo',
      'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    ];

    events.results.forEach((e: any) => {
      ics.push('BEGIN:VEVENT');
      ics.push(`UID:${e.id}@oshi-link.app`);
      ics.push(`DTSTAMP:${formatICSDate(new Date().toISOString().split('T')[0], '00:00')}`);
      
      if (e.end_time) {
        ics.push(`DTSTART:${formatICSDate(e.date, e.date.includes('T') ? e.date.split('T')[1] : '10:00')}`);
        ics.push(`DTEND:${formatICSDate(e.date, e.end_time)}`);
      } else {
        ics.push(`DTSTART;VALUE=DATE:${formatICSDate(e.date)}`);
      }
      
      const summary = (e.is_tentative ? '[仮] ' : '') + e.title;
      ics.push(`SUMMARY:${summary}`);
      ics.push(`DESCRIPTION:${e.description || ''}\\n\\nSource: ${e.source_url || 'N/A'}`);
      if (e.location) ics.push(`LOCATION:${e.location}`);
      if (e.source_url) ics.push(`URL:${e.source_url}`);
      ics.push('END:VEVENT');
    });

    ics.push('END:VCALENDAR');

    return new Response(ics.join('\r\n'), {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Disposition': 'attachment; filename="oshi-link.ics"',
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
