import { NextResponse } from 'next/server';
import { getDb } from '@/lib/cloudflare';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'edge';

export async function GET() {
  try {
    const db = getDb();
    const { results } = await db.prepare('SELECT * FROM events ORDER BY date ASC').all();
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as any;
    const { group_id, title, date, map_link, image_url, ticket_url, added_by, source_url } = body;
    
    const db = getDb();
    const eventId = uuidv4();
    
    // Insert event
    await db.prepare(`
      INSERT INTO events (id, group_id, title, date, map_link, image_url, ticket_url, added_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(eventId, group_id, title, date, map_link, image_url, ticket_url, added_by).run();

    // Insert initial verification if source_url provided
    if (source_url) {
      await db.prepare(`
        INSERT INTO verifications (id, event_id, user_id, verification_status, source_url)
        VALUES (?, ?, ?, ?, ?)
      `).bind(uuidv4(), eventId, added_by, 'pending', source_url).run();
    }

    return NextResponse.json({ id: eventId }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
