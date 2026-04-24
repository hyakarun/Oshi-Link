'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, MapPin, Plus, ShieldCheck, AlertCircle, UserCircle, Loader2, Star, Users, Search, Bell, X, Check, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  parseISO,
} from 'date-fns';

type Group = {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  event_count?: number;
  follower_count?: number;
  is_following?: boolean;
};
type Event = {
  id: string;
  group_id: string;
  title: string;
  date: string;
  end_time?: string;
  location?: string;
  description?: string;
  image_url?: string;
  source_url?: string;
  verified?: boolean;
  disputed?: boolean;
};
type User = { id: string; name: string; email: string };
type View = 'month' | 'week' | 'day';

const FALLBACK_IMG = 'https:\u002f\u002fimages.unsplash.com\u002fphoto-1540039155732-d67414bc5c4a?w=800&q=80';

const GROUP_COLORS = [
  'from-[#ff385c] to-[#e00b41]',
  'from-purple-500 to-purple-700',
  'from-blue-500 to-blue-700',
  'from-emerald-500 to-emerald-700',
  'from-orange-500 to-orange-700',
  'from-pink-500 to-pink-700',
  'from-cyan-500 to-cyan-700',
];

function groupColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length];
}

function GroupAvatar({ group, size = 'md' }: { group: Group; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-14 h-14 text-lg' : 'w-10 h-10 text-sm';
  if (group.avatar_url) {
    return <img src={group.avatar_url} alt={group.name} className={`${sizeClass} rounded-xl object-cover`} />;
  }
  return (
    <div className={`${sizeClass} rounded-xl bg-gradient-to-br ${groupColor(group.id)} flex items-center justify-center text-white font-black shrink-0`}>
      {group.name[0]}
    </div>
  );
}

export default function App() {
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [followedGroups, setFollowedGroups] = useState<Group[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string>('0');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isDiscoverOpen, setIsDiscoverOpen] = useState(false);

  // Magic Link 認証の状態
  const [authStep, setAuthStep] = useState<'idle' | 'sent' | 'logging_in'>('idle');
  const [authEmail, setAuthEmail] = useState('');

  const [discoverSearch, setDiscoverSearch] = useState('');
  const [followLoading, setFollowLoading] = useState<string | null>(null);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<View>('month');

  // セッション認証ヘルパー
  function authHeaders(): Record<string, string> {
    const token = sessionToken || (typeof window !== 'undefined' ? localStorage.getItem('oshi_session') : null);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  // 初期ロード: URLトークン or ローカルセッションを確認
  useEffect(() => {
    setMounted(true);
    async function init() {
      // 1. URLに ?token=xxx があればMagic Link認証
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');
      if (urlToken) {
        setAuthStep('logging_in');
        try {
          const res = await fetch(`/api/auth/verify?token=${urlToken}`);
          const data = await res.json() as { ok?: boolean; sessionToken?: string; user?: User; error?: string };
          if (data.ok && data.sessionToken && data.user) {
            localStorage.setItem('oshi_session', data.sessionToken);
            setSessionToken(data.sessionToken);
            setUser(data.user);
            // URLからtokenを消す
            window.history.replaceState({}, '', window.location.pathname);
          } else {
            alert(data.error || 'ログインリンクが無効です');
          }
        } catch {}
        setAuthStep('idle');
        return;
      }

      // 2. 保存済みセッションがあれば検証
      const saved = localStorage.getItem('oshi_session');
      if (saved) {
        setSessionToken(saved);
        try {
          const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${saved}` },
          });
          if (res.ok) {
            const data = await res.json() as { user?: User };
            if (data.user) setUser(data.user);
          } else {
            // セッション期限切れ
            localStorage.removeItem('oshi_session');
            setSessionToken(null);
          }
        } catch {}
      }
    }
    init();
  }, []);

  const loadGroups = useCallback(async (userId?: string) => {
    try {
      const uid = userId || user?.id || '';
      const url = uid ? `\u002fapi\u002fgroups?user_id=${uid}` : '\u002fapi\u002fgroups';
      const res = await fetch(url);
      const data = await res.json() as { groups?: Group[] };
      const groups = data.groups || [];
      setAllGroups(groups);
      setFollowedGroups(groups.filter(g => g.is_following));
    } catch {}
  }, [user?.id]);

  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch('\u002fapi\u002fevents');
      const data = await res.json() as { events?: Event[] };
      setEvents(data.events || []);
    } catch {}
  }, []);

  useEffect(() => {
    loadGroups();
    loadEvents();
  }, [loadGroups, loadEvents]);

  // フォロー/アンフォロー
  async function handleFollowToggle(group: Group) {
    if (!user) { setIsProfileModalOpen(true); return; }
    setFollowLoading(group.id);
    try {
      await fetch('\u002fapi\u002fgroups\u002ffollow', {
        method: 'POST',
        headers: { 'Content-Type': 'application\u002fjson' },
        body: JSON.stringify({ user_id: user.id, group_id: group.id }),
      });
      await loadGroups(user.id);
    } catch {}
    setFollowLoading(null);
  }

  async function handleAddEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) { setIsProfileModalOpen(true); return; }
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const dateVal = fd.get('date') as string;
    const startTime = fd.get('startTime') as string;
    const endTime = fd.get('endTime') as string;
    const dateStr = startTime ? `${dateVal}T${startTime}:00` : `${dateVal}T00:00:00`;
    const endStr = endTime ? `${dateVal}T${endTime}:00` : undefined;
    const body = {
      group_id: activeGroupId === '0' ? (followedGroups[0]?.id || allGroups[0]?.id || '1') : activeGroupId,
      title: fd.get('title'),
      date: dateStr,
      end_time: endStr,
      location: fd.get('location'),
      description: fd.get('description'),
      source_url: fd.get('source_url'),
      image_url: fd.get('image_url'),
      user_id: user.id,
    };
    try {
      await fetch('\u002fapi\u002fevents', { method: 'POST', headers: { 'Content-Type': 'application\u002fjson' }, body: JSON.stringify(body) });
      await loadEvents();
      setIsAddModalOpen(false);
      (e.target as HTMLFormElement).reset();
    } catch { alert('登録に失敗しました'); }
    setLoading(false);
  }

  async function handleUpdateEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedEvent) return;
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = { id: selectedEvent.id, title: fd.get('title'), description: fd.get('description') };
    try {
      await fetch('\u002fapi\u002fevents', { method: 'PUT', headers: { 'Content-Type': 'application\u002fjson' }, body: JSON.stringify(body) });
      await loadEvents();
      setIsEditing(false);
      setSelectedEvent(null);
    } catch { alert('更新に失敗しました'); }
    setLoading(false);
  }

  // Magic Link を送信
  async function handleSendMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = fd.get('email') as string;
    const name = fd.get('name') as string;
    setAuthEmail(email);
    try {
      const res = await fetch('/api/auth/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; devUrl?: string };
      if (data.ok) {
        setAuthStep('sent');
        // 開発環境: devUrlがあれば自動で遷移（本番では不要）
        if (data.devUrl) {
          console.log('[DEV] クリックしてログイン:', data.devUrl);
        }
      } else {
        alert(data.error || '送信に失敗しました');
      }
    } catch { alert('送信に失敗しました'); }
    setLoading(false);
  }

  // ログアウト
  async function handleLogout() {
    const token = sessionToken || localStorage.getItem('oshi_session');
    if (token) {
      await fetch('/api/auth/me', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem('oshi_session');
    setSessionToken(null);
    setUser(null);
    setFollowedGroups([]);
    setAuthStep('idle');
    setIsProfileModalOpen(false);
    await loadGroups();
  }

  // プロフィール更新（ログイン済みユーザーの名前変更のみ）
  async function handleProfileUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = { id: user.id, name: fd.get('name'), email: user.email };
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json() as { user?: User };
      if (data.user) {
        setUser(data.user);
        setIsProfileModalOpen(false);
      }
    } catch {}
    setLoading(false);
  }

  async function handleCreateGroup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) { setIsProfileModalOpen(true); return; }
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = { name: fd.get('name'), description: fd.get('description'), created_by: user.id };
    try {
      await fetch('\u002fapi\u002fgroups', { method: 'POST', headers: { 'Content-Type': 'application\u002fjson' }, body: JSON.stringify(body) });
      await loadGroups(user.id);
      setIsGroupModalOpen(false);
      (e.target as HTMLFormElement).reset();
    } catch { alert('作成に失敗しました'); }
    setLoading(false);
  }

  async function handleVerify(verdict: 'confirmed' | 'disputed') {
    if (!user || !selectedEvent) { setIsProfileModalOpen(true); return; }
    setLoading(true);
    const body = { event_id: selectedEvent.id, user_id: user.id, verdict };
    try {
      await fetch('\u002fapi\u002fevents\u002fverify', { method: 'POST', headers: { 'Content-Type': 'application\u002fjson' }, body: JSON.stringify(body) });
      await loadEvents();
    } catch {}
    setLoading(false);
  }

  function handleSubscribe(groupId: string) {
    const base = window.location.origin;
    const url = base + '\u002fapi\u002fgroups\u002fexport?id=' + groupId;
    const webcal = url.replace('https:', 'webcal:').replace('http:', 'webcal:');
    window.location.href = webcal;
  }

  const filteredEvents = events.filter(e =>
    activeGroupId === '0' || e.group_id === activeGroupId
  );

  const discoverFiltered = allGroups.filter(g =>
    g.name.toLowerCase().includes(discoverSearch.toLowerCase()) ||
    (g.description || '').toLowerCase().includes(discoverSearch.toLowerCase())
  );

  const sidebarGroups = followedGroups.length > 0 ? followedGroups : allGroups.slice(0, 5);

  const renderHeader = () => {
    let title = '';
    if (view === 'month') title = format(currentMonth, 'yyyy年 M月');
    else if (view === 'week') {
      const ws = startOfWeek(currentMonth);
      const we = endOfWeek(currentMonth);
      title = `${format(ws, 'M月d日')} - ${format(we, 'M月d日')}`;
    } else {
      title = format(currentMonth, 'yyyy年 M月 d日');
    }

    return (
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4 px-2">
        <div className="flex flex-col">
          <h2 className="text-[32px] font-extrabold tracking-tight text-[#222222]">{title}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-[#ff385c] animate-pulse" />
            <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">{view} schedule</p>
          </div>
        </div>
        <div className="flex items-center bg-[#f7f7f7] p-1.5 rounded-[20px] border border-gray-100">
          {(['month', 'week', 'day'] as View[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-5 py-2 text-xs font-extrabold rounded-[14px] transition-all duration-300 ${view === v ? 'bg-white shadow-md text-[#222222]' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {v.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex items-center bg-white border border-gray-200 rounded-full p-1 shadow-sm">
          <Button variant="ghost" className="rounded-full w-9 h-9 p-0 hover:bg-gray-100" onClick={() => {
            if (view === 'month') setCurrentMonth(subMonths(currentMonth, 1));
            else if (view === 'week') setCurrentMonth(addDays(currentMonth, -7));
            else setCurrentMonth(addDays(currentMonth, -1));
          }}>
            <ChevronRight className="h-4 w-4 rotate-180" />
          </Button>
          <Button variant="ghost" className="rounded-full px-4 h-9 font-extrabold text-[13px] hover:bg-gray-100" onClick={() => setCurrentMonth(new Date())}>
            TODAY
          </Button>
          <Button variant="ghost" className="rounded-full w-9 h-9 p-0 hover:bg-gray-100" onClick={() => {
            if (view === 'month') setCurrentMonth(addMonths(currentMonth, 1));
            else if (view === 'week') setCurrentMonth(addDays(currentMonth, 7));
            else setCurrentMonth(addDays(currentMonth, 1));
          }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return (
      <div className="grid grid-cols-7 mb-2 border-b border-gray-100 pb-2">
        {days.map((day, i) => (
          <div key={i} className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest leading-loose">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);

    if (view === 'day') {
      const dayEvents = filteredEvents.filter(e => isSameDay(parseISO(e.date), currentMonth));
      return (
        <div className="flex bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-xl animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="w-20 border-r border-gray-50 bg-gray-50 flex flex-col pt-16">
            {hours.map(h => (
              <div key={h} className="h-20 text-[10px] font-bold text-gray-400 text-right pr-4 pt-1">
                {h}:00
              </div>
            ))}
          </div>
          <div className="flex-1 flex flex-col relative pt-16 min-h-[1920px]">
            <div className="absolute top-0 left-0 right-0 h-16 border-b border-gray-50 flex items-center px-8 bg-white backdrop-blur-sm z-10">
              <span className="text-sm font-black text-[#222222] uppercase tracking-widest">{format(currentMonth, 'eeee, MMM d')}</span>
            </div>
            {hours.map(h => (
              <div key={h} className="h-20 border-b border-gray-50 relative">
                {dayEvents.map((e, idx) => {
                  const startHour = 10 + (idx * 2);
                  if (h === startHour) return (
                    <div
                      key={idx}
                      onClick={() => setSelectedEvent(e)}
                      className="absolute inset-x-4 top-2 bottom-2 bg-gradient-to-br from-[#ff385c] to-[#e00b41] text-white p-4 rounded-3xl shadow-lg hover:scale-[1.02] transition-all cursor-pointer z-20"
                    >
                      <h4 className="text-lg font-bold leading-tight">{e.title}</h4>
                    </div>
                  );
                  return null;
                })}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (view === 'week') {
      const startDate = startOfWeek(currentMonth);
      return (
        <div className="flex bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-xl animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="w-16 border-r border-gray-50 bg-gray-50 flex flex-col pt-20">
            {hours.map(h => (
              <div key={h} className="h-32 text-[9px] font-black text-gray-300 text-center pt-1">
                {h}:00
              </div>
            ))}
          </div>
          <div className="flex flex-1">
            {Array.from({ length: 7 }).map((_, i) => {
              const d = addDays(startDate, i);
              const dayEvents = filteredEvents.filter(e => isSameDay(parseISO(e.date), d));
              return (
                <div key={i} className={`flex-1 border-r border-gray-50 relative pt-20 min-h-[3072px] ${isSameDay(d, new Date()) ? 'bg-red-50' : ''}`}>
                  <div className="absolute top-0 left-0 right-0 h-20 border-b border-gray-50 flex flex-col items-center justify-center bg-white backdrop-blur-sm z-10">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{format(d, 'eee')}</p>
                    <p className={`text-xl font-black ${isSameDay(d, new Date()) ? 'text-[#ff385c]' : 'text-[#222222]'}`}>{format(d, 'd')}</p>
                  </div>
                  {hours.map(h => (
                    <div key={h} className="h-32 border-b border-gray-50 relative">
                      {dayEvents.map((e, idx) => {
                        const startHour = 10 + (idx * 3);
                        if (h === startHour) return (
                          <div
                            key={idx}
                            onClick={() => setSelectedEvent(e)}
                            className="absolute inset-x-2 top-2 bottom-2 bg-white border-l-4 border-[#ff385c] shadow-lg rounded-xl p-3 hover:scale-[1.05] transition-all cursor-pointer z-20"
                          >
                            <h5 className="text-[11px] font-black text-[#222222] line-clamp-2">{e.title}</h5>
                          </div>
                        );
                        return null;
                      })}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const rows: React.JSX.Element[] = [];
    let days: React.JSX.Element[] = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const dayEvents = filteredEvents.filter(e => isSameDay(parseISO(e.date), cloneDay));
        days.push(
          <div
            key={day.toString()}
            className={`min-h-[120px] p-2 border-r border-b border-gray-50 transition-colors hover:bg-gray-50 relative ${!isSameMonth(day, monthStart) ? 'bg-gray-50 opacity-50' : ''} ${isSameDay(day, new Date()) ? 'bg-red-50' : ''}`}
          >
            <span className={`text-xs font-black absolute top-3 right-3 flex items-center justify-center ${isSameDay(day, new Date()) ? 'bg-[#ff385c] text-white w-7 h-7 rounded-full shadow-lg' : 'text-gray-400'}`}>
              {format(day, 'd')}
            </span>
            <div className="space-y-1 mt-6">
              {dayEvents.slice(0, 3).map((e, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedEvent(e)}
                  className="text-[11px] bg-white border border-gray-100 shadow-sm rounded-md px-2 py-1 truncate cursor-pointer hover:border-[#ff385c] hover:shadow-md transition-all font-medium text-[#222222]"
                >
                  {e.title}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <p className="text-[10px] text-gray-400 pl-1">他 {dayEvents.length - 3} 件...</p>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(<div className="grid grid-cols-7" key={day.toString()}>{days}</div>);
      days = [];
    }
    return <div className="border-t border-l border-gray-100 rounded-xl overflow-hidden shadow-xl animate-in fade-in duration-500">{rows}</div>;
  };

  return (
    <div className="flex h-screen w-full bg-[#f2f2f2]" suppressHydrationWarning>

      {/* Left Sidebar - Following Calendars */}
      <aside className="w-[260px] bg-white border-r border-gray-100 h-full flex flex-col flex-shrink-0">

        {/* App Logo + User */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 bg-[#ff385c] rounded-xl flex items-center justify-center text-white shrink-0 shadow-md">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-[#222222] tracking-tight">Oshi-Link</p>
            <p className="text-[10px] text-gray-400 font-medium truncate">
              {user ? user.name : 'ログインしていません'}
            </p>
          </div>
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all shrink-0"
          >
            {user ? (
              <span className="text-[11px] font-black text-gray-700">{user.name[0]}</span>
            ) : (
              <UserCircle className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* ALL toggle */}
        <div className="px-3 pt-3">
          <button
            onClick={() => setActiveGroupId('0')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-bold text-sm ${
              activeGroupId === '0'
                ? 'bg-[#fff0f3] text-[#ff385c]'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              activeGroupId === '0' ? 'bg-[#ff385c] text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              <Star className="w-3.5 h-3.5" />
            </div>
            全ての予定
          </button>
        </div>

        {/* Section label */}
        <div className="px-5 pt-4 pb-1 flex items-center justify-between">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">追っているカレンダー</p>
          <button
            onClick={() => setIsDiscoverOpen(true)}
            className="text-[10px] font-bold text-[#ff385c] hover:underline flex items-center gap-0.5"
          >
            <Search className="w-2.5 h-2.5" /> 探す
          </button>
        </div>

        {/* Followed groups list */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {followedGroups.length === 0 ? (
            <div className="p-5 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-xs font-bold text-gray-400 mb-1">フォロー中なし</p>
              <p className="text-[10px] text-gray-300 mb-3 leading-relaxed">推しグループのカレンダーをフォローしよう</p>
              <Button
                onClick={() => setIsDiscoverOpen(true)}
                className="bg-[#ff385c] text-white rounded-xl h-8 px-3 text-xs font-bold"
              >
                カレンダーを探す
              </Button>
            </div>
          ) : (
            <div className="space-y-0.5">
              {followedGroups.map(g => {
                const groupEvents = events.filter(e => e.group_id === g.id);
                const nextEvent = groupEvents
                  .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
                  .find(e => parseISO(e.date) >= new Date());
                const isActive = activeGroupId === g.id;
                return (
                  <div
                    key={g.id}
                    onClick={() => setActiveGroupId(g.id)}
                    className={`p-2.5 rounded-xl cursor-pointer transition-all group ${
                      isActive ? 'bg-[#fff0f3]' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <GroupAvatar group={g} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className={`text-[12px] font-black truncate ${
                          isActive ? 'text-[#ff385c]' : 'text-[#222222]'
                        }`}>{g.name}</p>
                        <p className="text-[10px] text-gray-400">
                          {g.event_count || 0}件 · {g.follower_count || 0}人
                        </p>
                      </div>
                      <button
                        onClick={(ev) => { ev.stopPropagation(); handleSubscribe(g.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-gray-100 shrink-0"
                        title="iCalに追加"
                      >
                        <Bell className="w-3 h-3 text-gray-400" />
                      </button>
                    </div>
                    {nextEvent && (
                      <div className="mt-1.5 ml-10 pl-2 border-l-2 border-[#ff385c] border-opacity-30">
                        <p className="text-[9px] text-gray-500 font-bold truncate">{nextEvent.title}</p>
                        <p className="text-[9px] text-gray-400">{format(parseISO(nextEvent.date), 'MM月dd日 HH:mm')}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add calendar button */}
          <div className="mt-2">
            <button
              onClick={() => setIsDiscoverOpen(true)}
              className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-[11px] font-bold text-gray-400 hover:text-[#ff385c] hover:border-[#ff385c] transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3 h-3" /> カレンダーを追加
            </button>
          </div>
        </div>

        {/* Bottom actions */}
        <div className="px-3 py-3 border-t border-gray-100 flex gap-2">
          <button
            onClick={() => setIsGroupModalOpen(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-[#ff385c] transition-all text-[11px] font-bold"
          >
            <Plus className="w-3.5 h-3.5" /> 新規作成
          </button>
          <button
            onClick={() => setIsDiscoverOpen(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#fff0f3] text-[#ff385c] hover:bg-[#ffe0e6] transition-all text-[11px] font-bold"
          >
            <Search className="w-3.5 h-3.5" /> 探す
          </button>
        </div>

      </aside>

      {/* Main Content */}
      <div className="flex-1 flex h-full overflow-hidden">

        {/* Calendar Area */}
        <div className="flex-1 flex flex-col bg-white md:rounded-l-[32px] overflow-hidden shadow-2xl">
          <header className="h-20 border-b flex items-center justify-between px-8 bg-white backdrop-blur-md sticky top-0 z-10 shrink-0">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#222222]">Oshi-Link</h1>
              <p className="text-[12px] font-medium text-gray-500 uppercase tracking-widest">
                {allGroups.find(g => g.id === activeGroupId)?.name || (activeGroupId === '0' ? '全ての予定' : '')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogTrigger render={
                  <Button className="bg-[#ff385c] hover:bg-[#e00b41] text-white rounded-xl h-10 px-6 font-bold shadow-md active:scale-95 transition-all">
                    <Plus className="mr-2 h-4 w-4" /> 予定を追加
                  </Button>
                } />
                <DialogContent className="sm:max-w-[500px] bg-white border-none rounded-[32px] shadow-2xl p-0 overflow-hidden">
                  <div className="bg-gray-50 p-8 border-b border-gray-100">
                    <DialogTitle className="text-2xl font-black text-[#222222] tracking-tight">予定を登録</DialogTitle>
                    <DialogDescription className="text-gray-500 font-medium mt-1">推しの出演情報などをコミュニティで共有しましょう。</DialogDescription>
                  </div>
                  <form onSubmit={handleAddEvent} className="p-8 space-y-4 bg-white">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">イベント名 <span className="text-red-500">*</span></label>
                      <input name="title" className="w-full h-12 bg-gray-50 border-none rounded-xl px-4 focus:ring-2 focus:ring-[#ff385c] outline-none font-bold text-[#222222]" placeholder="LIVE TOUR 2026" required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">年月日 <span className="text-red-500">*</span></label>
                      <input name="date" type="date" max="9999-12-31" className="w-full h-12 bg-gray-50 border-none rounded-xl px-4 focus:ring-2 focus:ring-[#ff385c] outline-none font-bold text-[#222222]" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">開始時刻</label>
                        <input name="startTime" type="time" className="w-full h-12 bg-gray-50 border-none rounded-xl px-4 focus:ring-2 focus:ring-[#ff385c] outline-none font-bold text-[#222222]" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">終了時刻</label>
                        <input name="endTime" type="time" className="w-full h-12 bg-gray-50 border-none rounded-xl px-4 focus:ring-2 focus:ring-[#ff385c] outline-none font-bold text-[#222222]" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">場所</label>
                      <input name="location" className="w-full h-12 bg-gray-50 border-none rounded-xl px-4 focus:ring-2 focus:ring-[#ff385c] outline-none font-bold text-[#222222]" placeholder="会場名" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">説明・備考</label>
                      <textarea name="description" className="w-full h-20 bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-[#ff385c] outline-none resize-none font-medium text-[#222222]" placeholder="チケット情報など..." />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">ソースURL <span className="text-red-500">*</span></label>
                      <input name="source_url" className="w-full h-12 bg-gray-50 border-none rounded-xl px-4 focus:ring-2 focus:ring-[#ff385c] outline-none font-bold text-[#222222]" placeholder="公式Twitterの告知URLなど" required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">画像URL</label>
                      <input name="image_url" className="w-full h-12 bg-gray-50 border-none rounded-xl px-4 focus:ring-2 focus:ring-[#ff385c] outline-none font-bold text-[#222222]" placeholder="イベント画像のURL" />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full bg-[#ff385c] hover:bg-[#e00b41] text-white h-14 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all">
                      {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : '登録する'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-white">
            <div className="max-w-5xl mx-auto">
              {mounted ? (
                <>
                  {renderHeader()}
                  {view === 'month' && renderDays()}
                  {renderCells()}
                </>
              ) : (
                <div className="flex items-center justify-center p-20">
                  <Loader2 className="animate-spin h-10 w-10 text-gray-300" />
                </div>
              )}
            </div>
          </main>
        </div>


      </div>

      {/* Discover Calendars Modal */}
      <Dialog open={isDiscoverOpen} onOpenChange={setIsDiscoverOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-none rounded-[32px] bg-white shadow-2xl">
          <div className="p-8 border-b border-gray-100">
            <DialogTitle className="text-2xl font-black text-[#222222] tracking-tight mb-1">カレンダーを探す</DialogTitle>
            <DialogDescription className="text-gray-500 text-sm">
              推しのグループカレンダーをフォローして、予定を見逃さないようにしよう
            </DialogDescription>
            <div className="mt-4 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="グループ名で検索..."
                value={discoverSearch}
                onChange={e => setDiscoverSearch(e.target.value)}
                className="w-full h-12 bg-gray-50 rounded-xl pl-10 pr-4 outline-none border-none focus:ring-2 focus:ring-[#ff385c] font-medium text-[#222222]"
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-[480px]">
            {discoverFiltered.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-400 font-bold">見つかりませんでした</p>
                <button
                  onClick={() => { setIsDiscoverOpen(false); setIsGroupModalOpen(true); }}
                  className="mt-4 text-[#ff385c] font-bold text-sm hover:underline"
                >
                  新しくカレンダーを作成する →
                </button>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {discoverFiltered.map(g => (
                  <div
                    key={g.id}
                    className={`flex items-center gap-4 p-4 rounded-2xl transition-all border ${g.is_following ? 'bg-[#fff0f3] border-[#ff385c] border-opacity-20' : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
                  >
                    <GroupAvatar group={g} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-[#222222] truncate">{g.name}</h3>
                        {g.is_following && (
                          <Badge className="bg-[#ff385c] text-white border-none text-[9px] px-2 py-0">フォロー中</Badge>
                        )}
                      </div>
                      {g.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{g.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                          <Users className="w-3 h-3" /> {g.follower_count || 0}人
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {g.event_count || 0}件の予定
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {g.is_following && (
                        <button
                          onClick={() => handleSubscribe(g.id)}
                          className="p-2 rounded-xl hover:bg-gray-100 transition-all"
                          title="iCalに追加"
                        >
                          <Bell className="w-4 h-4 text-gray-400" />
                        </button>
                      )}
                      <Button
                        onClick={() => handleFollowToggle(g)}
                        disabled={followLoading === g.id}
                        className={`h-9 px-4 rounded-xl font-bold text-sm transition-all ${
                          g.is_following
                            ? 'bg-white border-2 border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500'
                            : 'bg-[#ff385c] text-white hover:bg-[#e00b41] shadow-md'
                        }`}
                      >
                        {followLoading === g.id ? (
                          <Loader2 className="animate-spin h-4 w-4" />
                        ) : g.is_following ? (
                          <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5" /> フォロー中</span>
                        ) : (
                          <span className="flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> フォロー</span>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <p className="text-sm text-gray-500">{discoverFiltered.length}件のカレンダー</p>
            <Button
              onClick={() => { setIsDiscoverOpen(false); setIsGroupModalOpen(true); }}
              variant="outline"
              className="rounded-xl h-9 px-4 text-sm font-bold border-gray-200"
            >
              <Plus className="w-4 h-4 mr-1" /> 新規作成
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Detail Modal */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => {
        if (!open) { setSelectedEvent(null); setIsEditing(false); }
      }}>
        <DialogContent className="sm:max-w-[640px] p-0 overflow-hidden border-none rounded-[32px] bg-white shadow-2xl ring-1 ring-gray-100">
          {selectedEvent && (
            <div className="flex flex-col bg-white">
              <div className="relative aspect-video overflow-hidden">
                <img src={selectedEvent.image_url || FALLBACK_IMG} alt={selectedEvent.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-40" />
                <Button variant="ghost" size="icon" className="absolute top-4 right-4 bg-white rounded-full hover:bg-white shadow-lg" onClick={() => setSelectedEvent(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="p-8 space-y-6">
                {!isEditing ? (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-white text-[#ff385c] border border-[#ff385c] font-bold uppercase tracking-widest text-[10px] px-3">
                          {allGroups.find(g => g.id === selectedEvent.group_id)?.name || 'EVENT'}
                        </Badge>
                        {selectedEvent.verified ? (
                          <Badge className="bg-blue-50 text-blue-600 border-none font-bold text-[10px] px-3 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> 認証済み
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-50 text-orange-600 border-none font-bold text-[10px] px-3">要検証</Badge>
                        )}
                      </div>
                      <DialogTitle className="text-3xl font-black text-[#222222] tracking-tight leading-tight">{selectedEvent.title}</DialogTitle>
                      <div className="flex items-center gap-4 text-gray-500 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-bold">{format(parseISO(selectedEvent.date), 'yyyy年MM月dd日 HH:mm')}</span>
                        </div>
                        {selectedEvent.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-bold">{selectedEvent.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedEvent.description && (
                      <p className="text-gray-600 text-sm leading-relaxed">{selectedEvent.description}</p>
                    )}
                    <div className="space-y-3 border-t border-gray-100 pt-6">
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">コミュニティ検証</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          onClick={() => handleVerify('confirmed')}
                          disabled={loading}
                          className={`rounded-2xl h-12 font-black flex items-center justify-center gap-2 active:scale-95 transition-all ${selectedEvent.verified ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-blue-600 border-2 border-blue-100 hover:bg-blue-50'}`}
                        >
                          <ShieldCheck className="w-4 h-4" /> 正確です
                        </Button>
                        <Button
                          onClick={() => handleVerify('disputed')}
                          disabled={loading}
                          className="rounded-2xl h-12 bg-white border-2 border-gray-200 text-gray-400 hover:text-orange-600 hover:border-orange-200 transition-all active:scale-95 font-black flex items-center justify-center gap-2"
                        >
                          <AlertCircle className="w-4 h-4" /> 要修正
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button onClick={() => setIsEditing(true)} className="flex-1 bg-[#222222] hover:bg-black text-white h-12 rounded-2xl font-black shadow-xl active:scale-95 transition-all">
                        内容を修正
                      </Button>
                      <Button onClick={() => handleSubscribe(selectedEvent.group_id)} variant="outline" className="flex-1 border-gray-200 h-12 rounded-2xl font-black hover:bg-gray-50 transition-all">
                        iCalに追加
                      </Button>
                    </div>
                  </>
                ) : (
                  <form onSubmit={handleUpdateEvent} className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                    <DialogTitle className="text-2xl font-black">予定を修正</DialogTitle>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">イベント名</label>
                        <input name="title" defaultValue={selectedEvent.title} className="w-full h-12 bg-gray-50 rounded-xl px-4 font-bold outline-none border-none focus:ring-2 focus:ring-[#ff385c]" required />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">詳細</label>
                        <textarea name="description" defaultValue={selectedEvent.description} className="w-full h-32 bg-gray-50 rounded-xl p-4 font-medium outline-none border-none focus:ring-2 focus:ring-[#ff385c] resize-none" />
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <Button type="submit" className="flex-1 bg-[#ff385c] text-white h-12 rounded-2xl font-black">保存する</Button>
                      <Button type="button" onClick={() => setIsEditing(false)} variant="ghost" className="flex-1 h-12 rounded-2xl font-black text-gray-500">キャンセル</Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Profile / Auth Modal */}
      <Dialog open={isProfileModalOpen} onOpenChange={(open) => {
        setIsProfileModalOpen(open);
        if (!open) { setAuthStep('idle'); setAuthEmail(''); }
      }}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-none shadow-2xl">

          {/* ログイン済み: プロフィール表示 */}
          {user ? (
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-[#ff385c] to-[#e00b41] rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg">
                  {user.name[0]}
                </div>
                <div>
                  <DialogTitle className="text-xl font-black text-[#222222]">{user.name}</DialogTitle>
                  <p className="text-sm text-gray-400">{user.email}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">フォロー中のカレンダー</p>
                <p className="text-2xl font-black text-[#222222]">{followedGroups.length} 件</p>
              </div>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">表示名</label>
                  <input name="name" type="text" defaultValue={user.name} className="w-full h-12 bg-gray-50 border-none rounded-xl px-4 focus:ring-2 focus:ring-[#ff385c] outline-none font-bold text-[#222222]" required />
                </div>
                <button type="submit" disabled={loading} className="w-full h-12 bg-[#222222] hover:bg-black text-white font-black rounded-xl transition-all active:scale-[0.98] disabled:opacity-50">
                  {loading ? '保存中...' : '名前を更新'}
                </button>
              </form>
              <button
                onClick={handleLogout}
                className="w-full py-3 text-sm font-bold text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
              >
                ログアウト
              </button>
            </div>
          ) : authStep === 'logging_in' ? (
            /* ログイン中 */
            <div className="p-12 flex flex-col items-center gap-4">
              <Loader2 className="animate-spin h-10 w-10 text-[#ff385c]" />
              <DialogTitle className="text-lg font-black text-[#222222]">ログイン中...</DialogTitle>
            </div>
          ) : authStep === 'sent' ? (
            /* メール送信済み */
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-[#fff0f3] rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-3xl">📧</span>
              </div>
              <DialogTitle className="text-xl font-black text-[#222222]">メールを確認してください</DialogTitle>
              <p className="text-sm text-gray-500 leading-relaxed">
                <span className="font-bold text-[#222222]">{authEmail}</span> にログインリンクを送りました。<br />
                メール内のボタンをクリックするとログインできます。
              </p>
              <p className="text-xs text-gray-400">リンクは15分間有効です</p>
              <button
                onClick={() => { setAuthStep('idle'); setAuthEmail(''); }}
                className="text-sm font-bold text-[#ff385c] hover:underline"
              >
                別のメールアドレスで試す
              </button>
            </div>
          ) : (
            /* 未ログイン: メール入力 */
            <div className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-[#ff385c] rounded-2xl flex items-center justify-center mx-auto text-white shadow-lg mb-4">
                  <Calendar className="w-7 h-7" />
                </div>
                <DialogTitle className="text-2xl font-black text-[#222222] tracking-tight">Oshi-Linkにログイン</DialogTitle>
                <p className="text-sm text-gray-500 leading-relaxed">
                  メールアドレスを入力すると、ログインリンクが届きます。<br />
                  パスワード不要・安全・簡単。
                </p>
              </div>
              <form onSubmit={handleSendMagicLink} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">お名前（初回のみ）</label>
                  <input name="name" type="text" placeholder="推しファン太郎" className="w-full h-12 bg-gray-50 border-none rounded-xl px-4 focus:ring-2 focus:ring-[#ff385c] outline-none font-bold text-[#222222]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">メールアドレス <span className="text-red-500">*</span></label>
                  <input name="email" type="email" placeholder="hello@example.com" className="w-full h-12 bg-gray-50 border-none rounded-xl px-4 focus:ring-2 focus:ring-[#ff385c] outline-none font-bold text-[#222222]" required />
                </div>
                <button type="submit" disabled={loading} className="w-full h-14 bg-[#ff385c] hover:bg-[#e00b41] text-white font-black rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg text-base">
                  {loading ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : 'ログインリンクを送る 📧'}
                </button>
              </form>
              <p className="text-center text-[11px] text-gray-400">
                アカウントがない場合は自動で作成されます
              </p>
            </div>
          )}

        </DialogContent>
      </Dialog>


      {/* Create Group Modal */}
      <Dialog open={isGroupModalOpen} onOpenChange={setIsGroupModalOpen}>
        <DialogContent className="sm:max-w-[480px] bg-white border-none rounded-[32px] shadow-2xl p-0 overflow-hidden">
          <div className="bg-gray-50 p-8 border-b border-gray-100">
            <DialogTitle className="text-2xl font-black text-[#222222] tracking-tight">共有カレンダーを作成</DialogTitle>
            <DialogDescription className="text-gray-500 font-medium mt-1">
              新しい推しグループのカレンダーを作成し、みんなで予定を共有しましょう。
            </DialogDescription>
          </div>
          <form onSubmit={handleCreateGroup} className="p-8 space-y-5 bg-white">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">グループ名 <span className="text-red-500">*</span></label>
              <input name="name" className="w-full h-12 bg-gray-50 border-none rounded-xl px-4 focus:ring-2 focus:ring-[#ff385c] outline-none font-bold text-[#222222]" placeholder="例: Virtual Idols Unit X" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">説明</label>
              <textarea name="description" className="w-full h-24 bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-[#ff385c] outline-none resize-none font-medium text-[#222222]" placeholder="どんなグループか簡単に説明を..." />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-[#222222] hover:bg-black text-white h-14 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all">
              {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : 'カレンダーを公開する'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
