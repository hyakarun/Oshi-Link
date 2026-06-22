import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { sendDiscordDM, DiscordEmbed } from '@/lib/discord-dm';

export const runtime = 'edge';

const TIMING_MIN: Record<string, number> = {
  '10m': 10,
  '1h': 60,
  '1d': 1440,
  '1w': 10080,
};

// JSTローカル文字列 (YYYY-MM-DDTHH:MM:SS) を生成
function jstString(epochMs: number): string {
  return new Date(epochMs + 9 * 3600_000).toISOString().slice(0, 19);
}

// events.date (JSTタイムゾーン無しISO) を UTC epoch(ms) に変換
function eventEpoch(date: string): number {
  return Date.parse(date.length <= 19 ? `${date}+09:00` : date);
}

type Row = {
  event_id: string;
  group_id: string;
  title: string;
  date: string;
  location: string | null;
  source_url: string | null;
  ticket_url: string | null;
  group_name: string;
  user_id: string;
  discord_id: string;
  notification_timing: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const e = env as Record<string, string | undefined>;
    const db = (env as any).DB;

    if (request.headers.get('Authorization') !== `Bearer ${e.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const botToken = e.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'bot token not configured' }, { status: 500 });
    }

    const now = Date.now();
    const fromStr = jstString(now);
    const toStr = jstString(now + 7 * 24 * 3600_000); // 最大1週間先まで

    const rows = await db
      .prepare(
        `SELECT e.id AS event_id, e.group_id, e.title, e.date, e.location, e.source_url, e.ticket_url,
                g.name AS group_name,
                u.id AS user_id, u.discord_id, u.notification_timing
         FROM user_group_follows f
         JOIN events e ON e.group_id = f.group_id
         JOIN groups g ON g.id = f.group_id
         JOIN users u ON u.id = f.user_id
         WHERE u.discord_id IS NOT NULL
           AND COALESCE(u.notifications_enabled, 1) = 1
           AND e.date >= ? AND e.date <= ?
           AND NOT EXISTS (
             SELECT 1 FROM event_reminders r
             WHERE r.user_id = u.id AND r.event_id = e.id
           )`
      )
      .bind(fromStr, toStr)
      .all();

    const siteUrl = (e.SITE_URL || 'https://oshi-link.com').replace(/\/$/, '');
    let sent = 0;

    for (const row of (rows.results || []) as Row[]) {
      const startMs = eventEpoch(row.date);
      if (!Number.isFinite(startMs) || startMs <= now) continue;
      const timingMin = TIMING_MIN[row.notification_timing || '10m'] ?? 10;
      const fireAt = startMs - timingMin * 60_000;
      if (now < fireAt) continue; // まだ通知タイミング前

      const epochSec = Math.floor(startMs / 1000);
      const link = row.ticket_url || row.source_url || `${siteUrl}/groups/${row.group_id}`;
      const embed: DiscordEmbed = {
        title: row.title,
        url: link,
        color: 0x5865f2,
        description: `**${row.group_name}**\n🗓️ <t:${epochSec}:F>（<t:${epochSec}:R>）`,
        fields: [],
        footer: { text: 'Oshi-Link カレンダー通知' },
      };
      if (row.location) embed.fields!.push({ name: '📍 場所', value: row.location });

      const ok = await sendDiscordDM(botToken, row.discord_id, [embed]);
      if (ok) {
        await db
          .prepare('INSERT OR IGNORE INTO event_reminders (user_id, event_id) VALUES (?, ?)')
          .bind(row.user_id, row.event_id)
          .run();
        sent++;
      }
    }

    return NextResponse.json({ success: true, sent });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

const VALID_TIMING = new Set(['10m', '1h', '1d', '1w']);

// Discord（Oshi-Soku ボット）から通知タイミングを更新する
export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const e = env as Record<string, string | undefined>;
    const db = (env as any).DB;

    if (request.headers.get('Authorization') !== `Bearer ${e.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { discord_id, timing } = (await request.json()) as {
      discord_id?: string;
      timing?: string;
    };
    if (!discord_id || !timing || !VALID_TIMING.has(timing)) {
      return NextResponse.json({ error: 'invalid params' }, { status: 400 });
    }

    const result = await db
      .prepare('UPDATE users SET notification_timing = ? WHERE discord_id = ?')
      .bind(timing, discord_id)
      .run();

    if (!(result?.meta?.changes ?? 0)) {
      return NextResponse.json({ ok: false, linked: false }, { status: 200 });
    }
    return NextResponse.json({ ok: true, linked: true, timing });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
