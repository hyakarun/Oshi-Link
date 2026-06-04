import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getSessionUser } from '@/app/api/auth/me/route';
import {
  canCreatorEditEvent,
  isOfficialCalendarManager,
} from '@/lib/event-edit';
import { fetchEventsList } from '@/lib/api/calendar-data';
import { deleteEventCascade } from '@/lib/admin/cascade';
import { buildRepeatOccurrences } from '@/lib/event-repeat';

export const runtime = 'edge';

/**
 * URLの安全性を検証する（IPアドレス、短縮URL、不審なパターン）
 */
function validateUrlSafety(url: string): { safe: boolean; error?: string } {
  try {
    const u = new URL(url);
    const hostname = u.hostname.toLowerCase();

    // 1. IPアドレス形式の禁止
    if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname)) {
      return { safe: false, error: '安全上の理由から、IPアドレス形式のURLは登録できません。' };
    }

    // 2. 短縮URLの制限
    const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'buff.ly', 'ow.ly', 'is.gd', 'goo.gl', 't.ly'];
    if (shorteners.some(s => hostname === s || hostname.endsWith('.' + s))) {
      return { safe: false, error: '短縮URLは安全性が確認できないため登録できません。元のURL（直リンク）を入力してください。' };
    }

    // 3. 不審なキーワード（簡易的なブラックリスト）
    const suspiciousKeywords = ['phishing', 'scam', 'malware', 'virus', 'free-gift', 'win-money'];
    if (suspiciousKeywords.some(k => hostname.includes(k))) {
      return { safe: false, error: '入力されたURLは安全ではない可能性があるため、登録できません。' };
    }

    return { safe: true };
  } catch {
    return { safe: false, error: 'URLの形式が正しくありません。' };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = (env as any).DB;

    if (!db) {
      return NextResponse.json({ error: 'DB not bound' }, { status: 500 });
    }

    const user = await getSessionUser(db, request);
    const mappedResults = await fetchEventsList(db, user?.id ?? null);
    return NextResponse.json(mappedResults);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = (env as any).DB;

    // セッションからユーザーを取得
    const user = await getSessionUser(db, request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as any;
    const {
      group_id,
      title,
      date,
      end_time,
      description,
      category,
      sub_category,
      location,
      address,
      latitude,
      longitude,
      source_url,
      repeat_period,
      repeat_weekly,
      repeat_until,
      repeat_weekdays,
      is_all_day,
    } = body;
    const added_by = user.id;

    // 投稿制限チェック: 不正確な投稿（不正確票 > 正確票）が3件以上あるか確認
    const reputation = await db.prepare(`
      SELECT COUNT(*) as unreliable_count 
      FROM events 
      WHERE added_by = ? AND disputed = 1
    `).bind(added_by).first() as { unreliable_count: number };

    if (reputation && reputation.unreliable_count >= 3) {
      return NextResponse.json({ 
        error: '投稿制限がかかっています', 
        details: '過去に投稿された情報の信頼性が低いため、新しい予定を作成できません。内容の正確さを確認してから投稿してください。' 
      }, { status: 403 });
    }

    // Validate required fields and lengths
    if (!group_id || !title || !date || !source_url) {
      return NextResponse.json({ error: 'Missing required fields: group_id, title, date, source_url' }, { status: 400 });
    }
    if (title.length > 100) {
      return NextResponse.json({ error: 'タイトルが長すぎます（最大100文字）' }, { status: 400 });
    }
    if (description && description.length > 2000) {
      return NextResponse.json({ error: '説明文が長すぎます（最大2000文字）' }, { status: 400 });
    }
    const datePart = String(date).split('T')[0];

    // Validate URL safety
    let safeSourceUrl = source_url;
    if (safeSourceUrl) {
      if (!safeSourceUrl.startsWith('http://') && !safeSourceUrl.startsWith('https://')) {
        safeSourceUrl = 'https://' + safeSourceUrl;
      }
      try {
        const u = new URL(safeSourceUrl);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          return NextResponse.json({ error: '無効なURLプロトコルです' }, { status: 400 });
        }

        // 安全性チェックの実行
        const safety = validateUrlSafety(safeSourceUrl);
        if (!safety.safe) {
          return NextResponse.json({ error: safety.error }, { status: 400 });
        }

        safeSourceUrl = u.toString();
      } catch {
        return NextResponse.json({ error: '無効なURLフォーマットです' }, { status: 400 });
      }
    }

    const weekdayList = Array.isArray(repeat_weekdays)
      ? repeat_weekdays.map((v) => Number(v))
      : String(repeat_weekdays || '')
          .split(',')
          .map((v) => Number(v.trim()))
          .filter((v) => Number.isFinite(v));

    const repeatPeriod = !!repeat_period || (!!repeat_until && !!repeat_weekly);
    const built = buildRepeatOccurrences({
      startDatePart: datePart,
      startDateTime: date,
      endTime: end_time || null,
      repeatPeriod,
      repeatWeekdaysEnabled: !!repeat_weekly,
      repeatUntil: repeat_until ? String(repeat_until) : null,
      weekdayValues: weekdayList,
    });

    if (!built.ok) {
      return NextResponse.json({ error: built.error }, { status: 400 });
    }

    const occurrences = built.occurrences;

    const isOfficialGroupUser = await db.prepare(
      'SELECT 1 FROM group_officials WHERE group_id = ? AND user_id = ?'
    ).bind(group_id, added_by).first();

    const isGroupOfficial = await db.prepare(
      'SELECT 1 FROM group_officials WHERE group_id = ?'
    ).bind(group_id).first();

    if (isGroupOfficial && !isOfficialGroupUser && !user.is_official) {
      return NextResponse.json({ error: '公式カレンダーには管理者のみ予定を追加できます' }, { status: 403 });
    }

    const isTentative = (user.is_official || isOfficialGroupUser) ? 0 : 1;

    let firstEventId = '';
    for (const item of occurrences) {
      const eventId = crypto.randomUUID();
      if (!firstEventId) firstEventId = eventId;
      await db.prepare(
        'INSERT INTO events (id, group_id, title, date, end_time, description, category, sub_category, location, address, latitude, longitude, source_url, added_by, is_tentative, is_all_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        eventId,
        group_id,
        title,
        item.date,
        item.end_time,
        description || null,
        category || 'オフライン系',
        sub_category || null,
        location || null,
        address || null,
        latitude ?? null,
        longitude ?? null,
        safeSourceUrl || null,
        added_by,
        isTentative,
        is_all_day ? 1 : 0
      ).run();

      // デフォルトで投稿者を最初の「正確」投票者として登録
      const verifyId = crypto.randomUUID();
      await db.prepare(
        'INSERT INTO verifications (id, event_id, user_id, verification_status, source_url) VALUES (?, ?, ?, ?, ?)'
      ).bind(verifyId, eventId, added_by, 'confirmed', safeSourceUrl || null).run();
    }

    return NextResponse.json({ id: firstEventId, created_count: occurrences.length }, { status: 201 });
  } catch (error: any) {
    console.error('POST Error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = (env as any).DB;

    const user = await getSessionUser(db, request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as {
      id?: string;
      group_id?: string;
      title?: string;
      date?: string;
      end_time?: string | null;
      description?: string | null;
      category?: string;
      sub_category?: string | null;
      location?: string | null;
      address?: string | null;
      latitude?: number | string | null;
      longitude?: number | string | null;
      source_url?: string;
      is_all_day?: boolean;
    };

    const { id } = body;
    if (!id || !body.title || !body.date || !body.group_id || !body.source_url) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
    }

    const existing = await db
      .prepare(
        `SELECT id, added_by, created_at, creator_edit_used, group_id
         FROM events WHERE id = ?`
      )
      .bind(id)
      .first() as {
        id: string;
        added_by: string;
        created_at: string;
        creator_edit_used: number;
        group_id: string;
      } | null;

    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const managesExisting = isOfficialCalendarManager(user, existing.group_id);
    const isCreator = existing.added_by === user.id;

    if (!isCreator && !managesExisting) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    if (!managesExisting) {
      if (!canCreatorEditEvent(
        {
          added_by: existing.added_by,
          creator_edit_used: !!existing.creator_edit_used,
          created_at: existing.created_at,
        },
        user.id
      )) {
        if (existing.creator_edit_used) {
          return NextResponse.json({ error: '修正は1回のみ可能です' }, { status: 403 });
        }
        return NextResponse.json({ error: '投稿から1時間を過ぎているため修正できません' }, { status: 403 });
      }
    }

    const title = body.title.trim();
    const description = body.description?.trim() || null;
    if (title.length > 100) {
      return NextResponse.json({ error: 'タイトルが長すぎます（最大100文字）' }, { status: 400 });
    }
    if (description && description.length > 2000) {
      return NextResponse.json({ error: '説明文が長すぎます（最大2000文字）' }, { status: 400 });
    }

    let safeSourceUrl = body.source_url;
    if (!safeSourceUrl.startsWith('http://') && !safeSourceUrl.startsWith('https://')) {
      safeSourceUrl = 'https://' + safeSourceUrl;
    }
    try {
      const u = new URL(safeSourceUrl);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        return NextResponse.json({ error: '無効なURLプロトコルです' }, { status: 400 });
      }
      const safety = validateUrlSafety(safeSourceUrl);
      if (!safety.safe) {
        return NextResponse.json({ error: safety.error }, { status: 400 });
      }
      safeSourceUrl = u.toString();
    } catch {
      return NextResponse.json({ error: '無効なURLフォーマットです' }, { status: 400 });
    }

    const managesTarget = isOfficialCalendarManager(user, body.group_id);
    const linkedOfficial = await db
      .prepare('SELECT 1 FROM group_officials WHERE group_id = ? AND user_id = ?')
      .bind(body.group_id, user.id)
      .first();
    const isOfficialGroupUser = managesTarget || !!linkedOfficial;
    const isGroupOfficial = await db
      .prepare('SELECT 1 FROM group_officials WHERE group_id = ?')
      .bind(body.group_id)
      .first();

    if (isGroupOfficial && !isOfficialGroupUser && !user.is_official) {
      return NextResponse.json({ error: '公式カレンダーには管理者のみ予定を追加できます' }, { status: 403 });
    }

    const targetGroup = await db
      .prepare(`SELECT id FROM groups WHERE id = ? AND COALESCE(status, 'active') = 'active'`)
      .bind(body.group_id)
      .first();
    if (!targetGroup) {
      return NextResponse.json({ error: 'カレンダーが見つかりません' }, { status: 404 });
    }

    const parseCoord = (value: number | string | null | undefined) => {
      if (value === null || value === undefined || value === '') return null;
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    };

    const isTentative = user.is_official || isOfficialGroupUser ? 0 : 1;
    const creatorEditUsed = managesExisting ? existing.creator_edit_used : 1;

    await db
      .prepare(
        `UPDATE events SET
          group_id = ?, title = ?, date = ?, end_time = ?, description = ?,
          category = ?, sub_category = ?, location = ?, address = ?,
          latitude = ?, longitude = ?, source_url = ?, is_all_day = ?,
          is_tentative = ?, creator_edit_used = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .bind(
        body.group_id,
        title,
        body.date,
        body.end_time || null,
        description,
        body.category || 'オフライン系',
        body.sub_category || null,
        body.location?.trim() || null,
        body.address?.trim() || null,
        parseCoord(body.latitude),
        parseCoord(body.longitude),
        safeSourceUrl,
        body.is_all_day ? 1 : 0,
        isTentative,
        creatorEditUsed,
        id
      )
      .run();

    if (existing.group_id !== body.group_id) {
      const followId = crypto.randomUUID();
      await db
        .prepare('INSERT OR IGNORE INTO user_group_follows (id, user_id, group_id) VALUES (?, ?, ?)')
        .bind(followId, user.id, body.group_id)
        .run();
    }

    return NextResponse.json({ ok: true, creator_edit_used: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = (env as any).DB;

    const user = await getSessionUser(db, request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    // 権限チェック: 投稿者本人、または当該公式カレンダーの担当者
    const existing = await db
      .prepare('SELECT added_by, group_id FROM events WHERE id = ?')
      .bind(id)
      .first() as { added_by: string; group_id: string } | null;
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    const managesCalendar = isOfficialCalendarManager(user, existing.group_id);
    if (existing.added_by !== user.id && !managesCalendar) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    await deleteEventCascade(db, id);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
