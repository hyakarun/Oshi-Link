'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { adminFetch } from '@/lib/admin/client';

const NAV = [
  { href: '/manage-hq/users', label: 'ユーザー' },
  { href: '/manage-hq/calendars', label: 'カレンダー' },
  { href: '/manage-hq/events', label: '予定' },
  { href: '/manage-hq/officials', label: '公式アカウント' },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await adminFetch('/api/manage-hq/auth', { method: 'DELETE' }).catch(() => {});
    router.replace('/manage-hq/login');
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Internal</p>
            <h1 className="font-semibold text-lg">Oshi-Link 管理</h1>
          </div>
          <nav className="flex flex-wrap gap-1">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    active
                      ? 'bg-violet-600 text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={logout}
            className="text-sm text-zinc-400 hover:text-white px-3 py-1.5 rounded-md border border-zinc-700"
          >
            ログアウト
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
