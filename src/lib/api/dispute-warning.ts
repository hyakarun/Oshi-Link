/** 不正確判定の未確認予定がありログイン時に警告する（auth/me・bootstrap 共通） */
export async function resolveDisputeWarning(
  db: D1Database,
  userId: string
): Promise<boolean> {
  try {
    const disputed = await db
      .prepare(
        'SELECT id FROM events WHERE created_by = ? AND disputed = 1 AND dispute_acknowledged = 0 LIMIT 1'
      )
      .bind(userId)
      .all();

    const hasNewDispute = !!(disputed.results && disputed.results.length > 0);

    if (hasNewDispute) {
      await db
        .prepare(
          'UPDATE events SET dispute_acknowledged = 1 WHERE created_by = ? AND disputed = 1 AND dispute_acknowledged = 0'
        )
        .bind(userId)
        .run();
    }

    return hasNewDispute;
  } catch (err) {
    console.error('Dispute warning check failed:', err);
    return false;
  }
}
