'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Script from 'next/script';
import { Calendar, Clock, MapPin, Plus, ShieldCheck, AlertCircle, UserCircle, Loader2, Star, Users, Search, Bell, X, Check, ChevronRight, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameDay, isSameMonth, parseISO } from 'date-fns';
import { Group, Event, User, View } from '@/lib/types';
import { FALLBACK_IMG, GROUP_COLORS, groupColor, GroupAvatar } from '@/components/ui/shared';
import { ProfileModal } from '@/components/modals/ProfileModal';
import { CreateGroupModal } from '@/components/modals/CreateGroupModal';
import { LinkWarningModal } from '@/components/modals/LinkWarningModal';
import { DiscoverModal } from '@/components/modals/DiscoverModal';
import { EventDetailModal } from '@/components/modals/EventDetailModal';
import { GroupSettingsModal } from '@/components/modals/GroupSettingsModal';
import { CreditsModal } from '@/components/modals/CreditsModal';
import { groupColorSolid } from '@/components/ui/shared';

export default function App() {
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [followedGroups, setFollowedGroups] = useState<Group[]>([]);
  const router = useRouter();

  const [events, setEvents] = useState<Event[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string>('0');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isDiscoverOpen, setIsDiscoverOpen] = useState(false);
  const [personalizationOpen, setPersonalizationOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  const [discoverSearch, setDiscoverSearch] = useState('');
  const [followLoading, setFollowLoading] = useState<string | null>(null);
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<View>('month');
  const [externalUrlWarning, setExternalUrlWarning] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [defaultEventData, setDefaultEventData] = useState<{ date: string; startTime?: string; endTime?: string } | null>(null);
  const [draggingRange, setDraggingRange] = useState<{ date: string; start: number; end: number } | null>(null);
  const [eventCategory, setEventCategory] = useState('出演');

  // Initialize activeGroupId from localStorage if available
  useEffect(() => {
    const savedId = localStorage.getItem('oshi_active_group');
    if (savedId) setActiveGroupId(savedId);
  }, []);

  // Persist activeGroupId to localStorage
  useEffect(() => {
    if (mounted) localStorage.setItem('oshi_active_group', activeGroupId);
  }, [activeGroupId, mounted]);

  // セッション認証ヘルパー
  function authHeaders(): Record<string, string> {
    const token = sessionToken || (typeof window !== 'undefined' ? localStorage.getItem('oshi_session') : null);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  // 初期ロード: ローカルセッションを確認
  useEffect(() => {
    setMounted(true);

    async function init() {
      const saved = localStorage.getItem('oshi_session');
      if (saved) {
        setSessionToken(saved);
        try {
          const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${saved}` },
          });
          if (res.ok) {
            const data = await res.json() as { user?: User };
            if (data.user) {
              setUser(data.user);
              setIsAuthChecking(false);
              return;
            }
          }
          localStorage.removeItem('oshi_session');
          setSessionToken(null);
        } catch {}
      }
      
      // 未認証の場合はログイン画面へ
      setIsAuthChecking(false);
      router.push('/login');
    }
    init();
  }, [router]);

  const loadGroups = useCallback(async (userId?: string) => {
    try {
      const uid = userId || user?.id || '';
      let url = uid ? `/api/groups?user_id=${uid}` : '/api/groups';
      url += (url.includes('?') ? '&' : '?') + 't=' + Date.now();
      const res = await fetch(url, { cache: 'no-store', headers: authHeaders() });
      const data = await res.json() as { groups?: Group[] };
      const groups = data.groups || data as unknown as Group[] || [];
      setAllGroups(groups);
      setFollowedGroups(groups.filter(g => g.is_following));
    } catch {}
  }, [user?.id]);

  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/events?t=' + Date.now(), { cache: 'no-store', headers: authHeaders() });
      const data = await res.json() as { events?: Event[] };
      // /api/events サーバーは配列を直接返す
      const eventList = data.events || data as unknown as Event[] || [];
      setEvents(eventList);
    } catch {}
  }, []);

  useEffect(() => {
    // Wait until auth check is done or user is loaded to fetch groups with personalization
    if (!isAuthChecking) {
      loadGroups();
      loadEvents();
    }
  }, [loadGroups, loadEvents, isAuthChecking]);

  // フォロー/アンフォロー
  async function handleFollowToggle(group: Group) {
    if (!user) { setIsProfileModalOpen(true); return; }
    setFollowLoading(group.id);
    try {
      await fetch('\u002fapi\u002fgroups\u002ffollow', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application\u002fjson' },
        body: JSON.stringify({ group_id: group.id }),
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
      category: eventCategory,
      location: fd.get('location'),
      description: fd.get('description'),
      source_url: fd.get('source_url'),
      user_id: user.id,
    };
    try {
      await fetch('\u002fapi\u002fevents', { method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application\u002fjson' }, body: JSON.stringify(body) });
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
      await fetch('\u002fapi\u002fevents', { method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application\u002fjson' }, body: JSON.stringify(body) });
      await loadEvents();
      setIsEditing(false);
      setSelectedEvent(null);
    } catch { alert('更新に失敗しました'); }
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
    setIsProfileModalOpen(false);
    localStorage.removeItem('oshi_session');
    setSessionToken(null);
    setUser(null);
    router.push('/login');
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
      await fetch('\u002fapi\u002fgroups', { method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application\u002fjson' }, body: JSON.stringify(body) });
      await loadGroups(user.id);
      setIsGroupModalOpen(false);
      (e.target as HTMLFormElement).reset();
    } catch { alert('作成に失敗しました'); }
    setLoading(false);
  }

  async function handleVerify(status: 'confirmed' | 'disputed') {
    if (!user || !selectedEvent) { setIsProfileModalOpen(true); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/events/verify', { 
        method: 'POST', 
        headers: authHeaders(), 
        body: JSON.stringify({ event_id: selectedEvent.id, user_id: user.id, status }) 
      });
      if (res.ok) {
        const data = await res.json() as { deleted?: boolean; confirms?: number; disputes?: number; is_tentative?: number };
        if (data.deleted) {
          setSelectedEvent(null);
        } else {
          setSelectedEvent(prev => prev ? {
            ...prev,
            confirms_count: data.confirms ?? prev.confirms_count,
            disputes_count: data.disputes ?? prev.disputes_count,
            is_tentative: data.is_tentative !== undefined ? data.is_tentative === 1 : prev.is_tentative
          } : null);
        }
        await loadEvents();
      }
    } catch (e) {
      console.error('Verify error:', e);
    }
    setLoading(false);
  }

  async function handleSavePersonalization(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      user_id: user.id,
      group_id: fd.get('group_id'),
      custom_bg_image: fd.get('custom_bg_image') as string || null,
      custom_theme_color: fd.get('custom_theme_color') as string || null,
    };
    try {
      await fetch('/api/groups/follow', {
        method: 'PATCH',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      await loadGroups(user.id);
      setPersonalizationOpen(false);
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
    !discoverSearch || g.name.toLowerCase().includes(discoverSearch.toLowerCase()) || (g.description || '').toLowerCase().includes(discoverSearch.toLowerCase())
  );

  function getGroupColor(groupId: string) {
    const g = allGroups.find(item => item.id === groupId);
    return g?.custom_theme_color || groupColorSolid(groupId);
  }

  const activeGroupData = allGroups.find(g => g.id === activeGroupId);
  const themeColor = activeGroupData?.custom_theme_color || (activeGroupId !== '0' ? groupColorSolid(activeGroupId) : '#ff385c');
  const bgImage = activeGroupData?.custom_bg_image || null;

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
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} />
            <p className="text-[12px] font-bold uppercase tracking-widest" style={{ color: themeColor }}>{view} schedule</p>
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
              <div 
                key={h} 
                className="h-20 border-b border-gray-50 relative cursor-pointer hover:bg-gray-50/50 transition-colors"
                onMouseDown={() => {
                  setDraggingRange({ date: format(currentMonth, 'yyyy-MM-dd'), start: h, end: h });
                }}
                onMouseEnter={() => {
                  if (draggingRange) setDraggingRange({ ...draggingRange, end: h });
                }}
                onMouseUp={() => {
                  if (draggingRange) {
                    const start = Math.min(draggingRange.start, draggingRange.end);
                    const end = Math.max(draggingRange.start, draggingRange.end) + 1;
                    setDefaultEventData({ 
                      date: draggingRange.date,
                      startTime: `${String(start).padStart(2, '0')}:00`,
                      endTime: `${String(end).padStart(2, '0')}:00`
                    });
                    setDraggingRange(null);
                    setIsAddModalOpen(true);
                  }
                }}
              >
                {/* Drag Feedback Overlay */}
                {draggingRange && draggingRange.date === format(currentMonth, 'yyyy-MM-dd') && (
                  (() => {
                    const dragStart = Math.min(draggingRange.start, draggingRange.end);
                    const dragEnd = Math.max(draggingRange.start, draggingRange.end);
                    if (h >= dragStart && h <= dragEnd) {
                      return <div className="absolute inset-0 opacity-30 z-10" style={{ backgroundColor: themeColor }} />;
                    }
                    return null;
                  })()
                )}
                {dayEvents.map((e, idx) => {
                  const startHour = 10 + (idx * 2);
                  if (h === startHour) return (
                    <div
                      key={idx}
                      onClick={() => setSelectedEvent(e)}
                      className="absolute inset-x-4 top-2 bottom-2 text-white p-4 rounded-3xl shadow-lg hover:scale-[1.02] transition-all cursor-pointer z-20"
                      style={{ backgroundColor: getGroupColor(e.group_id) }}
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
                <div key={i} className="flex-1 border-r border-gray-50 relative pt-20 min-h-[3072px]" style={isSameDay(d, new Date()) ? { backgroundColor: `${themeColor}08` } : {}}>
                  <div className="absolute top-0 left-0 right-0 h-20 border-b border-gray-50 flex flex-col items-center justify-center bg-white backdrop-blur-sm z-10">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{format(d, 'eee')}</p>
                    <p className="text-xl font-black" style={isSameDay(d, new Date()) ? { color: themeColor } : { color: '#222222' }}>{format(d, 'd')}</p>
                  </div>
                  <div className="flex flex-col flex-1">
                    {hours.map(h => (
                      <div 
                        key={h} 
                        className="h-32 border-b border-gray-50 relative cursor-pointer hover:bg-gray-50/50 transition-colors"
                        onMouseDown={() => {
                          setDraggingRange({ date: format(d, 'yyyy-MM-dd'), start: h, end: h });
                        }}
                        onMouseEnter={() => {
                          if (draggingRange) setDraggingRange({ ...draggingRange, end: h });
                        }}
                        onMouseUp={() => {
                          if (draggingRange) {
                            const start = Math.min(draggingRange.start, draggingRange.end);
                            const end = Math.max(draggingRange.start, draggingRange.end) + 1;
                            setDefaultEventData({ 
                              date: draggingRange.date,
                              startTime: `${String(start).padStart(2, '0')}:00`,
                              endTime: `${String(end).padStart(2, '0')}:00`
                            });
                            setDraggingRange(null);
                            setIsAddModalOpen(true);
                          }
                        }}
                      >
                        {/* Drag Feedback Overlay */}
                        {draggingRange && draggingRange.date === format(d, 'yyyy-MM-dd') && (
                          (() => {
                            const dragStart = Math.min(draggingRange.start, draggingRange.end);
                            const dragEnd = Math.max(draggingRange.start, draggingRange.end);
                            if (h >= dragStart && h <= dragEnd) {
                              return <div className="absolute inset-0 opacity-30 z-10" style={{ backgroundColor: themeColor }} />;
                            }
                            return null;
                          })()
                        )}
                        {dayEvents.map((e, idx) => {
                          const startHour = 10 + (idx * 3);
                          if (h === startHour) return (
                            <div
                              key={idx}
                              onClick={(ev) => { ev.stopPropagation(); setSelectedEvent(e); }}
                              className={`absolute inset-x-2 top-2 bottom-2 bg-white flex shadow-lg rounded-md hover:scale-[1.05] transition-all cursor-pointer z-20 border border-gray-100 border-l-[8px] ${e.is_tentative ? 'opacity-90 grayscale-[0.2]' : ''}`}
                              style={{ borderLeftColor: getGroupColor(e.group_id) }}
                            >
                              <div className="flex-1 p-3 flex items-center min-w-0">
                                <h5 className="text-[11px] font-black text-[#222222] line-clamp-2 flex items-center gap-1">
                                  {e.is_tentative && <AlertCircle className="w-3 h-3 text-yellow-500 shrink-0" />}
                                  {e.title}
                                </h5>
                              </div>
                            </div>
                          );
                          return null;
                        })}
                      </div>
                    ))}
                  </div>
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
            className={`min-h-[80px] md:min-h-[120px] p-1 md:p-2 border-r border-b border-gray-50 transition-colors hover:bg-gray-100/50 relative cursor-pointer ${!isSameMonth(day, monthStart) ? 'bg-gray-50/50 opacity-50' : ''} ${isSameDay(day, new Date()) ? 'bg-gray-50/50' : ''}`}
            style={isSameDay(day, new Date()) ? { backgroundColor: `${themeColor}08` } : {}}
            onClick={() => {
              setDefaultEventData({ date: format(cloneDay, 'yyyy-MM-dd') });
              setIsAddModalOpen(true);
            }}
          >
            <span 
              className={`text-[10px] md:text-xs font-black absolute top-1 md:top-3 right-1 md:right-3 flex items-center justify-center ${isSameDay(day, new Date()) ? 'text-white w-5 h-5 md:w-7 md:h-7 rounded-full shadow-lg' : 'text-gray-400'}`}
              style={isSameDay(day, new Date()) ? { backgroundColor: themeColor } : {}}
            >
              {format(day, 'd')}
            </span>
            <div className="space-y-1 mt-5 md:mt-6">
              {dayEvents.slice(0, 3).map((e, idx) => (
                <div
                  key={idx}
                  onClick={(ev) => { ev.stopPropagation(); setSelectedEvent(e); }}
                  className={`flex items-center text-[9px] md:text-[11px] bg-white border border-gray-100 shadow-sm rounded-sm md:rounded truncate cursor-pointer hover:shadow-md transition-all font-medium text-[#222222] h-5 md:h-6 px-1.5 md:px-2 border-l-[4px] md:border-l-[6px] ${e.is_tentative ? 'opacity-85' : ''}`}
                  style={{ borderLeftColor: getGroupColor(e.group_id) }}
                >
                  {e.is_tentative && <AlertCircle className="w-2.5 h-2.5 md:w-3 md:h-3 text-yellow-500 mr-1 shrink-0" />}
                  {e.title}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <p className="text-[8px] md:text-[10px] text-gray-400 pl-1">他 {dayEvents.length - 3} 件...</p>
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

  if (!mounted || isAuthChecking) {
    return (
      <div className="flex h-screen w-full bg-[#f2f2f2] items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <Loader2 className="animate-spin h-10 w-10" style={{ color: themeColor }} />
          <p className="text-sm font-bold text-gray-400">認証情報を確認中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // The redirect will handle navigating away
  }

  return (
    <>
      <div className="flex h-screen w-full bg-[#f2f2f2] transition-all relative overflow-hidden" suppressHydrationWarning>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar - Following Calendars */}
      <aside className={`w-[260px] bg-white border-r border-gray-100 h-full flex flex-col flex-shrink-0 absolute md:relative z-50 md:z-auto transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>

        {/* App Logo + User */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md" style={{ backgroundColor: themeColor }}>
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
            className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all shrink-0 overflow-hidden"
          >
            {user ? (
              user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[11px] font-black text-gray-700">{user.name[0]}</span>
              )
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
                ? 'text-[#222222] bg-gray-50'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
            style={activeGroupId === '0' ? { backgroundColor: `${themeColor}15`, color: themeColor } : {}}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              activeGroupId === '0' ? '' : 'bg-gray-100 text-gray-400'
            }`} style={activeGroupId === '0' ? { backgroundColor: themeColor, color: 'white' } : {}}>
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
            className="text-[10px] font-bold hover:underline flex items-center gap-0.5"
            style={{ color: themeColor }}
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
                className="text-white rounded-xl h-8 px-3 text-xs font-bold"
                style={{ backgroundColor: themeColor }}
              >
                カレンダーを探す
              </Button>
            </div>
          ) : (
            <div className="space-y-0.5">
              {followedGroups.map(g => {
                const isActive = activeGroupId === g.id;
                return (
                  <div
                    key={g.id}
                    onClick={() => setActiveGroupId(g.id)}
                    className={`p-2.5 rounded-xl cursor-pointer transition-all group ${
                      isActive ? 'bg-gray-50' : 'hover:bg-gray-50'
                    }`}
                    style={isActive && g.custom_theme_color ? { backgroundColor: `${g.custom_theme_color}15` } : {}}
                  >
                    <div className="flex items-center gap-2.5">
                      <GroupAvatar group={g} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className={`text-[12px] font-black truncate ${
                          !isActive ? 'text-[#222222]' : 'text-gray-400'
                        }`}>{g.name}</p>
                        <p className="text-[10px] text-gray-400">
                          {g.event_count || 0}件 · {g.follower_count || 0}人
                        </p>
                      </div>
                      <div className="flex items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(ev) => { ev.stopPropagation(); setEditingGroupId(g.id); setPersonalizationOpen(true); }}
                          className="p-1 rounded-lg hover:bg-gray-100"
                          title="個人設定（色・背景）"
                        >
                          <img src="https://api.iconify.design/lucide:palette.svg?color=%239ca3af" alt="設定" className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(ev) => { ev.stopPropagation(); handleSubscribe(g.id); }}
                          className="p-1 rounded-lg hover:bg-gray-100"
                          title="iCalに追加"
                        >
                          <Bell className="w-3 h-3 text-gray-400" />
                        </button>
                      </div>
                    </div>
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

          {/* Footer credits link */}
          <div className="mt-auto pt-4 px-5">
            <button
              onClick={() => setIsCreditsOpen(true)}
              className="text-[10px] font-black text-gray-300 hover:text-gray-500 uppercase tracking-[0.2em] transition-colors"
            >
              Credits & Terms
            </button>
          </div>
        </div>



      </aside>

      {/* Main Content */}
      <div className="flex-1 flex h-full overflow-hidden">

        {/* Calendar Area */}
        <div className="flex-1 flex flex-col bg-white md:rounded-l-[32px] overflow-hidden shadow-2xl relative z-0">
          <header className="h-16 md:h-20 border-b flex items-center justify-between px-4 md:px-8 bg-white/95 backdrop-blur-md sticky top-0 z-10 shrink-0">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden text-gray-500 hover:bg-gray-100 rounded-xl"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div>
                <p className="text-lg md:text-2xl font-black text-[#222222] tracking-tight truncate max-w-[200px] md:max-w-[none]">
                  {allGroups.find(g => g.id === activeGroupId)?.name || (activeGroupId === '0' ? '全ての予定' : '')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">


              <Dialog open={isAddModalOpen} onOpenChange={(open) => { setIsAddModalOpen(open); if (!open) setDefaultEventData(null); }}>
                <DialogTrigger render={
                  <Button 
                    style={{ backgroundColor: themeColor }} 
                    className="text-white rounded-xl h-10 px-6 font-bold shadow-md active:scale-95 transition-all"
                    onClick={() => { setDefaultEventData(null); setIsAddModalOpen(true); }}
                  >
                    <Plus className="mr-2 h-4 w-4" /> 予定を追加
                  </Button>
                } />
                <DialogContent className="w-full sm:max-w-[500px] bg-white border-none rounded-t-[32px] sm:rounded-[32px] shadow-2xl p-0 overflow-hidden top-auto bottom-0 translate-y-0 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 transition-all duration-500">
                  <div className="bg-gray-50 p-6 border-b border-gray-100 flex-shrink-0">
                    <DialogTitle className="text-xl font-black text-[#222222] tracking-tight">予定を登録</DialogTitle>
                    <DialogDescription className="text-gray-500 font-medium mt-1 text-[11px]">推しの出演情報などをコミュニティで共有しましょう。</DialogDescription>
                  </div>
                  <form onSubmit={handleAddEvent} className="p-6 space-y-5 bg-white overflow-y-auto max-h-[85vh] pb-12">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">イベント名 <span className="text-red-500">*</span></label>
                      <input name="title" className="w-full h-12 bg-gray-50 border-none rounded-xl px-4 focus:ring-2 outline-none font-bold text-[#222222]" placeholder="LIVE TOUR 2026" required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">年月日 <span className="text-red-500">*</span></label>
                      <input 
                        name="date" 
                        type="date" 
                        max="9999-12-31" 
                        defaultValue={defaultEventData?.date || format(new Date(), 'yyyy-MM-dd')}
                        className="w-full h-12 bg-gray-50 border-none rounded-xl px-4 focus:ring-2 outline-none font-bold text-[#222222]" 
                        required 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">開始時刻</label>
                        <input 
                          name="startTime" 
                          type="time" 
                          defaultValue={defaultEventData?.startTime || '10:00'}
                          className="w-full h-12 bg-gray-50 border-none rounded-xl px-4 focus:ring-2 outline-none font-bold text-[#222222]" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">終了時刻</label>
                        <input 
                          name="endTime" 
                          type="time" 
                          defaultValue={defaultEventData?.endTime || ''}
                          className="w-full h-12 bg-gray-50 border-none rounded-xl px-4 focus:ring-2 outline-none font-bold text-[#222222]" 
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">カテゴリー <span className="text-red-500">*</span></label>
                      <select 
                        value={eventCategory} 
                        onChange={(e) => setEventCategory(e.target.value)}
                        className="w-full h-12 bg-gray-50 border-none rounded-xl px-4 focus:ring-2 outline-none font-bold text-[#222222]"
                      >
                        <option value="コンサート">コンサート</option>
                        <option value="出演">出演</option>
                        <option value="動画配信">動画配信</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">
                        {eventCategory === '動画配信' ? '配信URL' : '場所'}
                      </label>
                      <input 
                        name="location" 
                        className="w-full h-12 bg-gray-50 border-none rounded-xl px-4 focus:ring-2 outline-none font-bold text-[#222222]" 
                        placeholder={eventCategory === '動画配信' ? 'YouTubeのURLなど' : '会場名'} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">説明・備考</label>
                      <textarea name="description" className="w-full h-20 bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-[#ff385c] outline-none resize-none font-medium text-[#222222]" placeholder="チケット情報など..." />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">ソースURL <span className="text-red-500">*</span></label>
                      <input name="source_url" className="w-full h-12 bg-gray-50 border-none rounded-xl px-4 focus:ring-2 outline-none font-bold text-[#222222]" placeholder="公式Twitterの告知URLなど" required />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full text-white h-14 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all" style={{ backgroundColor: themeColor }}>
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
      <DiscoverModal
        isOpen={isDiscoverOpen}
        onOpenChange={setIsDiscoverOpen}
        discoverSearch={discoverSearch}
        setDiscoverSearch={setDiscoverSearch}
        allGroups={allGroups}
        followLoading={followLoading}
        handleFollowToggle={handleFollowToggle}
        handleSubscribe={handleSubscribe}
        openCreateGroup={() => { setIsDiscoverOpen(false); setIsGroupModalOpen(true); }}
      />

      {/* Group Settings Modal */}
      <GroupSettingsModal
        isOpen={personalizationOpen}
        onOpenChange={(open) => { setPersonalizationOpen(open); if (!open) setEditingGroupId(null); }}
        group={allGroups.find(g => g.id === editingGroupId) || null}
        loading={loading}
        handleSavePersonalization={handleSavePersonalization}
      />

      {/* Event Detail Modal */}
      <EventDetailModal
        isOpen={!!selectedEvent}
        onOpenChange={(open) => {
          if (!open) { setSelectedEvent(null); setIsEditing(false); }
        }}
        selectedEvent={selectedEvent}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        loading={loading}
        setExternalUrlWarning={setExternalUrlWarning}
        handleVerify={handleVerify}
        handleUpdateEvent={handleUpdateEvent}
        handleSubscribe={handleSubscribe}
      />

      {/* Link Warning Modal */}
      <LinkWarningModal 
        url={externalUrlWarning} 
        onClose={() => setExternalUrlWarning(null)} 
      />

      {/* Profile Modal */}
      <ProfileModal 
        isOpen={isProfileModalOpen}
        onOpenChange={setIsProfileModalOpen}
        user={user}
        followedGroups={followedGroups}
        handleProfileUpdate={handleProfileUpdate}
        handleLogout={handleLogout}
        loading={loading}
      />

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isGroupModalOpen}
        onOpenChange={setIsGroupModalOpen}
        handleCreateGroup={handleCreateGroup}
        loading={loading}
      />

      {/* Credits Modal */}
      <CreditsModal
        isOpen={isCreditsOpen}
        onOpenChange={setIsCreditsOpen}
      />

    </div>
    </>
  );
}
