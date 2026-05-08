'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameDay, isSameMonth, parseISO, differenceInMinutes
} from 'date-fns';
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

const HOUR_HEIGHT = 80; // px per hour
const HOURS = Array.from({ length: 24 }, (_, i) => i);

/** 分 → "HH:mm" 変換（15分単位に丸める） */
const minsToTime = (totalMins: number) => {
  const clamped = Math.max(0, Math.min(23 * 60 + 45, Math.floor(totalMins / 15) * 15));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

/** スクロールコンテナ + グリッド上端からの Y 座標を分に変換 */
const yToMins = (y: number) => {
  const totalMins = (y / HOUR_HEIGHT) * 60;
  return Math.max(0, Math.min(23 * 60 + 45, Math.floor(totalMins / 15) * 15));
};

// ──────────────────────────────────────────────────────────
// Time Grid (Week / Day) Component
// ──────────────────────────────────────────────────────────
function TimeGrid({
  days,
  events,
  getGroupColor,
  onEventClick,
  onDateClick,
}: {
  days: Date[];
  events: Event[];
  getGroupColor: (gid: string) => string;
  onEventClick: (e: Event) => void;
  onDateClick: (date: Date, startTime?: string, endTime?: string) => void;
}) {
  // dragState stores: which day, start minute, current minute
  const [drag, setDrag] = useState<{
    day: Date;
    startMin: number;
    currentMin: number;
    active: boolean;
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null);

  // グリッド本体の最上部から相対的な Y 座標（スクロール込み）を取得
  const getRelativeY = useCallback((clientY: number) => {
    if (!columnsRef.current) return 0;
    const rect = columnsRef.current.getBoundingClientRect();
    const scrollTop = scrollRef.current?.scrollTop ?? 0;
    return clientY - rect.top + scrollTop;
  }, []);

  // ドラッグ中に window 全体でマウス移動・解放を捕捉
  useEffect(() => {
    if (!drag?.active) return;

    const onMove = (e: MouseEvent) => {
      const y = getRelativeY(e.clientY);
      setDrag(prev => prev ? { ...prev, currentMin: yToMins(y) } : null);
    };

    const onUp = () => {
      setDrag(prev => {
        if (!prev) return null;
        const start = Math.min(prev.startMin, prev.currentMin);
        const end = Math.max(prev.startMin, prev.currentMin) + 15;
        onDateClick(prev.day, minsToTime(start), minsToTime(end));
        return null;
      });
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [drag?.active, getRelativeY, onDateClick]);

  // 各列のマウスダウン
  const handleMouseDown = useCallback((e: React.MouseEvent, day: Date) => {
    e.preventDefault();
    const y = getRelativeY(e.clientY);
    const min = yToMins(y);
    setDrag({ day, startMin: min, currentMin: min, active: true });
  }, [getRelativeY]);

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden select-none">
      {/* ── Header ─────────────────────────────────── */}
      <div className="flex border-b border-gray-100 shrink-0 bg-white z-10">
        <div className="w-16 md:w-20 shrink-0 border-r border-gray-100" />
        <div className="flex-1 flex">
          {days.map(d => (
            <div
              key={d.toISOString()}
              className={`flex-1 py-3 text-center border-r border-gray-100 last:border-r-0 ${
                isSameDay(d, new Date()) ? 'bg-[#ff385c]/5' : ''
              }`}
            >
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                {format(d, 'EEE')}
              </p>
              <p className={`text-xl font-black ${isSameDay(d, new Date()) ? 'text-[#ff385c]' : 'text-[#222222]'}`}>
                {format(d, 'd')}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Scrollable Grid Body ────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
        <div className="flex" style={{ height: HOUR_HEIGHT * 24 }}>

          {/* Time labels */}
          <div className="w-16 md:w-20 shrink-0 border-r border-gray-100 relative">
            {HOURS.map(h => (
              <div
                key={h}
                className="absolute w-full border-t border-gray-100"
                style={{ top: h * HOUR_HEIGHT }}
              >
                {h !== 0 && (
                  <span className="absolute -top-2.5 right-2 text-[9px] font-bold text-gray-300 tabular-nums">
                    {`${h.toString().padStart(2, '0')}:00`}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div ref={columnsRef} className="flex-1 flex relative">
            {/* Horizontal hour lines (shared across all columns) */}
            <div className="absolute inset-0 pointer-events-none z-0">
              {HOURS.map(h => (
                <div
                  key={h}
                  className="absolute w-full border-t border-gray-100"
                  style={{ top: h * HOUR_HEIGHT }}
                />
              ))}
              {/* Half-hour lines */}
              {HOURS.map(h => (
                <div
                  key={`h-${h}`}
                  className="absolute w-full border-t border-gray-50"
                  style={{ top: h * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                />
              ))}
            </div>

            {days.map(day => {
              const dayEvents = events.filter(e => isSameDay(parseISO(e.date), day));
              const isDraggingHere = drag?.active && isSameDay(drag.day, day);
              const dragTopMin = drag ? Math.min(drag.startMin, drag.currentMin) : 0;
              const dragBottomMin = drag ? Math.max(drag.startMin, drag.currentMin) + 15 : 0;

              return (
                <div
                  key={day.toISOString()}
                  className="flex-1 relative border-r border-gray-100 last:border-r-0 cursor-crosshair"
                  onMouseDown={e => handleMouseDown(e, day)}
                >
                  {/* Events */}
                  {dayEvents.map(e => {
                    const startDate = parseISO(e.date);
                    const startMins = startDate.getHours() * 60 + startDate.getMinutes();
                    let durationMins = 60;
                    if (e.end_time) {
                      const endDate = parseISO(e.end_time);
                      durationMins = Math.max(15, differenceInMinutes(endDate, startDate));
                    }
                    const color = getGroupColor(e.group_id);
                    return (
                      <div
                        key={e.id}
                        onClick={ev => { ev.stopPropagation(); onEventClick(e); }}
                        className="absolute left-1 right-1 rounded-xl overflow-hidden cursor-pointer hover:shadow-lg hover:z-20 transition-all active:scale-[0.98] z-10"
                        style={{
                          top: (startMins / 60) * HOUR_HEIGHT + 1,
                          height: Math.max(24, (durationMins / 60) * HOUR_HEIGHT - 2),
                          backgroundColor: `${color}18`,
                          borderLeft: `3px solid ${color}`,
                        }}
                      >
                        <div className="p-1.5">
                          <p
                            className="text-[10px] font-black leading-none truncate"
                            style={{ color }}
                          >
                            {format(startDate, 'HH:mm')}
                          </p>
                          <p className="text-[11px] font-black text-[#222] line-clamp-2 leading-tight mt-0.5">
                            {e.title}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {/* Drag Selection Overlay */}
                  {isDraggingHere && drag && (
                    <div
                      className="absolute left-0 right-0 z-30 pointer-events-none"
                      style={{
                        top: (dragTopMin / 60) * HOUR_HEIGHT,
                        height: ((dragBottomMin - dragTopMin) / 60) * HOUR_HEIGHT,
                      }}
                    >
                      <div className="h-full mx-0.5 bg-[#ff385c]/15 border-2 border-[#ff385c] border-dashed rounded-xl">
                        <div className="absolute top-1 left-2 bg-[#ff385c] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow whitespace-nowrap">
                          {minsToTime(dragTopMin)} → {minsToTime(dragBottomMin)}
                        </div>
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
}

// ──────────────────────────────────────────────────────────
// Main CalendarView Component
// ──────────────────────────────────────────────────────────
export function CalendarView({
  view,
  currentMonth,
  events,
  getGroupColor,
  onEventClick,
  onDateClick,
}: CalendarViewProps) {

  // ── Month View ─────────────────────────────────
  if (view === 'month') {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows: React.ReactNode[] = [];
    let cells: React.ReactNode[] = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const d = new Date(day);
        const dayEvents = events.filter(e => isSameDay(parseISO(e.date), d));
        cells.push(
          <div
            key={d.toISOString()}
            onClick={() => onDateClick(d)}
            className={`min-h-[100px] md:min-h-[120px] p-2 border-r border-b border-gray-100 transition-colors cursor-pointer hover:bg-gray-50/50 ${
              !isSameMonth(d, monthStart) ? 'bg-gray-50/30' : ''
            }`}
          >
            <div className="mb-1">
              <span className={`text-[10px] md:text-xs font-black ${
                isSameDay(d, new Date())
                  ? 'bg-[#ff385c] text-white w-5 h-5 md:w-6 md:h-6 inline-flex items-center justify-center rounded-full'
                  : !isSameMonth(d, monthStart) ? 'text-gray-300' : 'text-[#222222]'
              }`}>
                {format(d, 'd')}
              </span>
            </div>
            <div className="space-y-1">
              {dayEvents.slice(0, 4).map(e => (
                <div
                  key={e.id}
                  onClick={ev => { ev.stopPropagation(); onEventClick(e); }}
                  className="px-1.5 py-0.5 md:py-1 rounded md:rounded-md text-[8px] md:text-[10px] font-bold truncate border-l-2 shadow-sm hover:brightness-95 active:scale-[0.97] transition-all"
                  style={{
                    backgroundColor: `${getGroupColor(e.group_id)}15`,
                    color: getGroupColor(e.group_id),
                    borderLeftColor: getGroupColor(e.group_id),
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
          {cells}
        </div>
      );
      cells = [];
    }
    return <div className="bg-white">{rows}</div>;
  }

  // ── Week View ──────────────────────────────────
  if (view === 'week') {
    const startDate = startOfWeek(currentMonth);
    const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
    return (
      <TimeGrid
        days={days}
        events={events}
        getGroupColor={getGroupColor}
        onEventClick={onEventClick}
        onDateClick={onDateClick}
      />
    );
  }

  // ── Day View ───────────────────────────────────
  if (view === 'day') {
    return (
      <TimeGrid
        days={[currentMonth]}
        events={events}
        getGroupColor={getGroupColor}
        onEventClick={onEventClick}
        onDateClick={onDateClick}
      />
    );
  }

  return null;
}
