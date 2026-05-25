import React from 'react';
import { Calendar, Star, Users, Search, Trash2, Palette, ChevronRight, Menu, X, Bell, Share2, Sun, Moon, Laptop, BookOpen, ExternalLink, ShieldCheck } from 'lucide-react';
import { Group, User, View } from '@/lib/types';
import { GroupAvatar, groupColorSolid } from '@/components/ui/shared';
import { useTheme } from '@/components/ThemeProvider';

interface SidebarProps {
  user: User | null;
  followedGroups: Group[];
  activeGroupId: string;
  setActiveGroupId: (id: string) => void;
  themeColor: string;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  setIsProfileModalOpen: (open: boolean) => void;
  setIsDiscoverOpen: (open: boolean) => void;
  setEditingGroupId: (id: string | null) => void;
  setPersonalizationOpen: (open: boolean) => void;
  handleUnfollow: (groupId: string) => void;
  allGroups: Group[];
  view: View;
  setView: (view: View) => void;
  setIsNewsOpen: (open: boolean) => void;
  hasNewNews: boolean;
  onGroupIconClick?: (groupId: string) => void;
}

export function Sidebar({
  user,
  followedGroups,
  activeGroupId,
  setActiveGroupId,
  themeColor,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  setIsProfileModalOpen,
  setIsDiscoverOpen,
  setEditingGroupId,
  setPersonalizationOpen,
  handleUnfollow,
  allGroups,
  view,
  setView,
  setIsNewsOpen,
  hasNewNews,
  onGroupIconClick
}: SidebarProps) {
  const { theme, setTheme } = useTheme();

  function getGroupColor(groupId: string) {
    const g = allGroups.find(item => item.id === groupId);
    return g?.custom_theme_color || groupColorSolid(groupId);
  }

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const getThemeIcon = () => {
    if (theme === 'light') return <Sun className="w-3.5 h-3.5" />;
    if (theme === 'dark') return <Moon className="w-3.5 h-3.5" />;
    return <Laptop className="w-3.5 h-3.5" />;
  };

  const getThemeLabel = () => {
    if (theme === 'light') return 'ライト';
    if (theme === 'dark') return 'ダーク';
    return '自動';
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-[45] md:hidden transition-all duration-500"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-50 w-[280px] bg-white dark:bg-card border-r border-gray-100 dark:border-border flex flex-col 
        transition-all duration-500 ease-out shadow-2xl md:shadow-none h-screen
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-border flex items-center gap-3">
          <div 
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md" 
            style={{ background: 'linear-gradient(135deg, #EA4335 0%, #FBBC05 33%, #34A853 66%, #4285F4 100%)' }}
          >
            <Calendar className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-[#222222] dark:text-zinc-100 tracking-tight">Oshi-Link</p>
            <div className="flex items-center gap-1 min-w-0">
              <p className="text-[10px] text-gray-400 dark:text-zinc-400 font-medium truncate max-w-[120px]">
                {user ? user.name : 'ログインしていません'}
              </p>
              {user && (user.is_official || (activeGroupId !== '0' && user.official_groups?.includes(activeGroupId))) && (
                <ShieldCheck className="w-3 h-3 text-[#6366f1] fill-indigo-100 dark:fill-indigo-950/40 shrink-0" />
              )}
            </div>
          </div>
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-secondary flex items-center justify-center text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-accent transition-all shrink-0 overflow-hidden"
          >
            {user ? (
              user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-400 to-gray-500 text-white text-[10px] font-black">
                  {user.name[0]}
                </div>
              )
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* View Switcher (Mobile Only) */}
        <div className="px-3 pt-4 md:hidden">
          <div className="flex bg-gray-100 dark:bg-secondary p-1 rounded-xl">
            {(['month', 'week', 'day'] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex-1 py-2 rounded-lg text-[11px] font-black transition-all ${
                  view === v ? 'bg-white dark:bg-accent text-[#222222] dark:text-zinc-100 shadow-sm' : 'text-gray-400 dark:text-zinc-400 hover:text-gray-600 dark:hover:text-zinc-200'
                }`}
              >
                {v === 'month' ? '月' : v === 'week' ? '週' : '日'}
              </button>
            ))}
          </div>
        </div>

        {/* ALL toggle */}
        <div className="px-3 pt-3">
          <button
            onClick={() => { setActiveGroupId('0'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-bold text-sm ${
              activeGroupId === '0'
                ? 'text-[#222222] dark:text-zinc-100 bg-gray-50 dark:bg-secondary/30'
                : 'text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-secondary/30'
            }`}
            style={activeGroupId === '0' ? { backgroundColor: `${themeColor}15`, color: themeColor } : {}}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              activeGroupId === '0' ? '' : 'bg-gray-100 dark:bg-secondary text-gray-400 dark:text-zinc-500'
            }`} style={activeGroupId === '0' ? { backgroundColor: themeColor, color: 'white' } : {}}>
              <Star className="w-3.5 h-3.5" />
            </div>
            全ての予定
          </button>
        </div>

        {/* Section label */}
        <div className="px-5 pt-4 pb-1 flex items-center justify-between">
          <p className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.15em]">追っているカレンダー</p>
        </div>

        {/* Followed groups list */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {followedGroups.length === 0 ? (
            <div className="p-5 text-center">
              <div className="w-12 h-12 bg-gray-100 dark:bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-gray-300 dark:text-zinc-600" />
              </div>
              <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 mb-1">フォロー中なし</p>
              <p className="text-[10px] text-gray-300 dark:text-zinc-600 mb-3 leading-relaxed whitespace-nowrap">推しグループのカレンダーをフォローしよう</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {followedGroups.map(g => {
                const isActive = activeGroupId === g.id;
                return (
                  <div
                    key={g.id}
                    onClick={() => { setActiveGroupId(g.id); setIsMobileMenuOpen(false); }}
                    className={`group w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all cursor-pointer ${
                      isActive ? 'bg-gray-50 dark:bg-secondary/30' : 'hover:bg-gray-50 dark:hover:bg-secondary/30'
                    }`}
                    style={isActive ? { backgroundColor: `${getGroupColor(g.id)}12` } : {}}
                  >
                    <div
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onGroupIconClick?.(g.id);
                      }}
                      className="cursor-pointer hover:scale-105 transition-transform"
                      title="カレンダー詳細を表示"
                    >
                      <GroupAvatar group={g} size="sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[12px] font-black truncate ${
                        !isActive ? 'text-[#222222] dark:text-zinc-100' : 'text-gray-400 dark:text-zinc-500'
                      }`} style={isActive ? { color: getGroupColor(g.id) } : {}}>{g.name}</p>
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500">
                        {g.event_count || 0}件 · {g.follower_count || 0}人
                      </p>
                    </div>
                    <div className="flex items-center shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity gap-1 md:gap-0.5">
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          const url = `${window.location.origin}/?group=${g.id}`;
                          if (navigator.share) {
                            navigator.share({ title: 'Oshi-Link', text: `${g.name}のカレンダーを共有！`, url });
                          } else {
                            navigator.clipboard.writeText(url);
                            alert('共有URLをコピーしました！');
                          }
                        }}
                        className="p-1.5 md:p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-accent"
                        title="カレンダーを共有"
                      >
                        <Share2 className="w-3.5 h-3.5 md:w-3 md:h-3 text-gray-400 dark:text-zinc-500" />
                      </button>

                      <button
                        onClick={(ev) => { ev.stopPropagation(); handleUnfollow(g.id); }}
                        className="p-1.5 md:p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-300 dark:text-zinc-650 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        title="カレンダーを削除"
                      >
                        <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-3 py-4 border-t border-gray-100 dark:border-border space-y-2">
          <div className="flex gap-2">
            {/* Note Manual Link */}
            <a
              href="https://note.com/tsukuro_team/n/nad616c182cc9"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex-1 flex items-center justify-between px-3 h-11 bg-gray-50 dark:bg-secondary/50 hover:bg-gray-100 dark:hover:bg-secondary text-gray-600 dark:text-zinc-300 rounded-xl font-bold text-[11px] transition-all group"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <BookOpen className="w-3.5 h-3.5 group-hover:text-emerald-500 shrink-0" />
                <span className="truncate">使い方</span>
              </div>
              <ExternalLink className="w-3 h-3 text-gray-400 dark:text-zinc-400 group-hover:text-gray-500 shrink-0" />
            </a>

            <button
              onClick={() => { setIsNewsOpen(true); setIsMobileMenuOpen(false); }}
              className="flex-1 flex items-center justify-between px-3 h-11 bg-gray-50 dark:bg-secondary/50 hover:bg-gray-100 dark:hover:bg-secondary text-gray-600 dark:text-zinc-300 rounded-xl font-bold text-[11px] transition-all group"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Bell className="w-3.5 h-3.5 group-hover:text-blue-500 shrink-0" />
                <span className="truncate">お知らせ</span>
              </div>
              {hasNewNews && (
                <span className="bg-gradient-to-r from-[#EA4335] to-[#4285F4] text-white text-[8px] font-black px-1.5 py-0.5 rounded-full animate-bounce shadow-sm shrink-0">New!</span>
              )}
            </button>
          </div>

          <button
            onClick={() => { setIsDiscoverOpen(true); setIsMobileMenuOpen(false); }}
            className="w-full flex items-center justify-center gap-2 h-11 border-2 border-[#6366f1] text-[#6366f1] dark:text-indigo-400 dark:border-indigo-500 rounded-xl font-black text-[11px] hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all active:scale-[0.98] group"
          >
            <Search className="w-3.5 h-3.5" /> 
            <span>カレンダーを探す</span>
          </button>

          <div className="pt-2 text-center flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[8px] font-black uppercase tracking-tighter border border-indigo-100/50 dark:border-indigo-900/30">
              <span className="relative flex h-1 w-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1 w-1 bg-indigo-500"></span>
              </span>
              Beta Test
            </div>
            <p className="text-[9px] text-gray-300 dark:text-zinc-650 font-bold tracking-widest uppercase">v1.0.3-refreshed</p>
          </div>
        </div>
      </aside>
    </>
  );
}
