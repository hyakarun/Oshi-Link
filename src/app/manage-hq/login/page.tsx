'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ManageHqLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/manage-hq/auth', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || 'ログインに失敗しました');
        return;
      }
      router.replace('/manage-hq/users');
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl"
      >
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Internal</p>
        <h1 className="text-xl font-semibold text-white mb-6">管理ログイン</h1>
        <label className="block text-sm text-zinc-400 mb-2" htmlFor="password">
          管理パスワード
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white mb-4 focus:outline-none focus:ring-2 focus:ring-violet-500"
          autoComplete="current-password"
          required
        />
        {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white py-2 font-medium"
        >
          {loading ? 'ログイン中…' : 'ログイン'}
        </button>
      </form>
    </div>
  );
}
