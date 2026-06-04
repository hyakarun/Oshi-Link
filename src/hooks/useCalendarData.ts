import { useState, useCallback } from 'react';
import { Group, Event, User } from '@/lib/types';
import { takeBootstrapCache, type BootstrapPayload } from '@/lib/bootstrap-cache';

interface UseCalendarDataProps {
  user: User | null;
  authHeaders: () => Record<string, string>;
}

function parseEventsPayload(data: unknown): Event[] {
  if (data && typeof data === 'object' && Array.isArray((data as { events?: Event[] }).events)) {
    return (data as { events: Event[] }).events;
  }
  return Array.isArray(data) ? (data as Event[]) : [];
}

function parseGroupsPayload(data: unknown): Group[] {
  if (data && typeof data === 'object' && Array.isArray((data as { groups?: Group[] }).groups)) {
    return (data as { groups: Group[] }).groups;
  }
  return Array.isArray(data) ? (data as Group[]) : [];
}

export function useCalendarData({ user, authHeaders }: UseCalendarDataProps) {
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [followedGroups, setFollowedGroups] = useState<Group[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState<string | null>(null);

  const applyGroups = useCallback((groups: Group[]) => {
    setAllGroups(groups);
    setFollowedGroups(groups.filter((g) => g.is_following));
  }, []);

  const applyEvents = useCallback((eventList: Event[]) => {
    setEvents(eventList);
  }, []);

  const applyCalendarPayload = useCallback(
    (data: { groups: Group[]; events: Event[] }) => {
      applyGroups(data.groups);
      applyEvents(data.events);
    },
    [applyGroups, applyEvents]
  );

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/groups', { cache: 'no-store', headers: authHeaders() });
      const data = await res.json();
      applyGroups(parseGroupsPayload(data));
    } catch {
    } finally {
      setLoading(false);
      setIsInitialLoading(false);
    }
  }, [authHeaders, applyGroups]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/events', { cache: 'no-store', headers: authHeaders() });
      const data = await res.json();
      applyEvents(parseEventsPayload(data));
    } catch {
    } finally {
      setLoading(false);
    }
  }, [authHeaders, applyEvents]);

  /** 初回: checkAuth のキャッシュを適用。なければ bootstrap を取得 */
  const hydrateFromBootstrap = useCallback(
    async (onNews?: (items: { pubDate: string | null }[]) => void): Promise<boolean> => {
      const cached = takeBootstrapCache();
      if (cached) {
        applyCalendarPayload(cached);
        onNews?.(cached.news?.items ?? []);
        setLoading(false);
        setIsInitialLoading(false);
        return true;
      }

      setLoading(true);
      try {
        const res = await fetch('/api/bootstrap', { cache: 'no-store', headers: authHeaders() });
        if (!res.ok) return false;
        const data = (await res.json()) as BootstrapPayload & {
          groups: Group[];
          events: Event[];
          news?: { items: { pubDate: string | null }[] };
        };
        applyCalendarPayload(data);
        onNews?.(data.news?.items ?? []);
        return true;
      } catch {
        return false;
      } finally {
        setLoading(false);
        setIsInitialLoading(false);
      }
    },
    [authHeaders, applyCalendarPayload]
  );

  const handleFollowToggle = async (group: Group, onProfileOpen: () => void) => {
    if (!user) { onProfileOpen(); return; }
    setFollowLoading(group.id);
    try {
      const res = await fetch('/api/groups/follow', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: group.id }),
      });
      if (!res.ok) {
        const data = await res.json() as { limitReached?: boolean; error?: string };
        if (data.limitReached) {
          alert(data.error);
          setFollowLoading(null);
          return;
        }
      }
      await loadGroups();
    } catch {
      alert('エラーが発生しました');
    }
    setFollowLoading(null);
  };

  const handleUnfollow = async (groupId: string, activeGroupId: string, setActiveGroupId: (id: string) => void) => {
    if (!user) return;
    if (!window.confirm('このカレンダーを一覧から削除しますか？')) return;

    setLoading(true);
    try {
      const res = await fetch('/api/groups/follow', {
        method: 'DELETE',
        headers: authHeaders(),
        body: JSON.stringify({ user_id: user.id, group_id: groupId }),
      });
      if (res.ok) {
        await loadGroups();
        if (activeGroupId === groupId) {
          setActiveGroupId('0');
        }
      } else {
        alert('削除に失敗しました');
      }
    } catch {
      alert('通信エラーが発生しました');
    }
    setLoading(false);
  };

  const [groupLoading, setGroupLoading] = useState(false);

  const handleSavePersonalization = async (e: React.FormEvent<HTMLFormElement>, group: Group | null, onSuccess: (groupId: string) => void) => {
    e.preventDefault();
    if (!group) return;
    setGroupLoading(true);
    const fd = new FormData(e.currentTarget);
    const groupId = (fd.get('group_id') as string) || group.id;
    const custom_theme_color = (fd.get('custom_theme_color') as string) || null;
    const custom_bg_image = (fd.get('custom_bg_image') as string | null) || null;
    const body = { group_id: groupId, custom_theme_color, custom_bg_image };

    const applyLocal = () => {
      const patch = (g: Group) =>
        g.id === groupId ? { ...g, custom_theme_color: custom_theme_color || undefined, custom_bg_image: custom_bg_image || undefined } : g;
      setAllGroups(prev => prev.map(patch));
      setFollowedGroups(prev => prev.map(patch));
    };

    applyLocal();
    try {
      const res = await fetch('/api/groups/follow', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await loadGroups();
        onSuccess(groupId);
      } else {
        await loadGroups();
        const data = await res.json().catch(() => ({})) as { error?: string };
        alert(data.error || '設定の保存に失敗しました');
      }
    } catch {
      await loadGroups();
      alert('通信エラーが発生しました');
    }
    setGroupLoading(false);
  };

  const handleCreateGroup = async (e: React.FormEvent<HTMLFormElement>, onSuccess: () => void) => {
    e.preventDefault();
    if (!user) return;
    setGroupLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get('name'),
      description: fd.get('description'),
    };
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await loadGroups();
        onSuccess();
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        alert(data.error || 'カレンダーの作成に失敗しました');
      }
    } catch {
      alert('通信エラーが発生しました');
    }
    setGroupLoading(false);
  };

  const handleApplyOfficialCalendar = async (
    e: React.FormEvent<HTMLFormElement>,
    onSuccess: (alreadyPending?: boolean) => void
  ) => {
    e.preventDefault();
    if (!user) return;
    setGroupLoading(true);
    const fd = new FormData(e.currentTarget);
    const calendarName = (fd.get('name') as string)?.trim();
    if (!calendarName) {
      alert('カレンダー名を入力してください');
      setGroupLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/groups/official-application', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ calendar_name: calendarName }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string; already_pending?: boolean };
      if (res.ok) {
        if (data.already_pending) {
          alert('すでに審査中の公式カレンダー申請があります');
        } else {
          sessionStorage.setItem('oshi_official_application_pending', '1');
        }
        onSuccess(data.already_pending);
      } else {
        alert(data.error || '申請に失敗しました');
      }
    } catch {
      alert('通信エラーが発生しました');
    }
    setGroupLoading(false);
  };

  return {
    allGroups,
    followedGroups,
    events,
    loading,
    isInitialLoading,
    setLoading,
    groupLoading,
    followLoading,
    loadGroups,
    loadEvents,
    hydrateFromBootstrap,
    handleFollowToggle,
    handleUnfollow,
    handleSavePersonalization,
    handleCreateGroup,
    handleApplyOfficialCalendar,
  };
}
