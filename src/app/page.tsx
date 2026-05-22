'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ChevronLeft, 
  AlertCircle, 
  Users, 
  Bell, 
  Calendar, 
  Search 
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, addMonths, subMonths, isSameDay, parseISO, addDays } from 'date-fns';
import { Group, Event, View } from '@/lib/types';

// Components
import { Sidebar } from '@/components/layout/Sidebar';
import { RightPanel } from '@/components/layout/RightPanel';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { CalendarView } from '@/components/calendar/CalendarView';
import { ProfileModal } from '@/components/modals/ProfileModal';
import { CreateGroupModal } from '@/components/modals/CreateGroupModal';
import { LinkWarningModal } from '@/components/modals/LinkWarningModal';
import { DiscoverModal } from '@/components/modals/DiscoverModal';
import { EventDetailModal } from '@/components/modals/EventDetailModal';
import { GroupSettingsModal } from '@/components/modals/GroupSettingsModal';
import { CreditsModal } from '@/components/modals/CreditsModal';
import { AddEventModal } from '@/components/modals/AddEventModal';
import { NewsModal } from '@/components/modals/NewsModal';
import { AdBanner } from '@/components/ui/AdBanner';
import { groupColorSolid } from '@/components/ui/shared';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Suspense } from 'react';

// Hooks
import { useAuth } from '@/hooks/useAuth';
import { useCalendarData } from '@/hooks/useCalendarData';

