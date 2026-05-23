import React, { useState } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, MapPin, ChevronDown } from 'lucide-react';
import { LocationInput } from '@/components/ui/LocationInput';

type LocationResult = {
  name: string;
  shortName: string;
  address: string;
  latitude: number;
  longitude: number;
};

interface AddEventModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  themeColor: string;
  defaultEventData: { date: string; startTime?: string; endTime?: string } | null;
  eventCategory: string;
  setEventCategory: (cat: string) => void;
  eventSubCategory: string;
  setEventSubCategory: (sub: string) => void;
  selectedLocation: LocationResult | null;
  setSelectedLocation: (loc: LocationResult | null) => void;
  groups: { id: string; name: string }[];
  selectedGroupId: string;
  setSelectedGroupId: (id: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function AddEventModal({
  isOpen,
  onOpenChange,
  loading,
  themeColor,
  defaultEventData,
  eventCategory,
  setEventCategory,
  eventSubCategory,
  setEventSubCategory,
  selectedLocation,
  setSelectedLocation,
  groups,
  selectedGroupId,
  setSelectedGroupId,
  onSubmit
}: AddEventModalProps) {
  const [isAllDay, setIsAllDay] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[540px] w-full p-0 overflow-hidden border-none rounded-t-[32px] sm:rounded-[32px] bg-white dark:bg-zinc-900 shadow-2xl top-auto bottom-0 translate-y-0 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 transition-all duration-500 max-h-[90vh] flex flex-col">
        <div className="p-6 sm:p-8 overflow-y-auto overflow-x-hidden min-w-0">
          <form onSubmit={onSubmit} className="space-y-6 w-full">
            <div className="flex items-center justify-between mb-2">
              <DialogTitle className="text-2xl font-black text-[#222222] dark:text-zinc-100">新しい予定を追加</DialogTitle>
            </div>

            <div className="space-y-4 w-full">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 dark:text-zinc-555 uppercase tracking-widest">追加先カレンダー</label>
                <div className="relative group/select w-full overflow-hidden">
                  <select 
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full h-14 bg-gray-50 dark:bg-zinc-800 border-2 border-transparent focus:border-[#6366f1] focus:bg-white dark:focus:bg-zinc-700 rounded-2xl px-5 font-bold transition-all outline-none appearance-none cursor-pointer pr-12 box-border text-[#222222] dark:text-zinc-100"
                    required
                  >
                    <option value="" disabled className="dark:bg-zinc-900">カレンダーを選択してください</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id} className="dark:bg-zinc-900">{g.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-focus-within/select:text-[#6366f1] transition-colors">
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 dark:text-zinc-555 uppercase tracking-widest">イベント名 <span className="text-[#6366f1]">*</span></label>
                <input 
                  name="title" 
                  placeholder="ライブ、リリースイベントなど" 
                  className="w-full h-14 bg-gray-50 dark:bg-zinc-800 border-2 border-transparent focus:border-[#6366f1] focus:bg-white dark:focus:bg-zinc-700 rounded-2xl px-5 font-bold transition-all outline-none box-border text-[#222222] dark:text-zinc-100"
                  required 
                />
              </div>

              <div className="space-y-2 min-w-0 overflow-hidden">
                <label className="text-[11px] font-black text-gray-400 dark:text-zinc-555 uppercase tracking-widest">日付 <span className="text-[#6366f1]">*</span></label>
                <input 
                  type="date" 
                  name="date" 
                  defaultValue={defaultEventData?.date || format(new Date(), 'yyyy-MM-dd')}
                  className="h-14 bg-gray-50 dark:bg-zinc-800 border-2 border-transparent focus:border-[#6366f1] focus:bg-white dark:focus:bg-zinc-700 rounded-2xl px-5 font-bold transition-all outline-none text-[#222222] dark:text-zinc-100"
                  style={{ display: 'block', width: '100%', minWidth: 0, boxSizing: 'border-box' }}
                  required 
                />
              </div>

              {/* 終日トグル */}
              <div className="flex items-center gap-3 py-1">
                <button
                  type="button"
                  onClick={() => setIsAllDay(v => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${
                    isAllDay ? 'bg-[#6366f1]' : 'bg-gray-200 dark:bg-zinc-700'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white dark:bg-zinc-200 rounded-full shadow transition-transform duration-200 ${
                    isAllDay ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
                <span
                  className="text-sm font-bold text-gray-600 dark:text-zinc-300 cursor-pointer select-none"
                  onClick={() => setIsAllDay(v => !v)}
                >
                  終日
                </span>
                <input type="hidden" name="isAllDay" value={isAllDay ? '1' : '0'} />
              </div>

              {/* 時間入力（終日OFFの時のみ表示） */}
              {!isAllDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2 min-w-0 overflow-hidden">
                    <label className="text-[11px] font-black text-gray-400 dark:text-zinc-555 uppercase tracking-widest">開始時間 <span className="text-[#6366f1]">*</span></label>
                    <input 
                      type="time" 
                      name="startTime" 
                      defaultValue={defaultEventData?.startTime}
                      className="h-14 bg-gray-50 dark:bg-zinc-800 border-2 border-transparent focus:border-[#6366f1] focus:bg-white dark:focus:bg-zinc-700 rounded-2xl px-3 font-bold transition-all outline-none text-[#222222] dark:text-zinc-100"
                      style={{ display: 'block', width: '100%', minWidth: 0, boxSizing: 'border-box' }}
                      required
                    />
                  </div>
                  <div className="space-y-2 min-w-0 overflow-hidden">
                    <label className="text-[11px] font-black text-gray-400 dark:text-zinc-555 uppercase tracking-widest">終了時間</label>
                    <input 
                      type="time" 
                      name="endTime" 
                      defaultValue={defaultEventData?.endTime}
                      className="h-14 bg-gray-50 dark:bg-zinc-800 border-2 border-transparent focus:border-[#6366f1] focus:bg-white dark:focus:bg-zinc-700 rounded-2xl px-3 font-bold transition-all outline-none text-[#222222] dark:text-zinc-100"
                      style={{ display: 'block', width: '100%', minWidth: 0, boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 dark:text-zinc-555 uppercase tracking-widest">カテゴリ</label>
                  <div className="relative group/select w-full overflow-hidden">
                    <select 
                      value={eventCategory}
                      onChange={(e) => {
                        const newCat = e.target.value;
                        setEventCategory(newCat);
                        // カテゴリ変更時にサブカテゴリをリセット
                        setEventSubCategory(newCat === 'オフライン系' ? 'ライブ・コンサート' : 'YouTube生配信');
                      }}
                      className="w-full h-14 bg-gray-50 dark:bg-zinc-800 border-2 border-transparent focus:border-[#6366f1] focus:bg-white dark:focus:bg-zinc-700 rounded-2xl px-5 font-bold transition-all outline-none appearance-none cursor-pointer pr-12 box-border text-[#222222] dark:text-zinc-100"
                    >
                      <option value="オフライン系" className="dark:bg-zinc-900">オフライン系</option>
                      <option value="オンライン系" className="dark:bg-zinc-900">オンライン系</option>
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-focus-within/select:text-[#6366f1] transition-colors">
                      <ChevronDown className="w-5 h-5" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 dark:text-zinc-555 uppercase tracking-widest">サブカテゴリ</label>
                  <div className="relative group/select w-full overflow-hidden">
                    <select 
                      value={eventSubCategory}
                      onChange={(e) => setEventSubCategory(e.target.value)}
                      className="w-full h-14 bg-gray-50 dark:bg-zinc-800 border-2 border-transparent focus:border-[#6366f1] focus:bg-white dark:focus:bg-zinc-700 rounded-2xl px-5 font-bold transition-all outline-none appearance-none cursor-pointer pr-12 box-border text-[#222222] dark:text-zinc-100"
                    >
                      {eventCategory === 'オフライン系' ? (
                        <>
                          <option value="ライブ・コンサート" className="dark:bg-zinc-900">ライブ・コンサート</option>
                          <option value="リリースイベント" className="dark:bg-zinc-900">リリースイベント</option>
                          <option value="サイン会・お渡し会" className="dark:bg-zinc-900">サイン会・お渡し会</option>
                          <option value="コラボカフェ・展示" className="dark:bg-zinc-900">コラボカフェ・展示</option>
                          <option value="聖地・ロケ地" className="dark:bg-zinc-900">聖地・ロケ地</option>
                          <option value="その他" className="dark:bg-zinc-900">その他</option>
                        </>
                      ) : (
                        <>
                          <option value="YouTube生配信" className="dark:bg-zinc-900">YouTube生配信</option>
                          <option value="テレビ出演" className="dark:bg-zinc-900">テレビ出演</option>
                          <option value="ラジオ出演" className="dark:bg-zinc-900">ラジオ出演</option>
                          <option value="雑誌発売" className="dark:bg-zinc-900">雑誌発売</option>
                          <option value="グッズ発売" className="dark:bg-zinc-900">グッズ発売</option>
                          <option value="その他" className="dark:bg-zinc-900">その他</option>
                        </>
                      )}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-focus-within/select:text-[#6366f1] transition-colors">
                      <ChevronDown className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 dark:text-zinc-555 uppercase tracking-widest">
                  {(() => {
                    if (eventCategory === 'オンライン系') {
                      switch (eventSubCategory) {
                        case 'YouTube生配信': return '配信チャンネル・URL';
                        case 'テレビ出演':
                        case 'ラジオ出演': return '放送局・番組名';
                        case '雑誌発売': return '掲載誌・出版社';
                        case 'グッズ発売': return '販売サイト・店舗名';
                        default: return '関連サイト・URL';
                      }
                    }
                    if (eventSubCategory === '聖地・ロケ地') return 'スポット名・場所';
                    return '場所・会場';
                  })()}
                </label>
                {eventCategory === 'オンライン系' ? (
                  <input 
                    name="location" 
                    placeholder="チャンネル名、番組名、URLなど..." 
                    className="w-full h-12 bg-gray-50 dark:bg-zinc-800 border-none rounded-xl px-4 focus:ring-2 focus:ring-[#6366f1] outline-none font-bold text-[#222222] dark:text-zinc-100 transition-all"
                  />
                ) : (
                  <>
                    <LocationInput 
                      onSelect={setSelectedLocation}
                      placeholder={eventSubCategory === '聖地・ロケ地' ? 'スポット名を入力...' : '会場名を入力...'}
                    />
                    <input type="hidden" name="location" value={selectedLocation?.name || ''} />
                  </>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 dark:text-zinc-555 uppercase tracking-widest">説明・詳細</label>
                <textarea 
                  name="description" 
                  placeholder="イベントの詳細や持ち物など" 
                  className="w-full h-32 bg-gray-50 dark:bg-zinc-800 border-2 border-transparent focus:border-[#6366f1] focus:bg-white dark:focus:bg-zinc-700 rounded-2xl p-5 font-medium transition-all outline-none resize-none text-[#222222] dark:text-zinc-100"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 dark:text-zinc-555 uppercase tracking-widest">参考URL <span className="text-[#6366f1]">*</span></label>
                <input 
                  name="source_url" 
                  placeholder="公式サイト、告知ツイートなど" 
                  className="w-full h-14 bg-gray-50 dark:bg-zinc-800 border-2 border-transparent focus:border-[#6366f1] focus:bg-white dark:focus:bg-zinc-700 rounded-2xl px-5 font-bold transition-all outline-none text-[#222222] dark:text-zinc-100"
                  required
                />
              </div>

              <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-2xl border border-yellow-100 dark:border-yellow-900/30 flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-yellow-700 dark:text-yellow-400 font-bold leading-relaxed">
                  追加された予定は「未確定（仮）」として登録され、他のユーザーの投票によって確定されます。正確な情報を入力してください。
                </p>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-16 text-white text-lg font-black rounded-2xl shadow-xl active:scale-[0.98] transition-all disabled:opacity-50"
              style={{ backgroundColor: themeColor }}
            >
              {loading ? '登録中...' : '予定を登録する'}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
