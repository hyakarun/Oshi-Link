import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ShieldCheck, Calendar, Users, Loader2, MapPin, Clock, Info } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { GroupAvatar } from '@/components/ui/shared';

type UpcomingEvent = {
  id: string;
  title: string;
  date: string;
  location: string | null;
};

type GroupDetail = {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_at: string;
  is_official: boolean;
  follower_count: number;
  event_count: number;
};

type GroupDetailModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string | null;
  authHeaders?: () => Record<string, string>;
};

export function GroupDetailModal({
  isOpen,
  onOpenChange,
  groupId,
  authHeaders
}: GroupDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);

  useEffect(() => {
    if (!isOpen || !groupId) {
      setDetail(null);
      setUpcomingEvents([]);
      return;
    }

    async function fetchDetail() {
      setLoading(true);
      try {
        const headers = authHeaders ? authHeaders() : {};
        const res = await fetch(`/api/groups/detail?group_id=${groupId}`, { headers });
        if (res.ok) {
          const data = await res.json() as { group: GroupDetail; upcoming_events: UpcomingEvent[] };
          setDetail(data.group);
          setUpcomingEvents(data.upcoming_events);
        }
      } catch (e) {
        console.error('Failed to fetch group details:', e);
      }
      setLoading(false);
    }

    fetchDetail();
  }, [isOpen, groupId, authHeaders]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-white dark:bg-zinc-900 border-none rounded-[32px] shadow-2xl p-0 overflow-hidden bottom-0 sm:bottom-auto top-auto sm:top-1/2 translate-y-0 sm:-translate-y-1/2 transition-all duration-500">
        <div className="h-[520px] flex flex-col">
          {/* Header */}
          <div className="p-6 bg-gray-50 dark:bg-zinc-800 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-4 shrink-0">
            {detail ? (
              <GroupAvatar group={detail} size="md" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-zinc-700 animate-pulse shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              {detail ? (
                <>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <DialogTitle className="text-lg sm:text-xl font-black text-[#222222] dark:text-zinc-100 truncate tracking-tight">{detail.name}</DialogTitle>
                    {detail.is_official && (
                      <ShieldCheck className="w-5 h-5 text-[#6366f1] fill-indigo-100 dark:fill-indigo-950/40 shrink-0" />
                    )}
                  </div>
                  <DialogDescription className="text-gray-400 dark:text-zinc-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-0.5">
                    {detail.is_official ? '公式カレンダー' : '共有カレンダー'}
                  </DialogDescription>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="h-5 w-40 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" />
                  <div className="h-3.5 w-24 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" />
                </div>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 py-12">
                <Loader2 className="animate-spin h-8 w-8 text-[#6366f1]" />
                <p className="text-xs font-bold text-gray-400 dark:text-zinc-500">カレンダー詳細を取得中...</p>
              </div>
            ) : detail ? (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Description */}
                <div className="space-y-1.5">
                  <h3 className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-[#6366f1]" /> カレンダーの概要
                  </h3>
                  <div className="p-4 bg-gray-50 dark:bg-zinc-800/40 rounded-2xl border border-gray-100 dark:border-zinc-800/30">
                    <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed font-medium whitespace-pre-wrap">
                      {detail.description || 'このカレンダーの説明はありません。'}
                    </p>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-gray-50 dark:bg-zinc-800/40 rounded-2xl border border-gray-100 dark:border-zinc-800/30 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-[#6366f1] shadow-sm">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 leading-none mb-1">フォロワー数</p>
                      <p className="text-sm font-black text-[#222222] dark:text-zinc-100">{detail.follower_count}人</p>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-zinc-800/40 rounded-2xl border border-gray-100 dark:border-zinc-800/30 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-[#6366f1] shadow-sm">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 leading-none mb-1">登録イベント数</p>
                      <p className="text-sm font-black text-[#222222] dark:text-zinc-100">{detail.event_count}件</p>
                    </div>
                  </div>
                </div>

                {/* Creation Date */}
                <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-zinc-500 font-bold px-2">
                  <span>カレンダー作成日</span>
                  <span>{format(parseISO(detail.created_at), 'yyyy年MM月dd日')}</span>
                </div>

                {/* Upcoming Events */}
                <div className="space-y-2 border-t border-gray-100 dark:border-zinc-800 pt-5">
                  <h3 className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">近日中の予定 (直近3件)</h3>
                  <div className="space-y-2">
                    {upcomingEvents.length > 0 ? (
                      upcomingEvents.map(event => {
                        const dateObj = parseISO(event.date);
                        return (
                          <div 
                            key={event.id} 
                            className="p-3 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-xl flex items-start gap-3 shadow-sm hover:border-gray-250 dark:hover:border-zinc-700 transition-colors"
                          >
                            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 px-2 py-1.5 rounded-lg text-center shrink-0 min-w-[50px] border border-indigo-100/30">
                              <p className="text-[9px] font-black text-[#6366f1] leading-none mb-1">{format(dateObj, 'M/d')}</p>
                              <p className="text-[8px] font-bold text-gray-400 dark:text-zinc-500 leading-none">{format(dateObj, 'HH:mm')}</p>
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-black text-[#222222] dark:text-zinc-100 truncate leading-snug">{event.title}</h4>
                              {event.location && (
                                <p className="text-[9px] text-gray-400 dark:text-zinc-500 font-medium flex items-center gap-1 mt-1 truncate">
                                  <MapPin className="w-2.5 h-2.5 text-gray-300" /> {event.location}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-6 text-center bg-gray-50 dark:bg-zinc-800/20 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800/40">
                        <Calendar className="w-8 h-8 text-gray-200 dark:text-zinc-850 mx-auto mb-2" />
                        <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold">近日中の予定はありません</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2 py-12 text-center">
                <p className="text-sm font-bold text-gray-400 dark:text-zinc-500">カレンダーの情報を読み込めませんでした</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
