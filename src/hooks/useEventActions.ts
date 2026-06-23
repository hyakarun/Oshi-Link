import React from 'react';
import { Event, User } from '@/lib/types';
import { isOfficialCalendarManager } from '@/lib/event-edit';

type LocationValue = {
  name: string;
  shortName: string;
  address: string;
  latitude: number;
  longitude: number;
} | null;

interface UseEventActionsParams {
  user: User | null;
  authHeaders: () => Record<string, string>;
  loadEvents: () => Promise<void>;
  setLoading: (v: boolean) => void;
  selectedEvent: Event | null;
  setSelectedEvent: React.Dispatch<React.SetStateAction<Event | null>>;
  openProfile: () => void;
  // 予定追加フォームの状態
  selectedGroupId: string;
  eventCategory: string;
  eventSubCategory: string;
  selectedLocation: LocationValue;
  setSelectedLocation: (v: LocationValue) => void;
  closeAddModal: () => void;
}

/** カレンダー予定の追加・更新・削除・検証・iCal 出力をまとめたハンドラ群 */
export function useEventActions({
  user,
  authHeaders,
  loadEvents,
  setLoading,
  selectedEvent,
  setSelectedEvent,
  openProfile,
  selectedGroupId,
  eventCategory,
  eventSubCategory,
  selectedLocation,
  setSelectedLocation,
  closeAddModal,
}: UseEventActionsParams) {
  const handleAddEventSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) { openProfile(); return; }
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const dateVal = fd.get('date') as string;
    const isAllDay = fd.get('isAllDay') === '1';
    const repeatByPeriod = fd.get('repeat_period') === '1';
    const repeatByWeekday = fd.get('repeat_weekly') === '1';
    const repeatUntil = repeatByPeriod ? (fd.get('repeat_until') as string) : null;
    const repeatWeekdays = repeatByWeekday
      ? String(fd.get('repeat_weekdays') || '')
          .split(',')
          .map((v) => Number(v))
          .filter((v) => Number.isInteger(v) && v >= 0 && v <= 6)
      : [];
    const startTime = isAllDay ? null : fd.get('startTime') as string;
    const endTime = isAllDay ? null : fd.get('endTime') as string;
    const dateStr = startTime ? `${dateVal}T${startTime}:00` : `${dateVal}T00:00:00`;

    const body = {
      group_id: selectedGroupId,
      title: fd.get('title'),
      date: dateStr,
      end_time: endTime ? `${dateVal}T${endTime}:00` : null,
      category: eventCategory,
      sub_category: eventSubCategory,
      location: fd.get('location'),
      address: selectedLocation?.address || (fd.get('location') as string) || null,
      latitude: selectedLocation?.latitude ?? null,
      longitude: selectedLocation?.longitude ?? null,
      description: fd.get('description'),
      source_url: fd.get('source_url'),
      repeat_period: repeatByPeriod,
      repeat_weekly: repeatByWeekday,
      repeat_until: repeatUntil,
      repeat_weekdays: repeatWeekdays,
      is_all_day: isAllDay,
    };

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const created = await res.json() as { created_count?: number };
        await loadEvents();
        closeAddModal();
        setSelectedLocation(null);
        (e.target as HTMLFormElement).reset();
        if ((created.created_count || 1) > 1) {
          alert(`${created.created_count}件の予定をまとめて登録しました`);
        }
      } else {
        const error = await res.json() as { error: string; details?: string };
        alert(error.details || error.error || '登録に失敗しました');
      }
    } catch { alert('通信エラーが発生しました'); }
    setLoading(false);
  };

  const handleUpdateEvent = async (e: React.FormEvent<HTMLFormElement>, onSuccess?: () => void) => {
    e.preventDefault();
    if (!selectedEvent || !user) return;
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const dateVal = fd.get('date') as string;
    const isAllDay = fd.get('isAllDay') === '1';
    const startTime = isAllDay ? null : (fd.get('startTime') as string);
    const endTime = isAllDay ? null : (fd.get('endTime') as string);
    const dateStr = startTime ? `${dateVal}T${startTime}:00` : `${dateVal}T00:00:00`;
    const lat = fd.get('latitude') as string;
    const lng = fd.get('longitude') as string;

    const body = {
      id: selectedEvent.id,
      group_id: fd.get('group_id'),
      title: fd.get('title'),
      date: dateStr,
      end_time: endTime ? `${dateVal}T${endTime}:00` : null,
      category: fd.get('category'),
      sub_category: fd.get('sub_category'),
      location: fd.get('location') || null,
      address: fd.get('address') || null,
      latitude: lat ? Number(lat) : null,
      longitude: lng ? Number(lng) : null,
      description: fd.get('description') || null,
      source_url: fd.get('source_url'),
      is_all_day: isAllDay,
    };

    try {
      const res = await fetch('/api/events', {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await loadEvents();
        const isOfficialPoster =
          isOfficialCalendarManager(user, body.group_id as string);
        setSelectedEvent((prev) =>
          prev
            ? {
                ...prev,
                group_id: body.group_id as string,
                title: body.title as string,
                date: body.date as string,
                end_time: (body.end_time as string) || undefined,
                category: body.category as string,
                sub_category: (body.sub_category as string) || undefined,
                location: (body.location as string) || undefined,
                address: (body.address as string) || undefined,
                latitude: body.latitude ?? undefined,
                longitude: body.longitude ?? undefined,
                description: (body.description as string) || undefined,
                source_url: body.source_url as string,
                is_all_day: isAllDay,
                creator_edit_used: isOfficialPoster ? prev.creator_edit_used : true,
                is_tentative: isOfficialPoster ? prev.is_tentative : true,
              }
            : null
        );
        onSuccess?.();
      } else {
        const error = await res.json() as { error?: string };
        alert(error.error || '更新に失敗しました');
      }
    } catch {
      alert('通信エラーが発生しました');
    }
    setLoading(false);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!user) return;
    if (!window.confirm('この予定を削除しますか？')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/events?id=${encodeURIComponent(eventId)}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        await loadEvents();
        setSelectedEvent(null);
      } else {
        const error = await res.json() as { error?: string };
        alert(error.error || '削除に失敗しました');
      }
    } catch {
      alert('通信エラーが発生しました');
    }
    setLoading(false);
  };

  const handleVerify = async (status: 'confirmed' | 'disputed') => {
    if (!selectedEvent || !user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/events/verify', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: selectedEvent.id, status }),
      });
      if (res.ok) {
        await loadEvents();
        const data = await res.json() as { confirms: number; disputes: number; is_tentative: number; verified: number; disputed: number; user_vote: 'confirmed' | 'disputed' };
        setSelectedEvent(prev => prev ? {
          ...prev,
          confirms_count: data.confirms,
          disputes_count: data.disputes,
          is_tentative: !!data.is_tentative,
          verified: !!data.verified,
          disputed: !!data.disputed,
          user_vote: data.user_vote
        } : null);
      }
    } catch {}
    setLoading(false);
  };

  const handleiCalExport = (groupId: string) => {
    const token = localStorage.getItem('oshi_session');
    const url = `${window.location.origin}/api/groups/export?group_id=${groupId}${token ? `&token=${token}` : ''}`;
    const webcal = url.replace('https:', 'webcal:').replace('http:', 'webcal:');
    window.location.href = webcal;
  };

  return {
    handleAddEventSubmit,
    handleUpdateEvent,
    handleDeleteEvent,
    handleVerify,
    handleiCalExport,
  };
}
