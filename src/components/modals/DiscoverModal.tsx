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
      <DialogContent className="max-w-[95vw] lg:max-w-7xl w-full p-0 overflow-hidden border-none rounded-[32px] bg-white shadow-2xl">
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

        <div className="overflow-y-auto max-h-[70vh]">
          {discoverFiltered.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-400 font-bold">見つかりませんでした</p>
              <button
                onClick={openCreateGroup}
                className="mt-4 text-[#ff385c] font-bold text-sm hover:underline"
              >
                新しくカレンダーを作成する →
              </button>
            </div>
          ) : (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {discoverFiltered.map(g => (
                <div
                  key={g.id}
                  className={`flex items-center gap-4 p-4 rounded-2xl transition-all border ${g.is_following ? 'bg-[#fff0f3] border-[#ff385c] border-opacity-20' : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
                >
                  <GroupAvatar group={g} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-[#222222] truncate text-sm">{g.name}</h3>
                      {g.is_following && (
                        <Badge className="bg-[#ff385c] text-white border-none text-[8px] px-1.5 py-0 shrink-0">フォロー中</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[9px] text-gray-400 font-bold flex items-center gap-1">
                        <Users className="w-3 h-3" /> {g.follower_count || 0}人
                      </span>
                      <span className="text-[9px] text-gray-400 font-bold flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {g.event_count || 0}件
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {g.is_following && (
                      <button
                        onClick={() => handleSubscribe(g.id)}
                        className="p-1 round-xl hover:bg-white/50 transition-all"
                        title="iCalに追加"
                      >
                        <Bell className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    )}
                    <Button
                      onClick={() => handleFollowToggle(g)}
                      disabled={followLoading === g.id}
                      className={`h-8 px-3 rounded-xl font-bold text-xs transition-all ${
                        g.is_following
                          ? 'bg-white border text-gray-400 hover:text-red-500 hover:border-red-500'
                          : 'bg-[#ff385c] text-white hover:bg-[#e00b41]'
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
        
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-sm text-gray-500">{discoverFiltered.length}件のカレンダー</p>
          <Button
            onClick={openCreateGroup}
            variant="outline"
            className="rounded-xl h-9 px-4 text-sm font-bold border-gray-200"
          >
            <Plus className="w-4 h-4 mr-1" /> 新規作成
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
