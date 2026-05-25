import React from 'react';
import { format, isAfter, isToday, parseISO, startOfDay } from 'date-fns';
import { ChevronRight, Calendar, MapPin, Clock } from 'lucide-react';
import { Event } from '@/lib/types';

interface RightPanelProps {
  isOpen: boolean;
  onClose: () => void;
  events: Event[];
  getGroupColor: (groupId: string) => string;
  onEventClick: (event: Event) => void;
}

export function RightPanel({
  isOpen,
  onClose,
  events,
  getGroupColor,
  onEventClick
}: RightPanelProps) {
  // 今日以降の予定をフィルタリングしてソート
  const upcomingEvents = events
    .filter(e => {
      const d = parseISO(e.date);
      return isToday(d) || isAfter(d, startOfDay(new Date()));
    })
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

  return (
    <>
      {/* Mobile Backdrop */}
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/10 dark:bg-black/40 backdrop-blur-sm z-[45] md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed md:relative inset-y-0 right-0 z-50 w-full sm:w-80 bg-white dark:bg-card border-l border-gray-100 dark:border-border flex flex-col 
        transition-all duration-500 ease-out shadow-2xl md:shadow-none h-screen
        ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-full md:hidden'}
      `}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-secondary flex items-center justify-center text-[#6366f1]">
              <Calendar className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-black text-[#222222] dark:text-zinc-100 uppercase tracking-widest">予定一覧</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-secondary rounded-xl text-gray-400 dark:text-muted-foreground transition-all"
            title="予定一覧を閉じる"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {upcomingEvents.length === 0 ? (
            <div className="py-20 text-center">
              <Calendar className="w-12 h-12 text-gray-100 dark:text-muted mx-auto mb-4" />
              <p className="text-xs font-bold text-gray-300 dark:text-zinc-650">近日中の予定はありません</p>
            </div>
          ) : (
            upcomingEvents.map((e, i) => {
              const d = parseISO(e.date);
              const showDate = i === 0 || format(parseISO(upcomingEvents[i-1].date), 'yyyyMMdd') !== format(d, 'yyyyMMdd');

              return (
                <div key={e.id} className="space-y-3">
                  {showDate && (
                    <div className="flex items-center gap-2 px-2">
                      <span className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em]">
                        {format(d, 'M月d日')}
                      </span>
                      <div className="flex-1 h-[1px] bg-gray-50 dark:bg-border/60" />
                    </div>
                  )}
                  
                  <div 
                    onClick={() => onEventClick(e)}
                    className="group p-4 bg-white dark:bg-secondary border border-gray-100 dark:border-border rounded-2xl hover:border-gray-200 dark:hover:border-muted-foreground/40 hover:shadow-sm transition-all cursor-pointer active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getGroupColor(e.group_id) }} />
                      <span className="text-[10px] font-black" style={{ color: getGroupColor(e.group_id) }}>
                        {format(d, 'HH:mm')}
                      </span>
                    </div>
                    
                    <h3 className="text-xs font-black text-[#222222] dark:text-zinc-100 mb-2 leading-tight group-hover:text-[#6366f1] transition-colors line-clamp-2">
                      {e.title}
                    </h3>

                    {e.location && (
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-zinc-500 font-bold">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{e.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
}
