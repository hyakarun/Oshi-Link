import React, { useState, useRef, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth, parseISO, setHours, setMinutes, differenceInMinutes, addMinutes } from 'date-fns';
import { Event, View } from '@/lib/types';
import { MapPin, Clock, Calendar } from 'lucide-react';

interface CalendarViewProps {
  view: View;
  currentMonth: Date;
  events: Event[];
  themeColor: string;
  getGroupColor: (groupId: string) => string;
  onEventClick: (event: Event) => void;
  onDateClick: (date: Date, startTime?: string, endTime?: string) => void;
}

const HOUR_HEIGHT = 80;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function CalendarView({
  view,
  currentMonth,
  events,
  getGroupColor,
  onEventClick,
  onDateClick
}: CalendarViewProps) {
  const [dragStart, setDragStart] = useState<{ day: Date; time: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ day: Date; time: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Time format helper (number of minutes to HH:mm)
  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.floor((minutes % 60) / 15) * 15; // Round to 15m
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const getTimeFromEvent = (e: MouseEvent | React.MouseEvent, rect: DOMRect) => {
    const y = e.clientY - rect.top;
    const totalMinutes = (y / HOUR_HEIGHT) * 60;
    return Math.max(0, Math.min(23 * 60 + 45, Math.floor(totalMinutes / 15) * 15));
  };

  const handleMouseDown = (e: React.MouseEvent, day: Date) => {
    if (gridRef.current) {
      const rect = gridRef.current.getBoundingClientRect();
      const time = getTimeFromEvent(e, rect);
      setDragStart({ day, time });
      setDragEnd({ day, time });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragStart && gridRef.current) {
      const rect = gridRef.current.getBoundingClientRect();
      const time = getTimeFromEvent(e, rect);
      setDragEnd({ day: dragStart.day, time });
    }
  };

  const handleMouseUp = () => {
    if (dragStart && dragEnd) {
      const start = Math.min(dragStart.time, dragEnd.time);
      const end = Math.max(dragStart.time, dragEnd.time) + 15; // At least 15m
      onDateClick(dragStart.day, formatTime(start), formatTime(end));
    }
    setDragStart(null);
    setDragEnd(null);
  };

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

  // Week & Day common Time Grid View
  const renderTimeGrid = (days: Date[]) => {
    return (
      <div className="flex flex-col h-full bg-white overflow-hidden select-none">
        {/* Header */}
        <div className="flex border-b border-gray-100 shrink-0">
          <div className="w-16 md:w-20 border-r border-gray-100 bg-gray-50/50" />
          <div className="flex-1 flex">
            {days.map(d => (
              <div key={d.toISOString()} className={`flex-1 p-4 text-center border-r border-gray-100 last:border-r-0 ${isSameDay(d, new Date()) ? 'bg-red-50/30' : ''}`}>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{format(d, 'EEE')}</p>
                <p className={`text-xl font-black ${isSameDay(d, new Date()) ? 'text-[#ff385c]' : 'text-[#222222]'}`}>{format(d, 'd')}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Grid Body */}
        <div className="flex-1 overflow-y-auto relative custom-scrollbar" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
          <div className="flex min-h-full" ref={gridRef}>
            {/* Time labels */}
            <div className="w-16 md:w-20 border-r border-gray-100 bg-gray-50/30 shrink-0">
              {HOURS.map(h => (
                <div key={h} className="relative" style={{ height: HOUR_HEIGHT }}>
                  <span className="absolute -top-2 left-0 right-0 text-center text-[9px] font-black text-gray-300">
                    {h === 0 ? '' : `${h.toString().padStart(2, '0')}:00`}
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            <div className="flex-1 flex relative">
              {/* Horizontal grid lines */}
              <div className="absolute inset-0 pointer-events-none">
                {HOURS.map(h => (
                  <div key={h} className="border-b border-gray-50" style={{ height: HOUR_HEIGHT }} />
                ))}
              </div>

              {days.map(day => {
                const dayEvents = events.filter(e => isSameDay(parseISO(e.date), day));
                return (
                  <div 
                    key={day.toISOString()} 
                    className="flex-1 relative border-r border-gray-100 last:border-r-0 group/col"
                    onMouseDown={(e) => handleMouseDown(e, day)}
                  >
                    {/* Event items */}
                    {dayEvents.map(e => {
                      const date = parseISO(e.date);
                      const startMins = date.getHours() * 60 + date.getMinutes();
                      
                      let duration = 60;
                      if (e.end_time) {
                        const endDate = parseISO(e.end_time);
                        duration = Math.max(15, differenceInMinutes(endDate, date));
                      }
                      
                      return (
                        <div
                          key={e.id}
                          onClick={(ev) => { ev.stopPropagation(); onEventClick(e); }}
                          className="absolute left-1 right-1 rounded-xl border shadow-sm p-2 overflow-hidden transition-all hover:shadow-lg hover:z-10 cursor-pointer active:scale-[0.98]"
                          style={{
                            top: (startMins / 60) * HOUR_HEIGHT,
                            height: (duration / 60) * HOUR_HEIGHT,
                            backgroundColor: `${getGroupColor(e.group_id)}15`,
                            borderColor: `${getGroupColor(e.group_id)}40`,
                            borderLeft: `4px solid ${getGroupColor(e.group_id)}`
                          }}
                        >
                          <p className="text-[10px] font-black truncate leading-none mb-1" style={{ color: getGroupColor(e.group_id) }}>
                            {format(date, 'HH:mm')}
                          </p>
                          <p className="text-[11px] font-black text-[#222222] line-clamp-2 leading-tight">
                            {e.title}
                          </p>
                        </div>
                      );
                    })}

                    {/* Drag selection overlay */}
                    {dragStart && isSameDay(dragStart.day, day) && dragEnd && (
                      <div 
                        className="absolute left-0 right-0 bg-[#ff385c]/10 border-2 border-[#ff385c] border-dashed rounded-xl z-20 pointer-events-none"
                        style={{
                          top: (Math.min(dragStart.time, dragEnd.time) / 60) * HOUR_HEIGHT,
                          height: (Math.abs(dragStart.time - dragEnd.time) + 15) / 60 * HOUR_HEIGHT
                        }}
                      >
                        <div className="absolute top-1 left-2 bg-[#ff385c] text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm">
                          {formatTime(Math.min(dragStart.time, dragEnd.time))} - {formatTime(Math.max(dragStart.time, dragEnd.time) + 15)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (view === 'week') {
    const startDate = startOfWeek(currentMonth);
    const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
    return renderTimeGrid(days);
  }

  if (view === 'day') {
    return renderTimeGrid([currentMonth]);
  }

  return null;
}
