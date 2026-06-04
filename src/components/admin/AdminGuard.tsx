'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch('/api/manage-hq/auth', { credentials: 'include' })
      .then((r) => {
        if (!r.ok) router.replace('/manage-hq/login');
        else setReady(true);
      })
      .catch(() => router.replace('/manage-hq/login'));
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        認証確認中…
      </div>
    );
  }

  return <>{children}</>;
}
