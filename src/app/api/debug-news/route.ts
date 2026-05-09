import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  const noteId = 'tsukuro_team'; 
  const magazineId = 'm264f34cbee5f'; 
  const rssUrl = `https://note.com/${noteId}/m/${magazineId}/rss/`;

  try {
    const response = await fetch(rssUrl, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    const xml = await response.text();
    
    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
