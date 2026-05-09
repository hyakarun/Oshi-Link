import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  // noteのユーザーIDとマガジンID
  const noteId = 'tsukuro_team'; 
  const magazineId = 'm264f34cbee5f'; 
  
  // マガジン単位のRSSフィードURL（末尾にスラッシュが必要な場合がある）
  const rssUrl = `https://note.com/${noteId}/m/${magazineId}/rss/`;

  try {
    const response = await fetch(rssUrl, {
      cache: 'no-store',
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

    return NextResponse.json({ 
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
      xmlLength: xml.length,
      xmlPreview: xml.substring(0, 100)
    });
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const content = match[1];
      
      // 各タグの内容を抽出する補助関数
      const getTagContent = (tag: string, text: string) => {
        const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
        const m = text.match(regex);
        if (!m) return null;
        let val = m[1];
        // CDATAを削除
        val = val.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
        return val.trim();
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

    return NextResponse.json({ 
      items: items.slice(0, 5),
      _ts: Date.now() // デバッグ用タイムスタンプ
    });
  } catch (error) {
    console.error('Failed to fetch news:', error);
    return NextResponse.json({ items: [] });
  }
}
