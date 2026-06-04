import { normalizeExternalUrl, isAllDayEvent } from '@/lib/utils';

export type NewsItem = {
  title: string;
  link: string;
  pubDate: string | null;
  summary: string;
};

export async function fetchGroupsList(db: D1Database, userId?: string | null) {
  const result = await db
    .prepare(
      `
      SELECT
        g.id,
        g.name,
        g.description,
        g.avatar_url,
        g.created_at,
        EXISTS(SELECT 1 FROM group_officials o WHERE o.group_id = g.id) as is_official,
        COUNT(DISTINCT e.id) as event_count,
        COUNT(DISTINCT f.id) as follower_count
      FROM groups g
      LEFT JOIN events e ON e.group_id = g.id
      LEFT JOIN user_group_follows f ON f.group_id = g.id
      WHERE COALESCE(g.status, 'active') = 'active'
      GROUP BY g.id
      ORDER BY follower_count DESC, g.name ASC
    `
    )
    .all();

  let userFollowData: Record<
    string,
    { custom_bg_image: string | null; custom_theme_color: string | null }
  > = {};

  if (userId) {
    const followResult = await db
      .prepare(
        'SELECT group_id, custom_bg_image, custom_theme_color FROM user_group_follows WHERE user_id = ?'
      )
      .bind(userId)
      .all();

    (followResult.results as { group_id: string; custom_bg_image: string | null; custom_theme_color: string | null }[]).forEach(
      (r) => {
        userFollowData[r.group_id] = {
          custom_bg_image: r.custom_bg_image,
          custom_theme_color: r.custom_theme_color,
        };
      }
    );
  }

  return (result.results as Record<string, unknown>[]).map((g) => ({
    ...g,
    is_official: !!g.is_official,
    is_following: !!userFollowData[g.id as string],
    custom_bg_image: userFollowData[g.id as string]?.custom_bg_image,
    custom_theme_color: userFollowData[g.id as string]?.custom_theme_color,
  }));
}

export async function fetchEventsList(db: D1Database, userId?: string | null) {
  const query = `
      SELECT e.*, u.name as creator_name,
      (u.is_official OR EXISTS(SELECT 1 FROM group_officials go WHERE go.group_id = e.group_id AND go.user_id = e.added_by)) as creator_is_official,
      EXISTS(SELECT 1 FROM group_officials go WHERE go.group_id = e.group_id AND go.user_id = e.added_by) as added_by_group_official,
      EXISTS(SELECT 1 FROM group_officials go WHERE go.group_id = e.group_id) as group_is_official,
      (SELECT v.verification_status FROM verifications v WHERE v.event_id = e.id AND v.user_id = ?) as user_vote
      FROM events e 
      JOIN groups g ON g.id = e.group_id
      LEFT JOIN users u ON e.added_by = u.id 
      WHERE COALESCE(g.status, 'active') = 'active'
      ORDER BY e.date ASC
    `;

  const result = await db.prepare(query).bind(userId).all();

  return (result.results ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    source_url: row.source_url
      ? normalizeExternalUrl(row.source_url as string)
      : row.source_url,
    creator_is_official: !!row.creator_is_official,
    added_by_group_official: !!row.added_by_group_official,
    group_is_official: !!row.group_is_official,
    is_tentative: !!row.is_tentative,
    is_all_day: isAllDayEvent({
      date: row.date as string,
      end_time: (row.end_time as string | null | undefined) ?? undefined,
      is_all_day: !!row.is_all_day,
    }),
    creator_edit_used: !!row.creator_edit_used,
  }));
}

export async function fetchNewsItems(): Promise<NewsItem[]> {
  const noteId = 'tsukuro_team';
  const rssUrl = `https://note.com/${noteId}/rss`;

  try {
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return [];
    }

    const xml = await response.text();
    const items: NewsItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const content = match[1];

      const getTagContent = (tag: string, text: string) => {
        const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
        const m = text.match(regex);
        return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : null;
      };

      const rawTitle = getTagContent('title', content) || '';
      const matchPattern = rawTitle.match(/(?:【Oshi-Link】|Oshi-Link[:：]?)\s*(.*)/i);

      if (matchPattern) {
        const title = matchPattern[1].trim() || rawTitle;
        const link = getTagContent('link', content);
        const pubDate = getTagContent('pubDate', content);
        const description = getTagContent('description', content);

        if (title && link) {
          items.push({
            title,
            link,
            pubDate: pubDate ? new Date(pubDate).toISOString() : null,
            summary: description
              ? description.replace(/<[^>]*>?/gm, '').substring(0, 100).trim()
              : '',
          });
        }
      }
    }

    return items.slice(0, 5);
  } catch (error) {
    console.error('Failed to fetch news:', error);
    return [];
  }
}