export function AppContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { 
    user, sessionToken, isAuthChecking, mounted, checkAuth, authHeaders,
    logout, loading: authLoading, handleProfileUpdate,
    disputeWarning, setDisputeWarning
  } = useAuth();

  const {
    allGroups, followedGroups, events, loading, isInitialLoading, setLoading, groupLoading, followLoading,
    loadGroups, loadEvents, handleFollowToggle, handleUnfollow, handleSavePersonalization, handleCreateGroup
  } = useCalendarData({ user, authHeaders });

  // UI States
  const [activeGroupId, setActiveGroupId] = useState<string>('0');

  // URL Parameter Handling
  useEffect(() => {
    if (isAuthChecking || !mounted) return;

    const groupParam = searchParams.get('group');
    if (groupParam) {
      if (!user) {
        // 未ログインならログイン画面へ飛ばす
        router.push(`/login?group=${groupParam}`);
      } else {
        // ログイン済みならそのグループを選択状態にする
        setActiveGroupId(groupParam);
      }
    }
  }, [searchParams, user, isAuthChecking, mounted, router]);
  const [view, setView] = useState<View>('month');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isDiscoverOpen, setIsDiscoverOpen] = useState(false);
  const [personalizationOpen, setPersonalizationOpen] = useState(false);
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [isNewsOpen, setIsNewsOpen] = useState(false);
  const [hasNewNews, setHasNewNews] = useState(false);
  const [discoverSearch, setDiscoverSearch] = useState('');

  // お知らせの未読チェック
  useEffect(() => {
    async function checkNews() {
      try {
        const res = await fetch(`/api/news?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json() as { items: { pubDate: string }[] };
          if (data.items && data.items.length > 0) {
            const lastSeen = localStorage.getItem('oshi_news_last_seen');
            if (lastSeen !== data.items[0].pubDate) {
              setHasNewNews(true);
            }
          }
        }
      } catch {}
    }
    if (mounted) checkNews();
  }, [mounted]);

  // Selected Data
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [defaultEventData, setDefaultEventData] = useState<{ date: string; startTime?: string; endTime?: string } | null>(null);
  const [externalUrlWarning, setExternalUrlWarning] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ name: string; shortName: string; address: string; latitude: number; longitude: number } | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');


  // Form States
  const [eventCategory, setEventCategory] = useState('オフライン系');
  const [eventSubCategory, setEventSubCategory] = useState('ライブ・コンサート');

  // Persistence
  useEffect(() => {
    const savedId = localStorage.getItem('oshi_active_group');
    if (savedId) setActiveGroupId(savedId);
  }, []);

  useEffect(() => {
    if (mounted) localStorage.setItem('oshi_active_group', activeGroupId);
  }, [activeGroupId, mounted]);

  useEffect(() => {
    if (!isAuthChecking) {
      loadGroups();
      loadEvents();
    }
  }, [loadGroups, loadEvents, isAuthChecking]);

  useEffect(() => {
    if (isProfileModalOpen && sessionToken) {
      checkAuth();
    }
  }, [isProfileModalOpen, sessionToken, checkAuth]);

  // Derived State
  const filteredEvents = useMemo(() => events.filter(e => {
    if (activeGroupId === '0') {
      return followedGroups.some(g => g.id === e.group_id);
    }
    return e.group_id === activeGroupId;
  }), [events, activeGroupId, followedGroups]);

  const themeColor = useMemo(() => {
    if (activeGroupId === '0') return '#6366f1';
    const g = allGroups.find(item => item.id === activeGroupId);
    return g?.custom_theme_color || groupColorSolid(activeGroupId);
  }, [allGroups, activeGroupId]);

  const getGroupColor = useCallback((groupId: string) => {
    // 「すべての予定」表示の時は、予定の色を一律で青（#6366f1）にする
    if (activeGroupId === '0') return '#6366f1';
    
    const g = allGroups.find(item => item.id === groupId);
    return g?.custom_theme_color || groupColorSolid(groupId);
  }, [allGroups, activeGroupId]);

  // Handlers
  const handleToday = () => setCurrentMonth(new Date());
  const handlePrev = () => setCurrentMonth(view === 'month' ? subMonths(currentMonth, 1) : addDays(currentMonth, view === 'week' ? -7 : -1));
  const handleNext = () => setCurrentMonth(view === 'month' ? addMonths(currentMonth, 1) : addDays(currentMonth, view === 'week' ? 7 : 1));

  const handleAddEventSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) { setIsProfileModalOpen(true); return; }
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const dateVal = fd.get('date') as string;
    const isAllDay = fd.get('isAllDay') === '1';
    const startTime = isAllDay ? null : fd.get('startTime') as string;
    const endTime = isAllDay ? null : fd.get('endTime') as string;
    const dateStr = startTime ? `${dateVal}T${startTime}:00` : `${dateVal}T00:00:00`;
    
    const body = {
      group_id: selectedGroupId,
      title: fd.get('title'),
      date: dateStr,
      end_time: endTime ? `${dateVal}T${endTime}:00` : null,
      category: eventCategory,
      sub_category: eventSubCategory,
      location: fd.get('location'),
      address: selectedLocation?.address || null,
      latitude: selectedLocation?.latitude ?? null,
      longitude: selectedLocation?.longitude ?? null,
      description: fd.get('description'),
      source_url: fd.get('source_url'),
    };

    try {
      const res = await fetch('/api/events', { 
        method: 'POST', 
        headers: { ...authHeaders(), 'Content-Type': 'application/json' }, 
        body: JSON.stringify(body) 
      });
      if (res.ok) {
        await loadEvents();
        setIsAddModalOpen(false);
        setSelectedLocation(null);
        (e.target as HTMLFormElement).reset();
      } else {
        const error = await res.json() as { error: string; details?: string };
        alert(error.details || error.error || '登録に失敗しました');
      }
    } catch { alert('通信エラーが発生しました'); }
    setLoading(false);
  };

  const handleUpdateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEvent || !user) return;
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = { id: selectedEvent.id, title: fd.get('title'), description: fd.get('description') };
    try {
      const res = await fetch('/api/events', { 
        method: 'PUT', 
        headers: { ...authHeaders(), 'Content-Type': 'application/json' }, 
        body: JSON.stringify(body) 
      });
      if (res.ok) {
        await loadEvents();
        setIsEditing(false);
        setSelectedEvent(prev => prev ? { ...prev, title: body.title as string, description: body.description as string } : null);
      } else {
        const error = await res.json() as any;
        alert(error.error || '更新に失敗しました');
      }
    } catch { alert('通信エラーが発生しました'); }
    setLoading(false);
  };

  const handleVerify = async (status: 'confirmed' | 'disputed') => {
    if (!selectedEvent || !user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/events/verify', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: selectedEvent.id, status }),
      });
      if (res.ok) {
        await loadEvents();
        const data = await res.json() as { confirms: number; disputes: number; is_tentative: number; verified: number; disputed: number; user_vote: 'confirmed' | 'disputed' };
        setSelectedEvent(prev => prev ? { 
          ...prev, 
          confirms_count: data.confirms, 
          disputes_count: data.disputes, 
          is_tentative: !!data.is_tentative,
          verified: !!data.verified,
          disputed: !!data.disputed,
          user_vote: data.user_vote
        } : null);
      }
    } catch {}
    setLoading(false);
  };

  const handleiCalExport = (groupId: string) => {
    const token = localStorage.getItem('oshi_session');
    const url = `${window.location.origin}/api/groups/export?group_id=${groupId}${token ? `&token=${token}` : ''}`;
    const webcal = url.replace('https:', 'webcal:').replace('http:', 'webcal:');
    window.location.href = webcal;
  };

  if (isAuthChecking || !mounted) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-100 border-t-[#6366f1] rounded-full animate-spin" />
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Oshi-Link Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#fafafa] overflow-hidden text-[#222222] font-sans selection:bg-indigo-100 selection:text-[#6366f1]">
      <Sidebar 
        user={user}
        followedGroups={followedGroups}
        allGroups={allGroups}
        activeGroupId={activeGroupId}
        setActiveGroupId={setActiveGroupId}
        themeColor={themeColor}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        setIsProfileModalOpen={setIsProfileModalOpen}
        setIsDiscoverOpen={setIsDiscoverOpen}
        setEditingGroupId={setEditingGroupId}
        setPersonalizationOpen={setPersonalizationOpen}
        handleUnfollow={(id) => handleUnfollow(id, activeGroupId, setActiveGroupId)}
        view={view}
        setView={setView}
        setIsNewsOpen={(open) => {
          setIsNewsOpen(open);
          if (open) setHasNewNews(false);
        }}
        hasNewNews={hasNewNews}
      />

      <main className="flex-1 flex flex-col min-w-0 relative h-full">
        {/* フォロー中が0件の時はヘッダーを非表示にする */}
        {(!isInitialLoading && followedGroups.length === 0) ? null : (
          <CalendarHeader 
            currentMonth={currentMonth}
            view={view}
            setView={setView}
            onPrev={handlePrev}
            onNext={handleNext}
            onToday={handleToday}
            onAddEvent={() => { 
              if (followedGroups.length === 0) {
                setIsDiscoverOpen(true);
                return;
              }
              setDefaultEventData(null); 
              setSelectedGroupId(activeGroupId === '0' ? followedGroups[0]?.id || '' : activeGroupId);
              setIsAddModalOpen(true); 
            }}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
            isRightPanelOpen={isRightPanelOpen}
            setIsRightPanelOpen={setIsRightPanelOpen}
            themeColor={themeColor}
            activeGroupId={activeGroupId}
          />
        )}

        <div className="flex-1 overflow-hidden h-full">
          {!isInitialLoading && followedGroups.length === 0 ? (
            <div className="h-full flex items-center justify-center p-6">
              <div 
                className="w-full max-w-4xl p-8 md:p-12 rounded-[40px] text-white shadow-2xl animate-in fade-in zoom-in duration-700 relative overflow-hidden"
                style={{ 
                  background: 'linear-gradient(135deg, #EA4335 0%, #FBBC05 25%, #34A853 50%, #4285F4 100%)',
                  backgroundSize: '200% 200%',
                  animation: 'gradientMove 15s ease infinite'
                }}
              >
                {/* 背景の装飾的な要素 */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-black/10 rounded-full blur-3xl" />

                <style jsx>{`
                  @keyframes gradientMove {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                  }
                `}</style>

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                  <div className="flex-1 space-y-8 text-center md:text-left">
                    <div className="space-y-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full border border-white/30 text-[10px] font-black uppercase tracking-[0.2em] mb-2 shadow-sm">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        Public Beta Test
                      </div>
                      <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight drop-shadow-sm">
                        Oshi-Link へ<br />ようこそ！
                      </h2>
                      <p className="text-lg text-white/90 font-medium leading-relaxed max-w-lg">
                        推しの予定をみんなで共有・管理するカレンダーへようこそ。<br />
                        まずは気になるグループをフォローして、あなただけのカレンダーを完成させましょう。
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      {[
                        { icon: <Users className="w-6 h-6" />, title: "共有", desc: "ファン全員で更新" },
                        { icon: <Bell className="w-6 h-6" />, title: "通知", desc: "見逃しをゼロに" },
                        { icon: <Calendar className="w-6 h-6" />, title: "信頼", desc: "不正確な情報を排除" },
                      ].map((f, i) => (
                        <div key={i} className="bg-white/10 backdrop-blur-md rounded-[24px] p-5 border border-white/10 hover:bg-white/20 transition-all cursor-default group">
                          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            {f.icon}
                          </div>
                          <h3 className="text-sm font-black mb-1">{f.title}</h3>
                          <p className="text-[11px] text-white/60 font-bold leading-tight">{f.desc}</p>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4">
                      <Button 
                        onClick={() => setIsDiscoverOpen(true)}
                        className="h-14 px-10 bg-white text-[#6366f1] hover:bg-white/90 rounded-[20px] font-black text-base shadow-xl transition-all active:scale-[0.95] hover:shadow-2xl hover:-translate-y-0.5"
                      >
                        <Search className="w-5 h-5 mr-3" /> カレンダーを探しに行く
                      </Button>
                    </div>
                  </div>

                  <div className="hidden lg:block w-80 h-80 relative shrink-0">
                    <div className="absolute inset-0 bg-white/10 rounded-[60px] rotate-12 animate-pulse" />
                    <div className="absolute inset-0 bg-white/5 rounded-[60px] -rotate-6 animate-pulse delay-700" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative">
                        <Calendar className="w-40 h-40 text-white/20 rotate-12" />
                        <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/20 rounded-3xl backdrop-blur-xl flex items-center justify-center animate-bounce">
                          <Search className="w-10 h-10 text-white" />
                        </div>
                      </div>
                    </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
            <CalendarView 
              view={view}
              currentMonth={currentMonth}
              events={filteredEvents}
              themeColor={themeColor}
              getGroupColor={getGroupColor}
              onEventClick={setSelectedEvent}
              onDateClick={(d, startTime, endTime) => {
                if (followedGroups.length === 0) {
                  setIsDiscoverOpen(true);
                  return;
                }
                setDefaultEventData({ 
                  date: format(d, 'yyyy-MM-dd'),
                  startTime,
                  endTime
                });
                setSelectedGroupId(activeGroupId === '0' ? followedGroups[0]?.id || '' : activeGroupId);
                setIsAddModalOpen(true);
              }}
            />
          )}
        </div>

        <AdBanner premiumStatus={user?.premium_status} />
      </main>

      <RightPanel 
        isOpen={isRightPanelOpen}
        onClose={() => setIsRightPanelOpen(false)}
        events={filteredEvents}
        getGroupColor={getGroupColor}
        onEventClick={setSelectedEvent}
      />

      {/* Floating Open Button for RightPanel */}
      {!isRightPanelOpen && (
        <button 
          onClick={() => setIsRightPanelOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-white border border-r-0 border-gray-100 rounded-l-2xl p-3 shadow-xl hover:pr-5 transition-all group flex items-center justify-center"
          title="予定一覧を表示"
        >
          <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-[#6366f1]" />
        </button>
      )}

      {/* Modals */}
      {user && (
        <ProfileModal 
          isOpen={isProfileModalOpen} 
          onOpenChange={setIsProfileModalOpen} 
          user={user} 
          followedGroups={followedGroups}
          handleProfileUpdate={handleProfileUpdate}
          handleLogout={logout}
          setIsCreditsOpen={setIsCreditsOpen}
          loading={authLoading}
        />
      )}

      <DiscoverModal 
        isOpen={isDiscoverOpen}
        onOpenChange={setIsDiscoverOpen}
        discoverSearch={discoverSearch}
        setDiscoverSearch={setDiscoverSearch}
        allGroups={allGroups}
        handleFollowToggle={(g) => handleFollowToggle(g, () => setIsProfileModalOpen(true))}
        followLoading={followLoading}
        handleSubscribe={handleiCalExport}
        openCreateGroup={() => { setIsDiscoverOpen(false); setIsGroupModalOpen(true); }}
      />

      <EventDetailModal 
        isOpen={!!selectedEvent}
        onOpenChange={(open) => { if (!open) setSelectedEvent(null); }}
        selectedEvent={selectedEvent}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        loading={loading}
        setExternalUrlWarning={setExternalUrlWarning}
        handleVerify={handleVerify}
        handleUpdateEvent={handleUpdateEvent}
        handleSubscribe={handleiCalExport}
        authHeaders={authHeaders}
      />

      <AddEventModal 
        isOpen={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        loading={loading}
        themeColor={themeColor}
        defaultEventData={defaultEventData}
        eventCategory={eventCategory}
        setEventCategory={setEventCategory}
        eventSubCategory={eventSubCategory}
        setEventSubCategory={setEventSubCategory}
        selectedLocation={selectedLocation}
        setSelectedLocation={setSelectedLocation}
        groups={followedGroups}
        selectedGroupId={selectedGroupId}
        setSelectedGroupId={setSelectedGroupId}
        onSubmit={handleAddEventSubmit}
      />

      <GroupSettingsModal 
        isOpen={personalizationOpen}
        onOpenChange={setPersonalizationOpen}
        group={allGroups.find(g => g.id === editingGroupId) || null}
        loading={groupLoading}
        handleSavePersonalization={(e) => handleSavePersonalization(e, allGroups.find(g => g.id === editingGroupId) || null, () => setPersonalizationOpen(false))}
      />

      <CreateGroupModal 
        isOpen={isGroupModalOpen}
        onOpenChange={setIsGroupModalOpen}
        handleCreateGroup={(e) => handleCreateGroup(e, () => setIsGroupModalOpen(false))}
        loading={groupLoading}
      />

      <LinkWarningModal 
        url={externalUrlWarning}
        onClose={() => setExternalUrlWarning(null)}
      />

      <CreditsModal 
        isOpen={isCreditsOpen}
        onOpenChange={setIsCreditsOpen}
      />

      <NewsModal 
        isOpen={isNewsOpen}
        onOpenChange={setIsNewsOpen}
      />

      {/* 不正確判定への警告アラート */}
      <Dialog open={disputeWarning} onOpenChange={setDisputeWarning}>
        <DialogContent className="max-w-md p-8 rounded-[32px] bg-white border-none shadow-2xl top-1/2 -translate-y-1/2">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-[#6366f1]" />
            </div>
            <DialogTitle className="text-xl font-black text-[#222222]">投稿に関するご注意</DialogTitle>
            <DialogDescription className="text-sm text-gray-500 font-medium leading-relaxed">
              あなたが作成した予定が、コミュニティにより「不正確」であると判断されました。<br /><br />
              虚偽情報の投稿が繰り返されると、新しい予定の作成ができなくなる場合がありますのでご注意ください。
            </DialogDescription>
            <Button 
              onClick={() => setDisputeWarning(false)}
              className="w-full bg-[#222222] hover:bg-black text-white h-12 rounded-xl font-black transition-all"
            >
              了解しました
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={null}>
      <AppContent />
    </Suspense>
  );
}
