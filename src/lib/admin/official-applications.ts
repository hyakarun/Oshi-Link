type Db = D1Database;

export type OfficialApplicationRow = {
  id: string;
  user_id: string;
  calendar_name: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  user_name?: string;
  user_email?: string;
};

export async function getLatestOfficialApplication(db: Db, userId: string) {
  return db
    .prepare(
      `SELECT id, user_id, calendar_name, status, admin_note, created_at, reviewed_at
       FROM official_applications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .bind(userId)
    .first<OfficialApplicationRow>();
}

export async function submitOfficialApplication(
  db: Db,
  userId: string,
  calendarName: string
): Promise<{ ok: true; already_pending?: boolean } | { ok: false; error: string }> {
  const trimmed = calendarName.trim();
  if (!trimmed) {
    return { ok: false, error: 'カレンダー名を入力してください' };
  }
  if (trimmed.length > 50) {
    return { ok: false, error: 'カレンダー名が長すぎます（最大50文字）' };
  }

  const user = await db
    .prepare('SELECT id, is_official FROM users WHERE id = ?')
    .bind(userId)
    .first<{ id: string; is_official: number }>();
  if (!user) {
    return { ok: false, error: 'ユーザーが見つかりません' };
  }
  if (user.is_official) {
    return { ok: false, error: 'すでに公式アカウントです。追加の申請は不要です' };
  }

  const pending = await db
    .prepare(
      `SELECT id FROM official_applications WHERE user_id = ? AND status = 'pending' LIMIT 1`
    )
    .bind(userId)
    .first();
  if (pending) {
    return { ok: true, already_pending: true };
  }

  await db
    .prepare(
      `INSERT INTO official_applications (id, user_id, calendar_name, status)
       VALUES (?, ?, ?, 'pending')`
    )
    .bind(crypto.randomUUID(), userId, trimmed)
    .run();

  return { ok: true };
}

export async function approveOfficialApplication(
  db: Db,
  applicationId: string,
  adminNote?: string | null
): Promise<{ ok: false; error: string } | { ok: true; group_id: string }> {
  const app = await db
    .prepare(
      `SELECT id, user_id, calendar_name, status FROM official_applications WHERE id = ?`
    )
    .bind(applicationId)
    .first<{ id: string; user_id: string; calendar_name: string; status: string }>();

  if (!app) {
    return { ok: false, error: '申請が見つかりません' };
  }
  if (app.status !== 'pending') {
    return { ok: false, error: 'この申請はすでに処理済みです' };
  }

  const groupId = crypto.randomUUID();
  await db.prepare('INSERT INTO groups (id, name) VALUES (?, ?)').bind(groupId, app.calendar_name).run();

  const officialId = crypto.randomUUID();
  await db
    .prepare('INSERT INTO group_officials (id, group_id, user_id) VALUES (?, ?, ?)')
    .bind(officialId, groupId, app.user_id)
    .run();

  const followId = crypto.randomUUID();
  await db
    .prepare('INSERT OR IGNORE INTO user_group_follows (id, user_id, group_id) VALUES (?, ?, ?)')
    .bind(followId, app.user_id, groupId)
    .run();

  await db.prepare('UPDATE users SET is_official = 1 WHERE id = ?').bind(app.user_id).run();

  await db
    .prepare(
      `UPDATE official_applications
       SET status = 'approved', admin_note = ?, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .bind(adminNote?.trim() || null, applicationId)
    .run();

  return { ok: true, group_id: groupId };
}

export async function rejectOfficialApplication(
  db: Db,
  applicationId: string,
  adminNote?: string | null
): Promise<{ ok: false; error: string } | { ok: true }> {
  const app = await db
    .prepare('SELECT status FROM official_applications WHERE id = ?')
    .bind(applicationId)
    .first<{ status: string }>();

  if (!app) {
    return { ok: false, error: '申請が見つかりません' };
  }
  if (app.status !== 'pending') {
    return { ok: false, error: 'この申請はすでに処理済みです' };
  }

  await db
    .prepare(
      `UPDATE official_applications
       SET status = 'rejected', admin_note = ?, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .bind(adminNote?.trim() || null, applicationId)
    .run();

  return { ok: true };
}
