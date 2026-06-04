'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminShell } from '@/components/admin/AdminShell';
import { adminFetch } from '@/lib/admin/client';

type SystemOfficial = { id: string; name: string; email: string };
type LinkRow = {
  id: string;
  group_id: string;
  user_id: string;
  group_name: string;
  user_name: string;
  user_email: string;
};
type UserOption = { id: string; name: string; email: string };
type CalendarOption = { id: string; name: string; is_official: boolean };
type PendingApplication = {
  id: string;
  user_id: string;
  calendar_name: string;
  user_name: string;
  user_email: string;
  created_at: string;
};

export default function ManageOfficialsPage() {
  const [systemOfficials, setSystemOfficials] = useState<SystemOfficial[]>([]);
  const [pendingApplications, setPendingApplications] = useState<PendingApplication[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [message, setMessage] = useState('');
  const [appointUserId, setAppointUserId] = useState('');
  const [linkUserId, setLinkUserId] = useState('');
  const [linkGroupId, setLinkGroupId] = useState('');
  const [newCalUserId, setNewCalUserId] = useState('');
  const [newCalName, setNewCalName] = useState('');
  const [newCalDesc, setNewCalDesc] = useState('');
  const [reviewNote, setReviewNote] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await adminFetch<{
        system_officials: SystemOfficial[];
        pending_applications: PendingApplication[];
        links: LinkRow[];
        users: UserOption[];
        calendars: CalendarOption[];
      }>('/api/manage-hq/officials');
      setSystemOfficials(data.system_officials);
      setPendingApplications(data.pending_applications || []);
      setLinks(data.links);
      setUsers(data.users);
      setCalendars(data.calendars);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '読み込み失敗');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function appointSystem(e: FormEvent) {
    e.preventDefault();
    if (!appointUserId) return;
    try {
      await adminFetch('/api/manage-hq/officials', {
        method: 'POST',
        body: JSON.stringify({ action: 'appoint_system', user_id: appointUserId }),
      });
      setMessage('公式アカウントに任命しました');
      setAppointUserId('');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '任命失敗');
    }
  }

  async function linkCalendar(e: FormEvent) {
    e.preventDefault();
    if (!linkUserId || !linkGroupId) return;
    try {
      await adminFetch('/api/manage-hq/officials', {
        method: 'POST',
        body: JSON.stringify({ action: 'link', user_id: linkUserId, group_id: linkGroupId }),
      });
      setMessage('カレンダーと紐付けました');
      setLinkUserId('');
      setLinkGroupId('');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '紐付け失敗');
    }
  }

  async function createOfficialCalendar(e: FormEvent) {
    e.preventDefault();
    if (!newCalUserId || !newCalName.trim()) return;
    try {
      await adminFetch('/api/manage-hq/officials', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create_official_calendar',
          user_id: newCalUserId,
          calendar_name: newCalName,
          calendar_description: newCalDesc || undefined,
        }),
      });
      setMessage('公式カレンダーを作成しました');
      setNewCalName('');
      setNewCalDesc('');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '作成失敗');
    }
  }

  async function reviewApplication(id: string, decision: 'approve' | 'reject') {
    const label = decision === 'approve' ? '承認' : '却下';
    if (!confirm(`この公式申請を${label}しますか？`)) return;
    try {
      await adminFetch('/api/manage-hq/officials', {
        method: 'POST',
        body: JSON.stringify({
          action: 'review_application',
          application_id: id,
          decision,
          admin_note: reviewNote.trim() || undefined,
        }),
      });
      setMessage(decision === 'approve' ? '公式申請を承認しました' : '公式申請を却下しました');
      setReviewNote('');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '処理失敗');
    }
  }

  async function revokeSystem(userId: string, email: string) {
    if (!confirm(`${email} の公式アカウント権限を解除しますか？`)) return;
    try {
      await adminFetch(`/api/manage-hq/officials?type=system&user_id=${userId}`, { method: 'DELETE' });
      setMessage('公式権限を解除しました');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '解除失敗');
    }
  }

  async function unlink(row: LinkRow) {
    if (!confirm(`${row.user_email} × ${row.group_name} の紐付けを解除しますか？`)) return;
    try {
      await adminFetch(
        `/api/manage-hq/officials?type=link&user_id=${row.user_id}&group_id=${row.group_id}`,
        { method: 'DELETE' }
      );
      setMessage('紐付けを解除しました');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '解除失敗');
    }
  }

  const userSelect = (value: string, onChange: (v: string) => void) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
      required
    >
      <option value="">ユーザーを選択</option>
      {users.map((u) => (
        <option key={u.id} value={u.id}>
          {u.name} ({u.email})
        </option>
      ))}
    </select>
  );

  return (
    <AdminGuard>
      <AdminShell>
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold">公式アカウント</h2>
            <p className="text-sm text-zinc-500">任命・審査・カレンダー紐付け</p>
          </div>

          {message && (
            <p className="text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
              {message}
            </p>
          )}

          <section className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
            <h3 className="font-medium text-amber-200">公式カレンダー申請（審査待ち）</h3>
            {pendingApplications.length === 0 ? (
              <p className="text-sm text-zinc-500">審査待ちの申請はありません</p>
            ) : (
              <ul className="space-y-3">
                {pendingApplications.map((app) => (
                  <li
                    key={app.id}
                    className="rounded-lg border border-zinc-700 bg-zinc-950/50 p-3 space-y-2"
                  >
                    <div className="text-sm">
                      <p className="font-medium">{app.user_name}</p>
                      <p className="text-zinc-500 text-xs">{app.user_email}</p>
                      <p className="mt-1">
                        希望カレンダー名: <span className="text-zinc-200">{app.calendar_name}</span>
                      </p>
                      <p className="text-zinc-600 text-xs mt-0.5">
                        申請日: {new Date(app.created_at).toLocaleString('ja-JP')}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => reviewApplication(app.id, 'approve')}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs hover:bg-emerald-500"
                      >
                        承認
                      </button>
                      <button
                        type="button"
                        onClick={() => reviewApplication(app.id, 'reject')}
                        className="rounded-lg bg-red-600/80 px-3 py-1.5 text-xs hover:bg-red-600"
                      >
                        却下
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <input
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="承認・却下時のメモ（任意・全申請に共通）"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            />
          </section>

          <section className="rounded-xl border border-zinc-800 p-4 space-y-3">
            <h3 className="font-medium">システム公式アカウント（is_official）</h3>
            <ul className="text-sm space-y-1">
              {systemOfficials.map((u) => (
                <li key={u.id} className="flex justify-between items-center gap-2">
                  <span>
                    {u.name} <span className="text-zinc-500">({u.email})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => revokeSystem(u.id, u.email)}
                    className="text-red-400 text-xs hover:underline shrink-0"
                  >
                    解除
                  </button>
                </li>
              ))}
              {systemOfficials.length === 0 && <li className="text-zinc-500">なし</li>}
            </ul>
            <form onSubmit={appointSystem} className="flex flex-wrap gap-2 items-end pt-2 border-t border-zinc-800">
              <div className="flex-1 min-w-[200px]">{userSelect(appointUserId, setAppointUserId)}</div>
              <button type="submit" className="rounded-lg bg-violet-600 px-4 py-2 text-sm hover:bg-violet-500">
                公式に任命
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-zinc-800 p-4 space-y-3">
            <h3 className="font-medium">公式 × カレンダー紐付け</h3>
            <ul className="text-sm space-y-2">
              {links.map((row) => (
                <li key={row.id} className="flex justify-between gap-2 border-b border-zinc-800/50 pb-2">
                  <span>
                    <span className="text-zinc-400">{row.group_name}</span>
                    {' ← '}
                    {row.user_name} ({row.user_email})
                  </span>
                  <button type="button" onClick={() => unlink(row)} className="text-red-400 text-xs hover:underline">
                    解除
                  </button>
                </li>
              ))}
              {links.length === 0 && <li className="text-zinc-500">紐付けなし</li>}
            </ul>
            <form onSubmit={linkCalendar} className="grid sm:grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
              {userSelect(linkUserId, setLinkUserId)}
              <select
                value={linkGroupId}
                onChange={(e) => setLinkGroupId(e.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                required
              >
                <option value="">カレンダーを選択</option>
                {calendars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.is_official ? ' (公式)' : ''}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="sm:col-span-2 rounded-lg bg-violet-600 px-4 py-2 text-sm hover:bg-violet-500 w-fit"
              >
                既存カレンダーに紐付け
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-zinc-800 p-4 space-y-3">
            <h3 className="font-medium">公式カレンダー新規作成</h3>
            <form onSubmit={createOfficialCalendar} className="grid sm:grid-cols-2 gap-2">
              <div className="sm:col-span-2">{userSelect(newCalUserId, setNewCalUserId)}</div>
              <input
                value={newCalName}
                onChange={(e) => setNewCalName(e.target.value)}
                placeholder="カレンダー名"
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                required
              />
              <input
                value={newCalDesc}
                onChange={(e) => setNewCalDesc(e.target.value)}
                placeholder="説明（任意）"
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="sm:col-span-2 rounded-lg bg-violet-600 px-4 py-2 text-sm hover:bg-violet-500 w-fit"
              >
                作成して紐付け
              </button>
            </form>
          </section>
        </div>
      </AdminShell>
    </AdminGuard>
  );
}
