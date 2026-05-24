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
  const isOfficialRef = React.useRef(false);
  const calendarNameRef = React.useRef('');

  // refをstateと同期（Googleコールバックのクロージャから最新値を参照するため）
  React.useEffect(() => { isOfficialRef.current = isOfficial; }, [isOfficial]);
  React.useEffect(() => { calendarNameRef.current = calendarName; }, [calendarName]);

  // 1. セッションが既にあるか、URLトークンがあるかチェック
  useEffect(() => {
    setMounted(true);
    async function checkAuth() {
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


  // 2. Googleスクリプトの動的読み込み
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
        if (!window.__gsiInitialized) {
          (window as any).google.accounts.id.initialize({
            client_id: clientId,
            auto_select: false,
            cancel_on_tap_outside: true,
            callback: async (response: any) => {
              setAuthStep('logging_in');
              try {
                const body: Record<string, unknown> = { credential: response.credential };
                if (isOfficialRef.current && calendarNameRef.current.trim()) {
                  body.is_official = true;
                  body.calendar_name = calendarNameRef.current.trim();
                }
                const res = await fetch('/api/auth/google', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body),
                });
                const data = await res.json() as any;
                if (res.ok && data.ok && data.sessionToken && data.user) {
                  localStorage.setItem('oshi_session', data.sessionToken);
                  const group = searchParams.get('group');
                  router.push(group ? `/?group=${group}` : '/');
                } else {
                  alert('ログイン処理に失敗しました: ' + (data.error || '不明エラー'));
                  setAuthStep('idle');
                }
              } catch (err: any) {
                alert('通信エラー: ' + err.message);
                setAuthStep('idle');
              }
            },
          });
          window.__gsiInitialized = true;
        }

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
  }, [isAuthChecking, authStep, router, searchParams]);

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
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full animate-in fade-in zoom-in-95 duration-500">
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
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center mb-4">
                <div className="flex items-center justify-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100/50">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                  </span>
                  Beta Test in Progress
                </div>
              </div>
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto text-white shadow-lg mb-4"
                style={{ background: 'linear-gradient(135deg, #EA4335, #FBBC05, #34A853, #4285F4)' }}
              >
                <Calendar className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-black text-[#222222] tracking-tight">Oshi-Link をはじめる</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                推しの予定を、これひとつで。
              </p>

              {/* サービス説明セクション */}
              <div className="space-y-3 pt-2">
                <p className="text-[10px] font-black text-[#6366f1] uppercase tracking-widest text-center">Service Features</p>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { 
                      icon: <Users className="w-5 h-5" />, 
                      title: "コミュニティ管理", 
                      desc: "ファン同士で情報を更新。最新の予定がいつでも分かります。" 
                    },
                    { 
                      icon: <Bell className="w-5 h-5" />, 
                      title: "通知でリマインド", 
                      desc: "イベント開始前に通知。配信やチケット予約を逃しません。" 
                    },
                    { 
                      icon: <Calendar className="w-5 h-5" />, 
                      title: "情報の正確性", 
                      desc: "不正確な情報はみんなで指摘。精度の高い情報を維持します。" 
                    },
                  ].map((f, i) => (
                    <div 
                      key={i} 
                      className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100/50"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#6366f1] shadow-sm shrink-0">
                        {f.icon}
                      </div>
                      <div className="text-left">
                        <h3 className="text-xs font-black text-[#222222]">{f.title}</h3>
                        <p className="text-[10px] text-gray-400 font-medium leading-normal mt-0.5">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <p className="text-[11px] text-gray-400 font-bold text-center">
                  Googleアカウントで 1秒で登録・ログイン。<br />
                  面倒なパスワード設定は不要です。
                </p>
                <p className="text-[8px] text-gray-200 mt-2 text-center">v1.0.3-refreshed</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {/* 公式カレンダー登録オプション */}
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    id="is-official-checkbox"
                    type="checkbox"
                    checked={isOfficial}
                    onChange={(e) => {
                      setIsOfficial(e.target.checked);
                      if (!e.target.checked) setCalendarName('');
                    }}
                    className="mt-0.5 w-4 h-4 accent-[#6366f1] rounded shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#6366f1]" />
                      <span className="text-xs font-black text-[#222222]">公式カレンダーとして登録する</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">アーティストや団体の公式情報発信アカウントとして登録します。登録時にカレンダーを1つ作成します。</p>
                  </div>
                </label>
                {isOfficial && (
                  <div className="space-y-1.5 pl-7">
                    <label className="text-[10px] font-black text-[#6366f1] uppercase tracking-[0.1em]">カレンダー名 <span className="text-red-500">*</span></label>
                    <input
                      id="calendar-name-input"
                      type="text"
                      placeholder="例：〇〇 公式スケジュール"
                      value={calendarName}
                      onChange={(e) => setCalendarName(e.target.value)}
                      maxLength={50}
                      className="w-full h-11 bg-white border border-indigo-100 rounded-xl px-4 focus:ring-2 focus:ring-[#6366f1] outline-none font-bold text-[#222222] text-sm"
                    />
                  </div>
                )}
              </div>

              <div id="google-login-btn" className="flex justify-center h-11"></div>

              <div className="flex items-center gap-4 py-2">
                <div className="h-[1px] bg-gray-100 flex-1"></div>
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">または</span>
                <div className="h-[1px] bg-gray-100 flex-1"></div>
              </div>

              <form onSubmit={handleSendMagicLink} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">お名前（初回のみ）</label>
                  <input name="name" type="text" placeholder="推しファン太郎" className="w-full h-12 bg-gray-50 border-none rounded-xl px-4 focus:ring-2 focus:ring-[#6366f1] outline-none font-bold text-[#222222]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">メールアドレス <span className="text-red-500">*</span></label>
                  <input name="email" type="email" placeholder="hello@example.com" className="w-full h-12 bg-gray-50 border-none rounded-xl px-4 focus:ring-2 focus:ring-[#6366f1] outline-none font-bold text-[#222222]" required />
                </div>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full h-14 text-white font-black rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg text-base"
                  style={{ background: 'linear-gradient(135deg, #EA4335, #FBBC05, #34A853, #4285F4)' }}
                >
                  {loading ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : 'ログインリンクを送る 📧'}
                </button>
              </form>
              <p className="text-center text-[11px] text-gray-400 mt-2">
                アカウントがない場合は自動で作成されます
              </p>
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
