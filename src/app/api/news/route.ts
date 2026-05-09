import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  // noteのユーザーIDとマガジンID
  const noteId = 'tsukuro_team'; 
  const magazineId = 'm264f34cbee5f'; 
  
  const rssUrl = `https://note.com/${noteId}/m/${magazineId}/rss`;

  try {
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      next: { revalidate: 0 } 
    });

    if (!response.ok) {
      return NextResponse.json({ items: [] });
    }

    const xml = await response.text();

    const items: any[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const content = match[1];
      
      const getTagContent = (tag: string, text: string) => {
        const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
        const m = text.match(regex);
        return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : null;
      };

      const title = getTagContent('title', content);
      const link = getTagContent('link', content);
      const pubDate = getTagContent('pubDate', content);
      const description = getTagContent('description', content);

      if (title && link) {
        items.push({
          title,
          link,
          pubDate: pubDate ? new Date(pubDate).toISOString() : null,
          summary: description ? description.replace(/<[^>]*>?/gm, '').substring(0, 100).trim() : ''
        });
      }
    }

    // 診断情報を常に返す
    return NextResponse.json({ 
      items: items.slice(0, 5),
      _debug: {
        url: rssUrl,
        status: response.status,
        contentLength: xml.length,
        contentStart: xml.substring(0, 500), // 冒頭500文字
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to fetch news:', error);
    return NextResponse.json({ items: [] });
  }
}
