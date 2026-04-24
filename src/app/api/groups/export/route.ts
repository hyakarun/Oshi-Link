import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

function formatICSDate(dateStr: string) {
  // ISO (2026-05-01T10:00:00) -> 20260501T100000Z
  return dateStr.replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('id');

    const { env } = getRequestContext();
    const db = (env as any).DB;

    let query = 'SELECT * FROM events';
    const params: any[] = [];
    if (groupId && groupId !== '0') {
      query += ' WHERE group_id = ?';
      params.push(groupId);
    }
    query += ' ORDER BY date ASC';

    const events = await db.prepare(query).bind(...params).all();

    // Generate iCal content
    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Oshi-Link//Calendar//JP',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Oshi-Link Schedule'
    ];

    events.results.forEach((e: any) => {
      ics.push('BEGIN:VEVENT');
      ics.push(`UID:${e.id}@oshi-link.app`);
      ics.push(`DTSTAMP:${formatICSDate(new Date().toISOString())}`);
      ics.push(`DTSTART:${formatICSDate(e.date)}`);
      if (e.end_time) {
        ics.push(`DTEND:${formatICSDate(e.end_time)}`);
      }
      ics.push(`SUMMARY:${e.title}`);
      ics.push(`DESCRIPTION:${e.description || ''} (Source: ${e.source_url || 'N/A'})`);
      ics.push(`URL:${e.source_url || ''}`);
      ics.push('END:VEVENT');
    });

    ics.push('END:VCALENDAR');

    return new Response(ics.join('\r\n'), {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="oshi-link.ics"`,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
