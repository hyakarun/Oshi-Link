'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminShell } from '@/components/admin/AdminShell';
import { adminFetch } from '@/lib/admin/client';

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  end_time: string | null;
  location: string | null;
  group_id: string;
  group_name: string;
  creator_email: string | null;
};

type CalendarOption = { id: string; name: string };

export default function ManageEventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [q, setQ] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    date: '',
    end_time: '',
    location: '',
    group_id: '',
  });

  const loadCalendars = useCallback(async () => {
    const data = await adminFetch<{ calendars: CalendarOption[] }>('/api/manage-hq?resource=calendars');
    setCalendars(data.calendars.map((c) => ({ id: c.id, name: c.name })));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (groupFilter) params.set('group_id', groupFilter);
      const data = await adminFetch<{ events: EventRow[] }>(
        `/api/manage-hq?resource=events&${params.toString()}`
      );
      setEvents(data.events);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '読み込み失敗');
    } finally {
      setLoading(false);
    }
  }, [q, groupFilter]);

  useEffect(() => {
    loadCalendars();
  }, [loadCalendars]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(ev: EventRow) {
    setEditId(ev.id);
    setForm({
      title: ev.title,
      description: ev.description || '',
      date: ev.date?.slice(0, 16) || '',
      end_time: ev.end_time?.slice(0, 16) || '',
      location: ev.location || '',
      group_id: ev.group_id,
    });
  }

  async function saveEdit() {
    if (!editId) return;
    try {
      await adminFetch('/api/manage-hq?resource=events', {
        method: 'PATCH',
        body: JSON.stringify({
          id: editId,
          title: form.title,
          description: form.description || null,
          date: form.date,
          end_time: form.end_time || null,
          location: form.location || null,
          group_id: form.group_id,
        }),
      });
      setMessage('保存しました');
      setEditId(null);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '保存失敗');
    }
  }

  async function removeEvent(id: string, title: string) {
    if (!confirm(`予定「${title}」を削除しますか？`)) return;
    try {
      await adminFetch(`/api/manage-hq?resource=events&id=${id}`, { method: 'DELETE' });
      setMessage('削除しました');
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '削除失敗');
    }
  }

  return (
    <AdminGuard>
      <AdminShell>
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">予定</h2>
            <p className="text-sm text-zinc-500">修正・削除・カレンダー移動</p>
          </div>

          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              load();
            }}
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="タイトル・説明で検索"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm min-w-[200px]"
            />
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
            >
              <option value="">すべてのカレンダー</option>
              {calendars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-lg bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700">
              検索
            </button>
          </form>

          {message && (
            <p className="text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
              {message}
            </p>
          )}

          {loading ? (
            <p className="text-zinc-500">読み込み中…</p>
          ) : (
            <div className="space-y-3">
              {events.map((ev) => (
                <div key={ev.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  {editId === ev.id ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={form.title}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                        className="rounded border border-zinc-600 bg-zinc-950 px-2 py-1 sm:col-span-2"
                        placeholder="タイトル"
                      />
                      <textarea
                        value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        className="rounded border border-zinc-600 bg-zinc-950 px-2 py-1 sm:col-span-2 text-sm"
                        rows={2}
                        placeholder="説明"
                      />
                      <input
                        type="datetime-local"
                        value={form.date}
                        onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                        className="rounded border border-zinc-600 bg-zinc-950 px-2 py-1"
                      />
                      <input
                        type="datetime-local"
                        value={form.end_time}
                        onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                        className="rounded border border-zinc-600 bg-zinc-950 px-2 py-1"
                      />
                      <input
                        value={form.location}
                        onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                        className="rounded border border-zinc-600 bg-zinc-950 px-2 py-1"
                        placeholder="場所"
                      />
                      <select
                        value={form.group_id}
                        onChange={(e) => setForm((f) => ({ ...f, group_id: e.target.value }))}
                        className="rounded border border-zinc-600 bg-zinc-950 px-2 py-1"
                      >
                        {calendars.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <div className="sm:col-span-2 flex gap-3">
                        <button type="button" onClick={saveEdit} className="text-violet-400 hover:underline">
                          保存
                        </button>
                        <button type="button" onClick={() => setEditId(null)} className="text-zinc-500 hover:underline">
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="font-medium">{ev.title}</div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {ev.group_name} · {ev.date}
                        {ev.creator_email && ` · ${ev.creator_email}`}
                      </div>
                      {ev.location && <div className="text-sm text-zinc-400 mt-1">{ev.location}</div>}
                      <div className="mt-2 flex gap-3 text-sm">
                        <button type="button" onClick={() => startEdit(ev)} className="text-violet-400 hover:underline">
                          編集
                        </button>
                        <button
                          type="button"
                          onClick={() => removeEvent(ev.id, ev.title)}
                          className="text-red-400 hover:underline"
                        >
                          削除
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {events.length === 0 && <p className="text-zinc-500 text-center py-8">予定がありません</p>}
            </div>
          )}
        </div>
      </AdminShell>
    </AdminGuard>
  );
}
