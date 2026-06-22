'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminShell } from '@/components/admin/AdminShell';
import { STATUS_OPTIONS, adminFetch, statusBadgeClass } from '@/lib/admin/client';

type CalendarRow = {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  is_official: boolean;
  follower_count: number;
  event_count: number;
};

export default function ManageCalendarsPage() {
  const [calendars, setCalendars] = useState<CalendarRow[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState('active');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch<{ calendars: CalendarRow[] }>(
        `/api/manage-hq?resource=calendars${q ? `&q=${encodeURIComponent(q)}` : ''}`
      );
      setCalendars(data.calendars);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '読み込み失敗');
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(c: CalendarRow) {
    setEditId(c.id);
    setEditName(c.name);
    setEditDesc(c.description || '');
    setEditStatus(c.status || 'active');
  }

  async function saveEdit() {
    if (!editId) return;
    try {
      await adminFetch('/api/manage-hq?resource=calendars', {
        method: 'PATCH',
        body: JSON.stringify({
          id: editId,
          name: editName,
          description: editDesc || null,
          status: editStatus,
        }),
      });
      setMessage('保存しました');
      setEditId(null);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '保存失敗');
    }
  }

  async function removeCalendar(id: string, name: string) {
    if (!confirm(`カレンダー「${name}」を完全削除しますか？`)) return;
    try {
      await adminFetch(`/api/manage-hq?resource=calendars&id=${id}`, { method: 'DELETE' });
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
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <h2 className="text-xl font-semibold">カレンダー</h2>
              <p className="text-sm text-zinc-500">凍結・BAN・情報修正・削除</p>
            </div>
            <form
              className="ml-auto flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                load();
              }}
            >
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="名前で検索"
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm min-w-[200px]"
              />
              <button type="submit" className="rounded-lg bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700">
                検索
              </button>
            </form>
          </div>

          {message && (
            <p className="text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
              {message}
            </p>
          )}

          {loading ? (
            <p className="text-zinc-500">読み込み中…</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900 text-zinc-400 text-left">
                  <tr>
                    <th className="px-3 py-2">名前</th>
                    <th className="px-3 py-2">状態</th>
                    <th className="px-3 py-2">公式</th>
                    <th className="px-3 py-2">フォロワー</th>
                    <th className="px-3 py-2">予定数</th>
                    <th className="px-3 py-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {calendars.map((c) => (
                    <tr key={c.id} className="border-t border-zinc-800">
                      <td className="px-3 py-2 max-w-xs">
                        {editId === c.id ? (
                          <div className="space-y-1">
                            <input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1"
                            />
                            <textarea
                              value={editDesc}
                              onChange={(e) => setEditDesc(e.target.value)}
                              placeholder="説明"
                              rows={2}
                              className="w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1 text-xs"
                            />
                          </div>
                        ) : (
                          <>
                            <div className="font-medium">{c.name}</div>
                            {c.description && <div className="text-zinc-500 text-xs truncate">{c.description}</div>}
                          </>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editId === c.id ? (
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            className="rounded border border-zinc-600 bg-zinc-950 px-2 py-1"
                          >
                            {STATUS_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`inline-block px-2 py-0.5 rounded border text-xs ${statusBadgeClass(c.status)}`}
                          >
                            {c.status || 'active'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">{c.is_official ? 'はい' : '—'}</td>
                      <td className="px-3 py-2">{c.follower_count}</td>
                      <td className="px-3 py-2">{c.event_count}</td>
                      <td className="px-3 py-2 space-x-2 whitespace-nowrap">
                        {editId === c.id ? (
                          <>
                            <button type="button" onClick={saveEdit} className="text-violet-400 hover:underline">
                              保存
                            </button>
                            <button type="button" onClick={() => setEditId(null)} className="text-zinc-500 hover:underline">
                              取消
                            </button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => startEdit(c)} className="text-violet-400 hover:underline">
                              編集
                            </button>
                            <button
                              type="button"
                              onClick={() => removeCalendar(c.id, c.name)}
                              className="text-red-400 hover:underline"
                            >
                              削除
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {calendars.length === 0 && <p className="p-4 text-zinc-500 text-center">カレンダーがありません</p>}
            </div>
          )}
        </div>
      </AdminShell>
    </AdminGuard>
  );
}
