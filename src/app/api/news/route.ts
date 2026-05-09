import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  // noteのユーザーIDとマガジンID
  const noteId = 'tsukuro_team'; 
  const magazineId = 'm264f34cbee5f'; 
  
  // マガジン単位のRSSフィードURL
  const rssUrl = `https://note.com/${noteId}/m/${magazineId}/rss`;

  try {
    const response = await fetch(rssUrl, {
      next: { revalidate: 3600 } // 1時間キャッシュ
    });

    if (!response.ok) {
      return NextResponse.json({ items: [] });
    }

    const xml = await response.text();

    // 簡易的なXMLパース（サーバーサイドなのでDOMParserは使えない）
    // 正規表現で <item> を抽出
    const items = [];
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

    for (const match of itemMatches) {
      const content = match[1];
      const title = content.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || content.match(/<title>(.*?)<\/title>/)?.[1];
      const link = content.match(/<link>(.*?)<\/link>/)?.[1];
      const pubDate = content.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
      const description = content.match(/<description>(.*?)<\/description>/)?.[1];

      if (title && link) {
        items.push({
          title: title.trim(),
          link: link.trim(),
          pubDate: pubDate ? new Date(pubDate).toISOString() : null,
          summary: description ? description.replace(/<[^>]*>?/gm, '').substring(0, 100).trim() : ''
        });
      }
    }

    return NextResponse.json({ items: items.slice(0, 5) }); // 最新5件
  } catch (error) {
    console.error('Failed to fetch news:', error);
    return NextResponse.json({ items: [] });
  }
}
