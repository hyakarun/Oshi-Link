import React from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Menu, Plus, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { View } from '@/lib/types';

interface CalendarHeaderProps {
  currentMonth: Date;
  view: View;
  setView: (view: View) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onAddEvent: () => void;
  setIsMobileMenuOpen: (open: boolean) => void;
  themeColor: string;
}

export function CalendarHeader({
  currentMonth,
  view,
  setView,
  onPrev,
  onNext,
  onToday,
  onAddEvent,
  setIsMobileMenuOpen,
  themeColor
}: CalendarHeaderProps) {
  return (
    <header className="h-[72px] bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-8 shrink-0">
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 md:hidden hover:bg-gray-50 rounded-xl shrink-0"
        >
          <Menu className="w-6 h-6 text-[#222222]" />
        </button>

        <h1 className="text-lg md:text-2xl font-black text-[#222222] tracking-tighter whitespace-nowrap shrink-0">
          {format(currentMonth, view === 'month' ? 'yyyy年 M月' : 'M月 d日')}
        </h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* 移動ボタンを右側に移動 */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl shrink-0">
          <button 
            onClick={onPrev} 
            className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all"
            title="前へ"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          
          <button 
            onClick={onToday}
            className="px-3 py-1.5 hover:bg-white hover:shadow-sm text-[#222222] text-[10px] font-black rounded-lg transition-all"
          >
            今日
          </button>
          
          <button 
            onClick={onNext} 
            className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all"
            title="次へ"
          >
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="hidden sm:flex bg-gray-100 p-1 rounded-xl">
          {(['month', 'week', 'day'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                view === v ? 'bg-white text-[#222222] shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {v === 'month' ? '月' : v === 'week' ? '週' : '日'}
            </button>
          ))}
        </div>

        <div className="sm:hidden flex bg-gray-100 p-1 rounded-xl">
          <button 
            onClick={() => setView(view === 'month' ? 'day' : 'month')}
            className="p-1.5 bg-white shadow-sm rounded-lg"
          >
            <List className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <Button 
          onClick={onAddEvent}
          className="text-white rounded-xl h-10 md:h-11 px-4 md:px-6 text-xs font-black shadow-lg shadow-red-200 active:scale-95 transition-all flex items-center gap-2"
          style={{ backgroundColor: themeColor }}
        >
          <Plus className="w-4 h-4" /> <span className="hidden md:inline">予定を追加</span>
        </Button>
      </div>
    </header>
  );
}
