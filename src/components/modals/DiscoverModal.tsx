import React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, Users, Bell, Loader2, Plus } from 'lucide-react';
import { Group } from '@/lib/types';
import { GroupAvatar } from '@/components/ui/shared';

type DiscoverModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  discoverSearch: string;
  setDiscoverSearch: (search: string) => void;
  allGroups: Group[];
  followLoading: string | null;
  handleFollowToggle: (group: Group) => void;
  handleSubscribe: (groupId: string) => void;
  openCreateGroup: () => void;
};

export function DiscoverModal({
  isOpen,
  onOpenChange,
  discoverSearch,
  setDiscoverSearch,
  allGroups,
  followLoading,
  handleFollowToggle,
  handleSubscribe,
  openCreateGroup
}: DiscoverModalProps) {
  const discoverFiltered = allGroups.filter(g =>
    g.name.toLowerCase().includes(discoverSearch.toLowerCase()) ||
    (g.description || '').toLowerCase().includes(discoverSearch.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-7xl w-full p-0 overflow-hidden border-none rounded-[32px] bg-white dark:bg-zinc-900 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-zinc-800 shrink-0">
          <DialogTitle className="text-xl sm:text-2xl font-black text-[#222222] dark:text-zinc-100 tracking-tight mb-1">カレンダーを探す</DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-zinc-400 text-[11px] sm:text-sm">
            推しのグループカレンダーをフォローして、予定を見逃さないようにしよう
          </DialogDescription>
          <div className="mt-3 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="グループ名で検索..."
              value={discoverSearch}
              onChange={e => setDiscoverSearch(e.target.value)}
              className="w-full h-11 bg-gray-50 dark:bg-zinc-800 rounded-xl pl-10 pr-4 outline-none border-none focus:ring-2 focus:ring-[#6366f1] font-medium text-[#222222] dark:text-zinc-100 text-sm"
            />
          </div>

          {/* サービス説明 */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { icon: <Users className="w-4 h-4" />, title: "コミュニティ管理", desc: "みんなで情報を更新。最新の予定が分かります。" },
              { icon: <Bell className="w-4 h-4" />, title: "通知でリマインド", desc: "イベント開始前に通知。見逃しを防止します。" },
              { icon: <Calendar className="w-4 h-4" />, title: "情報の正確性", desc: "みんなでチェックして正確な情報を維持。" },
            ].map((f, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-zinc-850/50 border border-gray-100/50 dark:border-zinc-800/30">
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center text-[#6366f1] shadow-sm shrink-0">
                  {f.icon}
                </div>
                <div>
                  <h3 className="text-[11px] font-black text-[#222222] dark:text-zinc-100">{f.title}</h3>
                  <p className="text-[9px] text-gray-400 dark:text-zinc-550 font-medium leading-tight mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
          {discoverFiltered.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-400 dark:text-zinc-500 font-bold text-sm">見つかりませんでした</p>
              <button
                onClick={openCreateGroup}
                className="mt-2 text-[#6366f1] font-bold text-xs hover:underline"
              >
                新しくカレンダーを作成する →
              </button>
            </div>
          ) : (
            <div className="p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3">
              {discoverFiltered.map(g => (
                <div
                  key={g.id}
                  className={`flex items-center gap-3 p-2.5 sm:p-3 rounded-xl transition-all border ${g.is_following ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-[#6366f1] dark:border-indigo-900/30 border-opacity-20' : 'bg-white dark:bg-zinc-850 border-gray-100 dark:border-zinc-800 hover:border-gray-200 dark:hover:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800/60'}`}
                >
                  <GroupAvatar group={g} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-black text-[#222222] dark:text-zinc-100 truncate text-xs sm:text-sm max-w-[100px] sm:max-w-none">{g.name}</h3>
                      {g.is_following && (
                        <Badge className="bg-[#6366f1] text-white border-none text-[7px] px-1 py-0 shrink-0">フォロー中</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[8px] text-gray-400 dark:text-zinc-500 font-bold flex items-center gap-1 whitespace-nowrap">
                        <Users className="w-2.5 h-2.5" /> {g.follower_count || 0}
                      </span>
                      <span className="text-[8px] text-gray-400 dark:text-zinc-500 font-bold flex items-center gap-1 whitespace-nowrap">
                        <Calendar className="w-2.5 h-2.5" /> {g.event_count || 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-auto">
                    <Button
                      onClick={() => handleFollowToggle(g)}
                      disabled={followLoading === g.id}
                      className={`h-7 px-2.5 rounded-lg font-black text-[10px] transition-all ${
                        g.is_following
                          ? 'bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-400 dark:text-zinc-400 hover:text-red-500 hover:border-red-500'
                          : 'bg-[#6366f1] text-white hover:bg-[#e00b41]'
                      }`}
                    >
                      {followLoading === g.id ? (
                        <Loader2 className="animate-spin h-3 w-3" />
                      ) : g.is_following ? '解除' : 'フォロー'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-850 flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-zinc-400">{discoverFiltered.length}件のカレンダー</p>
          <Button
            onClick={openCreateGroup}
            variant="outline"
            className="rounded-xl h-9 px-4 text-sm font-bold border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-350"
          >
            <Plus className="w-4 h-4 mr-1" /> 新規作成
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
