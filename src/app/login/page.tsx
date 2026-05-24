"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, Loader2, Users, Bell, ShieldCheck } from 'lucide-react';

// Minimal User interface to match existing
interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: string;
}

// モジュールレベルで管理：React再レンダリング・StrictModeの二重実行でもリセットされない
// ※ windowに持たせることでHMR時のリセットも防ぐ
declare global { interface Window { __gsiInitialized?: boolean } }

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authStep, setAuthStep] = useState<'idle' | 'sent' | 'logging_in'>('idle');
  const [authEmail, setAuthEmail] = useState('');
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isOfficial, setIsOfficial] = useState(false);
  const [calendarName, setCalendarName] = useState('');
  const [loginTab, setLoginTab] = useState<'google' | 'email'>('google');
  const isOfficialRef = React.useRef(false);
  const calendarNameRef = React.useRef('');

  // refをstateと同期（Googleコールバックのクロージャから最新値を参照するため）
  React.useEffect(() => { isOfficialRef.current = isOfficial; }, [isOfficial]);
  React.useEffect(() => { calendarNameRef.current = calendarName; }, [calendarName]);

  // 1. セッションが既にあるか、URLトークンがあるかチェック
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

      const urlToken = searchParams.get('token');
      if (urlToken) {
        setAuthStep('logging_in');
        try {
          const res = await fetch(`/api/auth/verify?token=${urlToken}`);
          const data = await res.json() as { ok?: boolean; sessionToken?: string; user?: User; error?: string };
          if (data.ok && data.sessionToken && data.user) {
            localStorage.setItem('oshi_session', data.sessionToken);
            const group = searchParams.get('group');
            router.push(group ? `/?group=${group}` : '/');
            return;
          } else {
            alert(data.error || 'ログインリンクが無効です');
          }
        } catch {}
        setAuthStep('idle');
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


  // 2. Googleログインボタンの初期化と描画
  useEffect(() => {
    let initTimer: NodeJS.Timeout;
    let cancelled = false;

    const setupGoogle = () => {
      if (cancelled) return;
      if (typeof window === 'undefined' || !(window as any).google) {
        initTimer = setTimeout(setupGoogle, 200);
        return;
      }

      const btnEl = document.getElementById('google-login-btn');
      if (!btnEl) {
        initTimer = setTimeout(setupGoogle, 200);
        return;
      }

      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '139254600214-fun6ds9iulrllq9uvkj7q8menvecqr35.apps.googleusercontent.com';
      try {
        const stateObj = {
          is_official: isOfficial,
          calendar_name: calendarName.trim(),
          group: searchParams.get('group') || '',
        };
        const stateStr = encodeURIComponent(JSON.stringify(stateObj));

        (window as any).google.accounts.id.initialize({
          client_id: clientId,
          auto_select: false,
          cancel_on_tap_outside: true,
          ux_mode: 'redirect',
          login_uri: `${window.location.origin}/api/auth/google`,
          state: stateStr,
        });

        btnEl.innerHTML = '';
        (window as any).google.accounts.id.renderButton(btnEl, {
          theme: 'filled_blue',
          size: 'large',
          width: 320,
          shape: 'pill',
          text: 'continue_with',
          locale: 'ja',
        });
      } catch (e) {
        console.error('Google init error:', e);
      }
    };

    setupGoogle();

    return () => {
      cancelled = true;
      if (initTimer) clearTimeout(initTimer);
    };
  }, [isAuthChecking, authStep, router, searchParams, isOfficial, calendarName]);

  async function handleSendMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = fd.get('email') as string;
    const name = fd.get('name') as string;

    if (isOfficial && !calendarName.trim()) {
      alert('公式カレンダーとして登録する場合はカレンダー名を入力してください');
      setLoading(false);
      return;
    }

    const body: Record<string, unknown> = { email, name };
    if (isOfficial && calendarName.trim()) {
      body.is_official = true;
      body.calendar_name = calendarName.trim();
    }

    try {
      const res = await fetch('/api/auth/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setAuthEmail(email);
        setAuthStep('sent');
      } else {
        const data = await res.json() as { error?: string };
        alert(data.error || 'エラーが発生しました');
      }
    } catch {
      alert('エラーが発生しました');
    }
    setLoading(false);
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
        {authStep === 'logging_in' ? (
          <div className="py-12 flex flex-col items-center gap-4">
            <Loader2 className="animate-spin h-10 w-10 text-[#6366f1]" />
            <h2 className="text-lg font-black text-[#222222]">ログイン中...</h2>
          </div>
        ) : authStep === 'sent' ? (
          <div className="text-center space-y-4 py-8">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto">
              <span className="text-3xl">📧</span>
            </div>
            <h2 className="text-xl font-black text-[#222222]">メールを確認してください</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              <span className="font-bold text-[#222222]">{authEmail}</span> にログインリンクを送りました。<br />
              メール内のボタンをクリックするとログインできます。
            </p>
            <p className="text-xs text-gray-400 mt-4">リンクは15分間有効です</p>
            <button
              onClick={() => { setAuthStep('idle'); setAuthEmail(''); }}
              className="text-sm font-bold text-[#6366f1] hover:underline mt-4"
            >
              別のメールアドレスで試す
            </button>
          </div>
        ) : (
          <div className="space-y-4">
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
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto text-white shadow-lg mb-3"
                style={{ background: 'linear-gradient(135deg, #EA4335, #FBBC05, #34A853, #4285F4)' }}
              >
                <Calendar className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-[#222222] tracking-tight">Oshi-Link をはじめる</h2>
              <p className="text-xs text-gray-500 mt-1">
                推しの予定を、これひとつで。
              </p>
              <p className="text-[8px] text-gray-200 mt-1 text-center">v1.0.11-typeerror-and-schema-fix</p>
            </div>

            <div className="flex flex-col gap-3">
              {/* 公式カレンダー登録オプション */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 space-y-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    id="is-official-checkbox"
                    type="checkbox"
                    checked={isOfficial}
                    onChange={(e) => {
                      setIsOfficial(e.target.checked);
                      if (!e.target.checked) setCalendarName('');
                    }}
                    className="mt-0.5 w-3.5 h-3.5 accent-[#6366f1] rounded shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#6366f1]" />
                      <span className="text-[11px] font-black text-[#222222]">公式カレンダーとして登録する</span>
                    </div>
                  </div>
                </label>
                {isOfficial && (
                  <div className="pl-5">
                    <input
                      id="calendar-name-input"
                      type="text"
                      placeholder="カレンダー名 (例：〇〇 公式)"
                      value={calendarName}
                      onChange={(e) => setCalendarName(e.target.value)}
                      maxLength={50}
                      className="w-full h-9 bg-white border border-indigo-100 rounded-lg px-3 focus:ring-2 focus:ring-[#6366f1] outline-none font-bold text-[#222222] text-xs"
                    />
                  </div>
                )}
              </div>

              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setLoginTab('google')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${loginTab === 'google' ? 'bg-white text-[#222222] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Googleで続ける
                </button>
                <button
                  type="button"
                  onClick={() => setLoginTab('email')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${loginTab === 'email' ? 'bg-white text-[#222222] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  メールで続ける
                </button>
              </div>

              <div className="min-h-[180px] relative">
                <div className={`transition-opacity duration-300 ${loginTab === 'google' ? 'opacity-100 relative z-10' : 'opacity-0 pointer-events-none absolute inset-0'}`}>
                  <div className="flex flex-col justify-center items-center h-full pt-6">
                    <div id="google-login-btn" className="flex justify-center h-11 w-full"></div>
                    <p className="text-center text-[10px] text-gray-400 mt-4">
                      Googleアカウントで安全にログインできます
                    </p>
                  </div>
                </div>

                <div className={`transition-opacity duration-300 ${loginTab === 'email' ? 'opacity-100 relative z-10' : 'opacity-0 pointer-events-none absolute inset-0'}`}>
                  <form onSubmit={handleSendMagicLink} className="space-y-3 pt-2">
                    <div>
                      <input name="name" type="text" placeholder="お名前（初回のみ）" className="w-full h-11 bg-gray-50 border-none rounded-xl px-4 focus:ring-2 focus:ring-[#6366f1] outline-none font-bold text-[#222222] text-sm" />
                    </div>
                    <div>
                      <input name="email" type="email" placeholder="メールアドレス *" className="w-full h-11 bg-gray-50 border-none rounded-xl px-4 focus:ring-2 focus:ring-[#6366f1] outline-none font-bold text-[#222222] text-sm" required />
                    </div>
                    <button 
                      type="submit" 
                      disabled={loading} 
                      className="w-full h-12 text-white font-black rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg text-sm mt-2"
                      style={{ background: 'linear-gradient(135deg, #EA4335, #FBBC05, #34A853, #4285F4)' }}
                    >
                      {loading ? <Loader2 className="animate-spin h-4 w-4 mx-auto" /> : 'ログインリンクを送る 📧'}
                    </button>
                  </form>
                  <p className="text-center text-[10px] text-gray-400 mt-3">
                    アカウントがない場合は自動で作成されます
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full bg-[#f2f2f2] items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-[#6366f1]" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
