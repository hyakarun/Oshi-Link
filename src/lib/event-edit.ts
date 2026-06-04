const CREATOR_EDIT_WINDOW_MS = 60 * 60 * 1000;

export type EventEditUser = {
  id: string;
  is_official?: boolean;
  official_groups?: string[];
};

/** D1/SQLite の CURRENT_TIMESTAMP は UTC。タイムゾーンなし文字列は UTC として解釈する */
export function parseEventTimestamp(value: string): Date {
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  if (/[zZ]$/.test(normalized) || /[+-]\d{2}:\d{2}$/.test(normalized)) {
    return new Date(normalized);
  }
  return new Date(`${normalized}Z`);
}

export function isOfficialCalendarManager(
  user: EventEditUser | null | undefined,
  groupId: string | undefined
): boolean {
  if (!user || !groupId) return false;
  return !!user.official_groups?.includes(groupId);
}

export function canCreatorEditEvent(
  event: {
    added_by?: string;
    creator_edit_used?: boolean;
    created_at?: string;
  },
  userId?: string | null
): boolean {
  if (!userId || !event.added_by || event.added_by !== userId) return false;
  if (event.creator_edit_used) return false;
  if (!event.created_at) return false;
  const created = parseEventTimestamp(event.created_at);
  if (Number.isNaN(created.getTime())) return false;
  return Date.now() - created.getTime() < CREATOR_EDIT_WINDOW_MS;
}

export function canEditEvent(
  event: {
    added_by?: string;
    group_id?: string;
    creator_edit_used?: boolean;
    created_at?: string;
  },
  user: EventEditUser | null | undefined
): boolean {
  if (!user?.id || !event.group_id) return false;
  if (isOfficialCalendarManager(user, event.group_id)) return true;
  return canCreatorEditEvent(event, user.id);
}

export function canDeleteEvent(
  event: { added_by?: string; group_id?: string },
  user: EventEditUser | null | undefined
): boolean {
  if (!user?.id) return false;
  if (event.group_id && isOfficialCalendarManager(user, event.group_id)) return true;
  return event.added_by === user.id;
}

export function creatorEditRemainingMs(event: { created_at?: string }): number {
  if (!event.created_at) return 0;
  const created = parseEventTimestamp(event.created_at);
  if (Number.isNaN(created.getTime())) return 0;
  return Math.max(0, CREATOR_EDIT_WINDOW_MS - (Date.now() - created.getTime()));
}

export function isUnlimitedOfficialEdit(
  user: EventEditUser | null | undefined,
  groupId: string | undefined
): boolean {
  return isOfficialCalendarManager(user, groupId);
}
