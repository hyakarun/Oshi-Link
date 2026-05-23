import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getSessionUser } from '@/app/api/auth/me/route';

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
    const userId = user?.id || null;

    let query = `
      SELECT e.*, u.name as creator_name, u.is_official as creator_is_official,
      (SELECT v.verification_status FROM verifications v WHERE v.event_id = e.id AND v.user_id = ?) as user_vote
      FROM events e 
      LEFT JOIN users u ON e.added_by = u.id 
      ORDER BY e.date ASC
    `;

    const result = await db.prepare(query).bind(userId).all();
    return NextResponse.json(result.results ?? []);
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
    const { group_id, title, date, end_time, description, category, sub_category, location, address, latitude, longitude, source_url } = body;
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

    const eventId = crypto.randomUUID();
    const isTentative = user.is_official ? 0 : 1;

    await db.prepare(
      'INSERT INTO events (id, group_id, title, date, end_time, description, category, sub_category, location, address, latitude, longitude, source_url, added_by, is_tentative) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      eventId, 
      group_id, 
      title, 
      date,
      end_time || null, 
      description || null, 
      category || 'オフライン系',
      sub_category || null,
      location || null,
      address || null,
      latitude ?? null,
      longitude ?? null,
      safeSourceUrl || null, 
      added_by,
      isTentative
    ).run();

    // デフォルトで投稿者を最初の「正確」投票者として登録
    const verifyId = crypto.randomUUID();
    await db.prepare(
      'INSERT INTO verifications (id, event_id, user_id, verification_status, source_url) VALUES (?, ?, ?, ?, ?)'
    ).bind(verifyId, eventId, added_by, 'confirmed', safeSourceUrl || null).run();

    return NextResponse.json({ id: eventId }, { status: 201 });
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

    const body = await request.json() as any;
    const { id, title, description } = body;

    if (!id || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 権限チェック: 投稿者本人か確認
    const existing = await db.prepare('SELECT added_by FROM events WHERE id = ?').bind(id).first();
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (existing.added_by !== user.id) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    if (title.length > 100) {
      return NextResponse.json({ error: 'タイトルが長すぎます' }, { status: 400 });
    }
    if (description && description.length > 2000) {
      return NextResponse.json({ error: '説明文が長すぎます' }, { status: 400 });
    }

    await db.prepare(
      'UPDATE events SET title = ?, description = ? WHERE id = ?'
    ).bind(title, description || null, id).run();

    return NextResponse.json({ ok: true });
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

    // 権限チェック: 投稿者本人か確認
    const existing = await db.prepare('SELECT added_by FROM events WHERE id = ?').bind(id).first();
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (existing.added_by !== user.id) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // 関連する投票データも削除
    await db.prepare('DELETE FROM verifications WHERE event_id = ?').bind(id).run();
    await db.prepare('DELETE FROM events WHERE id = ?').bind(id).run();

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
