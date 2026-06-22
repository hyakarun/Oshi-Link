"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { OshiLinkLogo } from '@/components/OshiLinkLogo';

interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: string;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mounted, setMounted] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    setMounted(true);
    async function checkAuth() {
      const errorParam = searchParams.get('error');
      if (errorParam) {
        alert(errorParam);
        router.replace('/login');
        return;
      }

      const sessionTokenParam = searchParams.get('session_token');
      if (sessionTokenParam) {
        localStorage.setItem('oshi_session', sessionTokenParam);
        const group = searchParams.get('group');
        router.replace(group ? `/?group=${group}` : '/');
        return;
      }

      const saved = localStorage.getItem('oshi_session');
      if (saved) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${saved}` },
          });
          if (res.ok) {
            const data = await res.json() as { user?: User };
            if (data.user) {
              const group = searchParams.get('group');
              router.push(group ? `/?group=${group}` : '/');
              return;
            }
          } else {
            localStorage.removeItem('oshi_session');
          }
        } catch {}
      }
      setIsAuthChecking(false);
    }
    checkAuth();
  }, [router, searchParams]);

  function loginWithDiscord() {
    const group = searchParams.get('group');
    window.location.href = group
      ? `/api/auth/discord?group=${encodeURIComponent(group)}`
      : '/api/auth/discord';
  }

  if (!mounted || isAuthChecking) {
    return (
      <div className="flex h-screen w-full bg-[#f2f2f2] items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <Loader2 className="animate-spin h-10 w-10 text-[#6366f1]" />
          <p className="text-sm font-bold text-gray-400">認証情報を確認中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-[#f2f2f2] to-gray-100 items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full animate-in fade-in zoom-in-95 duration-500">
          <div className="space-y-6">
            <div className="text-center relative">
              <div className="absolute top-0 right-0">
                <div className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-100/50">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                  </span>
                  Beta
                </div>
              </div>
              <OshiLinkLogo size={48} className="rounded-2xl shadow-lg mb-3 mx-auto" />
              <h2 className="text-xl font-black text-[#222222] tracking-tight">Oshi-Link をはじめる</h2>
              <p className="text-xs text-gray-500 mt-1">推しの予定を、これひとつで。</p>
            </div>

            <button
              type="button"
              onClick={loginWithDiscord}
              className="w-full h-12 flex items-center justify-center gap-2 text-white font-black rounded-xl transition-all active:scale-[0.98] shadow-lg text-sm"
              style={{ background: '#5865F2' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.036A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              Discordで続ける
            </button>

            <p className="text-center text-[10px] text-gray-400 leading-relaxed">
              Discordアカウントでログインします。<br />
              アカウントがない場合は自動で作成されます。
            </p>
          </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full bg-[#f2f2f2] items-center justify-center">
          <Loader2 className="animate-spin h-10 w-10 text-[#6366f1]" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
