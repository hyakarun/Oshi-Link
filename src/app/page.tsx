'use client';
import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, addMonths, subMonths, addDays } from 'date-fns';
import { Event, View } from '@/lib/types';

// Components
import { Sidebar } from '@/components/layout/Sidebar';
import { RightPanel } from '@/components/layout/RightPanel';
import { WelcomeHero } from '@/components/layout/WelcomeHero';
import { NoticeDialogs } from '@/components/layout/NoticeDialogs';
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
import { GroupDetailModal } from '@/components/modals/GroupDetailModal';
import { NewsModal } from '@/components/modals/NewsModal';
import { AdBanner } from '@/components/ui/AdBanner';
import { groupColorSolid } from '@/components/ui/shared';

// Hooks
import { useAuth } from '@/hooks/useAuth';
import { useCalendarData } from '@/hooks/useCalendarData';
import { useEventActions } from '@/hooks/useEventActions';

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
    loadGroups, loadEvents, hydrateFromBootstrap, handleFollowToggle, handleUnfollow, handleSavePersonalization,
    handleCreateGroup, handleApplyOfficialCalendar,
  } = useCalendarData({ user, authHeaders });

  // UI States
  const [activeGroupId, setActiveGroupId] = useState<string>('0');
  const [officialApplicationNotice, setOfficialApplicationNotice] = useState(false);

  useEffect(() => {
    if (isAuthChecking || !user) return;
    if (user.official_application?.status !== 'pending') return;
    if (sessionStorage.getItem('oshi_official_application_pending') !== '1') return;
    sessionStorage.removeItem('oshi_official_application_pending');
    setOfficialApplicationNotice(true);
  }, [isAuthChecking, user]);

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
  const [isGroupDetailOpen, setIsGroupDetailOpen] = useState(false);
  const [detailGroupId, setDetailGroupId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [isNewsOpen, setIsNewsOpen] = useState(false);
  const [hasNewNews, setHasNewNews] = useState(false);
  const [discoverSearch, setDiscoverSearch] = useState('');

  const applyNewsUnread = useCallback((items: { pubDate: string | null }[]) => {
    if (items.length > 0 && items[0].pubDate) {
      const lastSeen = localStorage.getItem('oshi_news_last_seen');
      if (lastSeen !== items[0].pubDate) {
        setHasNewNews(true);
      }
    }
  }, []);

  // Selected Data
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [defaultEventData, setDefaultEventData] = useState<{ date: string; startTime?: string; endTime?: string } | null>(null);
  const [externalUrlWarning, setExternalUrlWarning] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ name: string; shortName: string; address: string; latitude: number; longitude: number } | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  const handleOpenGroupDetail = useCallback((groupId: string) => {
    setDetailGroupId(groupId);
    setIsGroupDetailOpen(true);
  }, []);


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
      hydrateFromBootstrap(applyNewsUnread);
    }
  }, [hydrateFromBootstrap, isAuthChecking, applyNewsUnread]);

  useEffect(() => {
    if (isProfileModalOpen && sessionToken) {
      checkAuth({ userOnly: true });
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
    if (activeGroupId === '0') {
      const g = allGroups.find(item => item.id === groupId);
      return g?.custom_theme_color || groupColorSolid(groupId);
    }
    const activeGroup = allGroups.find(item => item.id === activeGroupId);
    if (activeGroup?.custom_theme_color) return activeGroup.custom_theme_color;
    const g = allGroups.find(item => item.id === groupId);
    return g?.custom_theme_color || groupColorSolid(groupId);
  }, [allGroups, activeGroupId]);

  const canAddEvent = useMemo(() => {
    if (activeGroupId !== '0') {
      const activeGroup = allGroups.find(g => g.id === activeGroupId);
      if (activeGroup?.is_official) {
        if (!user) return false;
        return user.is_official || user.official_groups?.includes(activeGroupId);
      }
    }
    return true;
  }, [user, activeGroupId, allGroups]);

  const postableGroups = useMemo(() => {
    return followedGroups.filter(g => {
      if (!g.is_official) return true;
      if (!user) return false;
      return user.is_official || user.official_groups?.includes(g.id);
    });
  }, [followedGroups, user]);

  const editEventGroups = useMemo(() => {
    const ids = new Set<string>();
    const result: { id: string; name: string }[] = [];

    const add = (g: { id: string; name: string } | undefined) => {
      if (g && !ids.has(g.id)) {
        result.push({ id: g.id, name: g.name });
        ids.add(g.id);
      }
    };

    if (selectedEvent) {
      add(allGroups.find((g) => g.id === selectedEvent.group_id));
    }
    for (const g of postableGroups) add(g);
    if (user?.official_groups) {
      for (const gid of user.official_groups) {
        add(allGroups.find((g) => g.id === gid));
      }
    }
    return result;
  }, [selectedEvent, postableGroups, allGroups, user?.official_groups]);

  // Handlers
  const handleToday = () => setCurrentMonth(new Date());
  const handlePrev = () => setCurrentMonth(view === 'month' ? subMonths(currentMonth, 1) : addDays(currentMonth, view === 'week' ? -7 : -1));
  const handleNext = () => setCurrentMonth(view === 'month' ? addMonths(currentMonth, 1) : addDays(currentMonth, view === 'week' ? 7 : 1));

  const {
    handleAddEventSubmit,
    handleUpdateEvent,
    handleDeleteEvent,
    handleVerify,
    handleiCalExport,
  } = useEventActions({
    user, authHeaders, loadEvents, setLoading, selectedEvent, setSelectedEvent,
    openProfile: () => setIsProfileModalOpen(true),
    selectedGroupId, eventCategory, eventSubCategory, selectedLocation, setSelectedLocation,
    closeAddModal: () => setIsAddModalOpen(false),
  });

  if (isAuthChecking || !mounted) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-100 dark:border-border border-t-[#6366f1] rounded-full animate-spin" />
          <p className="text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Oshi-Link Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#fafafa] dark:bg-background overflow-hidden text-[#222222] dark:text-foreground font-sans selection:bg-indigo-100 selection:text-[#6366f1]">
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
        onGroupIconClick={handleOpenGroupDetail}
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
              setSelectedGroupId(activeGroupId === '0' ? postableGroups[0]?.id || '' : activeGroupId);
              setIsAddModalOpen(true); 
            }}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
            isRightPanelOpen={isRightPanelOpen}
            setIsRightPanelOpen={setIsRightPanelOpen}
            themeColor={themeColor}
            activeGroupId={activeGroupId}
            canAddEvent={canAddEvent}
          />
        )}

        <div className="flex-1 overflow-hidden h-full">
          {!isInitialLoading && followedGroups.length === 0 ? (
            <WelcomeHero onDiscover={() => setIsDiscoverOpen(true)} />
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
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-white dark:bg-card border border-r-0 border-gray-100 dark:border-border rounded-l-2xl p-3 shadow-xl hover:pr-5 transition-all group flex items-center justify-center"
          title="予定一覧を表示"
        >
          <ChevronLeft className="w-5 h-5 text-gray-400 dark:text-zinc-500 group-hover:text-[#6366f1]" />
        </button>
      )}

      {/* Modals */}
      {user && (
        <ProfileModal 
          isOpen={isProfileModalOpen} 
          onOpenChange={setIsProfileModalOpen} 
          user={user} 
          followedGroups={followedGroups}
          handleProfileUpdate={(e) => handleProfileUpdate(e)}
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
        onGroupIconClick={handleOpenGroupDetail}
      />

      <EventDetailModal
        isOpen={!!selectedEvent}
        onOpenChange={(open) => { if (!open) { setSelectedEvent(null); setIsEditing(false); } }}
        selectedEvent={selectedEvent}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        loading={loading}
        setExternalUrlWarning={setExternalUrlWarning}
        handleVerify={handleVerify}
        handleUpdateEvent={handleUpdateEvent}
        handleDeleteEvent={handleDeleteEvent}
        handleSubscribe={handleiCalExport}
        authHeaders={authHeaders}
        user={user}
        postableGroups={editEventGroups}
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
        groups={postableGroups}
        selectedGroupId={selectedGroupId}
        setSelectedGroupId={setSelectedGroupId}
        onSubmit={handleAddEventSubmit}
      />

      <GroupSettingsModal 
        isOpen={personalizationOpen}
        onOpenChange={setPersonalizationOpen}
        group={allGroups.find(g => g.id === editingGroupId) || null}
        loading={groupLoading}
        handleSavePersonalization={(e) => handleSavePersonalization(e, allGroups.find(g => g.id === editingGroupId) || null, (groupId) => {
          setPersonalizationOpen(false);
          setActiveGroupId(groupId);
        })}
      />

      <CreateGroupModal
        isOpen={isGroupModalOpen}
        onOpenChange={setIsGroupModalOpen}
        handleCreateGroup={(e) => handleCreateGroup(e, () => setIsGroupModalOpen(false))}
        handleApplyOfficialCalendar={(e) =>
          handleApplyOfficialCalendar(e, async () => {
            setIsGroupModalOpen(false);
            await checkAuth();
          })
        }
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

      <GroupDetailModal
        isOpen={isGroupDetailOpen}
        onOpenChange={setIsGroupDetailOpen}
        groupId={detailGroupId}
        groupPrefs={allGroups.find(g => g.id === detailGroupId) ?? null}
        authHeaders={authHeaders}
        isFollowing={followedGroups.some(g => g.id === detailGroupId)}
        onOpenPersonalization={(groupId) => {
          setEditingGroupId(groupId);
          setPersonalizationOpen(true);
        }}
      />

      <NewsModal 
        isOpen={isNewsOpen}
        onOpenChange={setIsNewsOpen}
      />

      <NoticeDialogs
        officialApplicationNotice={officialApplicationNotice}
        setOfficialApplicationNotice={setOfficialApplicationNotice}
        officialCalendarName={user?.official_application?.calendar_name}
        disputeWarning={disputeWarning}
        setDisputeWarning={setDisputeWarning}
      />
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
