export async function deleteEventCascade(db: D1Database, eventId: string) {
  await db.prepare('DELETE FROM proposal_votes WHERE event_id = ?').bind(eventId).run();
  await db.prepare('DELETE FROM event_proposals WHERE event_id = ?').bind(eventId).run();
  await db.prepare('DELETE FROM verifications WHERE event_id = ?').bind(eventId).run();
  await db.prepare('DELETE FROM events WHERE id = ?').bind(eventId).run();
}

export async function deleteGroupCascade(db: D1Database, groupId: string) {
  const events = await db.prepare('SELECT id FROM events WHERE group_id = ?').bind(groupId).all();
  for (const row of (events.results || []) as { id: string }[]) {
    await deleteEventCascade(db, row.id);
  }
  await db.prepare('DELETE FROM user_group_follows WHERE group_id = ?').bind(groupId).run();
  await db.prepare('DELETE FROM group_officials WHERE group_id = ?').bind(groupId).run();
  await db.prepare('DELETE FROM groups WHERE id = ?').bind(groupId).run();
}

export async function deleteUserCascade(db: D1Database, userId: string, email?: string) {
  const events = await db.prepare('SELECT id FROM events WHERE added_by = ?').bind(userId).all();
  for (const row of (events.results || []) as { id: string }[]) {
    await deleteEventCascade(db, row.id);
  }
  await db.prepare('DELETE FROM proposal_votes WHERE user_id = ?').bind(userId).run();
  await db.prepare('DELETE FROM event_proposals WHERE user_id = ?').bind(userId).run();
  await db.prepare('DELETE FROM verifications WHERE user_id = ?').bind(userId).run();
  await db.prepare('DELETE FROM subscriptions WHERE user_id = ?').bind(userId).run();
  await db.prepare('DELETE FROM user_group_follows WHERE user_id = ?').bind(userId).run();
  await db.prepare('DELETE FROM group_officials WHERE user_id = ?').bind(userId).run();
  await db.prepare('DELETE FROM official_applications WHERE user_id = ?').bind(userId).run();
  await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();
  if (email) {
    await db.prepare('DELETE FROM magic_links WHERE email = ?').bind(email).run();
  }
  await db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
}
