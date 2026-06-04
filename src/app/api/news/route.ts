import { NextResponse } from 'next/server';
import { fetchNewsItems } from '@/lib/api/calendar-data';

export const runtime = 'edge';

export async function GET() {
  const items = await fetchNewsItems();
  return NextResponse.json({ items });
}
