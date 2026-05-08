import { useState, useCallback } from 'react';
import { Group, Event, User } from '@/lib/types';

interface UseCalendarDataProps {
  user: User | null;
  authHeaders: () => Record<string, string>;
}

export function useCalendarData({ user, authHeaders }: UseCalendarDataProps) {
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [followedGroups, setFollowedGroups] = useState<Group[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState<string | null>(null);

  const loadGroups = useCallback(async (userId?: string) => {
    try {
      const uid = userId || user?.id || '';
      let url = uid ? `/api/groups?user_id=${uid}` : '/api/groups';
      url += (url.includes('?') ? '&' : '?') + 't=' + Date.now();
      const res = await fetch(url, { cache: 'no-store', headers: authHeaders() });
      const data = await res.json() as { groups?: Group[] };
      const groups = data.groups || data as unknown as Group[] || [];
      setAllGroups(groups);
      setFollowedGroups(groups.filter(g => g.is_following));
    } catch {}
  }, [user?.id, authHeaders]);

  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/events?t=' + Date.now(), { cache: 'no-store', headers: authHeaders() });
      const data = await res.json() as { events?: Event[] };
      const eventList = data.events || data as unknown as Event[] || [];
      setEvents(eventList);
    } catch {}
  }, [authHeaders]);

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
        const data = await res.json() as any;
        if (data.limitReached) {
          alert(data.error);
          setFollowLoading(null);
          return;
        }
      }
      await loadGroups(user.id);
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
        await loadGroups(user.id);
        if (activeGroupId === groupId) {
          setActiveGroupId('0');
        }
      } else {
        alert('削除に失敗しました');
      }
    } catch (e) {
      alert('通信エラーが発生しました');
    }
    setLoading(false);
  };

  const [groupLoading, setGroupLoading] = useState(false);

  const handleSavePersonalization = async (e: React.FormEvent<HTMLFormElement>, group: Group | null, onSuccess: () => void) => {
    e.preventDefault();
    if (!group) return;
    setGroupLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      group_id: group.id,
      custom_theme_color: fd.get('custom_theme_color'),
      custom_bg_image: fd.get('custom_bg_image'),
    };
    try {
      const res = await fetch('/api/groups', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await loadGroups();
        onSuccess();
      }
    } catch {}
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
      }
    } catch {}
    setGroupLoading(false);
  };

  return {
    allGroups,
    followedGroups,
    events,
    loading,
    setLoading,
    groupLoading,
    followLoading,
    loadGroups,
    loadEvents,
    handleFollowToggle,
    handleUnfollow,
    handleSavePersonalization,
    handleCreateGroup
  };
}
