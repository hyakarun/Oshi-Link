import React from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth, parseISO } from 'date-fns';
import { Event, View } from '@/lib/types';
import { groupColorSolid } from '@/components/ui/shared';
import { MapPin, Clock, Calendar } from 'lucide-react';

interface CalendarViewProps {
  view: View;
  currentMonth: Date;
  events: Event[];
  themeColor: string;
  getGroupColor: (groupId: string) => string;
  onEventClick: (event: Event) => void;
  onDateClick: (date: Date) => void;
}

export function CalendarView({
  view,
  currentMonth,
  events,
  getGroupColor,
  onEventClick,
  onDateClick
}: CalendarViewProps) {
  
  if (view === 'month') {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const d = new Date(day);
        const dayEvents = events.filter(e => isSameDay(parseISO(e.date), d));
        days.push(
          <div
            key={d.toISOString()}
            onClick={() => onDateClick(d)}
            className={`min-h-[100px] md:min-h-[120px] p-2 border-r border-b border-gray-100 transition-colors cursor-pointer group hover:bg-gray-50/50 ${
              !isSameMonth(d, monthStart) ? 'bg-gray-50/30' : ''
            }`}
          >
            <div className="flex justify-between items-start mb-1">
              <span className={`text-[10px] md:text-xs font-black ${
                isSameDay(d, new Date()) 
                  ? 'bg-[#ff385c] text-white w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full' 
                  : !isSameMonth(d, monthStart) ? 'text-gray-300' : 'text-[#222222]'
              }`}>
                {format(d, 'd')}
              </span>
            </div>
            <div className="space-y-1">
              {dayEvents.slice(0, 4).map(e => (
                <div
                  key={e.id}
                  onClick={(ev) => { ev.stopPropagation(); onEventClick(e); }}
                  className="px-1.5 py-0.5 md:py-1 rounded md:rounded-md text-[8px] md:text-[10px] font-bold truncate transition-all active:scale-[0.97] hover:brightness-95 border-l-2 shadow-sm"
                  style={{ 
                    backgroundColor: `${getGroupColor(e.group_id)}15`, 
                    color: getGroupColor(e.group_id),
                    borderLeftColor: getGroupColor(e.group_id)
                  }}
                >
                  {e.title}
                </div>
              ))}
              {dayEvents.length > 4 && (
                <div className="text-[8px] md:text-[9px] text-gray-400 font-bold pl-1">
                  他 {dayEvents.length - 4} 件...
                </div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toISOString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="bg-white">{rows}</div>;
  }

  if (view === 'week') {
    const startDate = startOfWeek(currentMonth);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(startDate, i);
      const dayEvents = events.filter(e => isSameDay(parseISO(e.date), d));
      days.push(
        <div key={d.toISOString()} className="flex-1 min-w-0 border-r border-gray-100 last:border-r-0 flex flex-col h-full bg-white">
          <div className={`p-4 text-center border-b border-gray-100 ${isSameDay(d, new Date()) ? 'bg-red-50/50' : ''}`}>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{format(d, 'EEE')}</p>
            <p className={`text-xl font-black ${isSameDay(d, new Date()) ? 'text-[#ff385c]' : 'text-[#222222]'}`}>{format(d, 'd')}</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {dayEvents.map(e => (
              <div
                key={e.id}
                onClick={() => onEventClick(e)}
                className="p-3 rounded-2xl border-2 transition-all cursor-pointer hover:shadow-md active:scale-[0.98]"
                style={{ 
                  backgroundColor: `${getGroupColor(e.group_id)}08`,
                  borderColor: `${getGroupColor(e.group_id)}20`
                }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getGroupColor(e.group_id) }} />
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: getGroupColor(e.group_id) }}>
                    {format(parseISO(e.date), 'HH:mm')}
                  </span>
                </div>
                <p className="text-xs font-black text-[#222222] leading-tight mb-2">{e.title}</p>
                {e.location && (
                  <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{e.location}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }
    return <div className="flex h-full overflow-hidden bg-gray-50">{days}</div>;
  }

  if (view === 'day') {
    const dayEvents = events.filter(e => isSameDay(parseISO(e.date), currentMonth));
    return (
      <div className="h-full overflow-y-auto bg-white p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-sm font-black text-[#ff385c] uppercase tracking-widest mb-1">{format(currentMonth, 'EEEE')}</p>
              <h2 className="text-4xl font-black text-[#222222]">{format(currentMonth, 'M月d日')}</h2>
            </div>
            <div className="bg-gray-100 px-4 py-2 rounded-2xl">
              <span className="text-xs font-black text-gray-500">{dayEvents.length} 件の予定</span>
            </div>
          </div>
          {dayEvents.length === 0 ? (
            <div className="py-20 text-center bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-100">
              <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-400 font-bold text-sm">この日の予定はありません</p>
            </div>
          ) : (
            dayEvents.map(e => (
              <div
                key={e.id}
                onClick={() => onEventClick(e)}
                className="group relative bg-white p-6 rounded-[32px] border-2 border-gray-50 hover:border-gray-100 transition-all cursor-pointer hover:shadow-xl active:scale-[0.99]"
              >
                <div className="flex items-start gap-6">
                  <div className="pt-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4" style={{ color: getGroupColor(e.group_id) }} />
                      <span className="text-sm font-black" style={{ color: getGroupColor(e.group_id) }}>
                        {format(parseISO(e.date), 'HH:mm')}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-[#222222] mb-2 group-hover:text-[#ff385c] transition-colors">{e.title}</h3>
                    {e.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-400 font-bold">
                        <MapPin className="w-4 h-4" />
                        <span>{e.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return null;
}
