import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { getRepeatEndLimitDate } from '@/lib/event-repeat';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, MapPin, ChevronDown } from 'lucide-react';
import { LocationInput } from '@/components/ui/LocationInput';

const WEEKDAYS = [
  { value: 0, label: '日' },
  { value: 1, label: '月' },
  { value: 2, label: '火' },
  { value: 3, label: '水' },
  { value: 4, label: '木' },
  { value: 5, label: '金' },
  { value: 6, label: '土' },
] as const;

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
  const initialDate = defaultEventData?.date || format(new Date(), 'yyyy-MM-dd');
  const [isAllDay, setIsAllDay] = useState(false);
  const [dateValue, setDateValue] = useState(initialDate);
  const repeatEndLimit = getRepeatEndLimitDate(dateValue);
  const [locationText, setLocationText] = useState('');
  const [repeatByWeekday, setRepeatByWeekday] = useState(false);
  const [repeatByPeriod, setRepeatByPeriod] = useState(false);
  const [repeatUntil, setRepeatUntil] = useState(initialDate);
  const [repeatWeekdays, setRepeatWeekdays] = useState<number[]>([
    new Date(`${initialDate}T00:00:00`).getDay(),
  ]);

  useEffect(() => {
    if (isOpen) {
      const resetDate = defaultEventData?.date || format(new Date(), 'yyyy-MM-dd');
      setRepeatByWeekday(false);
      setRepeatByPeriod(false);
      setDateValue(resetDate);
      setRepeatUntil(resetDate);
      setRepeatWeekdays([new Date(`${resetDate}T00:00:00`).getDay()]);
      setLocationText('');
      setSelectedLocation(null);
    }
  }, [isOpen, defaultEventData?.date, setSelectedLocation]);

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (repeatByWeekday && repeatWeekdays.length === 0) {
      e.preventDefault();
      alert('繰り返す曜日を1つ以上選択してください');
      return;
    }
    if (repeatByPeriod && !repeatUntil) {
      e.preventDefault();
      alert('終了日を指定してください');
      return;
    }
    if (repeatByPeriod && repeatUntil < dateValue) {
      e.preventDefault();
      alert('終了日は開始日以降を指定してください');
      return;
    }
    if (repeatByPeriod && repeatUntil > repeatEndLimit) {
      e.preventDefault();
      alert(`終了日は開始日から1年後（${repeatEndLimit}）までです`);
      return;
    }
    onSubmit(e);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[540px] w-full p-0 overflow-hidden border-none rounded-t-[32px] sm:rounded-[32px] shadow-2xl top-auto bottom-0 translate-y-0 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 transition-all duration-500 max-h-[90vh] flex flex-col">
        <div className="modal-surface p-6 sm:p-8 overflow-y-auto overflow-x-hidden min-w-0">
          <form onSubmit={handleFormSubmit} className="space-y-6 w-full">
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
                    className="w-full h-14 bg-gray-50 dark:bg-secondary border-2 border-transparent focus:border-[#6366f1] focus:bg-white dark:focus:bg-accent rounded-2xl px-5 font-bold transition-all outline-none appearance-none cursor-pointer pr-12 box-border text-[#222222] dark:text-zinc-100"
                    required
                  >
                    <option value="" disabled className="dark:bg-popover">カレンダーを選択してください</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id} className="dark:bg-popover">{g.name}</option>
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
                  className="w-full h-14 bg-gray-50 dark:bg-secondary border-2 border-transparent focus:border-[#6366f1] focus:bg-white dark:focus:bg-accent rounded-2xl px-5 font-bold transition-all outline-none box-border text-[#222222] dark:text-zinc-100"
                  required 
                />
              </div>

              <div className="space-y-2 min-w-0 overflow-hidden">
                <label className="text-[11px] font-black text-gray-400 dark:text-zinc-555 uppercase tracking-widest">日付 <span className="text-[#6366f1]">*</span></label>
                <input 
                  type="date" 
                  name="date" 
                  value={dateValue}
                  onChange={(e) => {
                    const next = e.target.value;
                    setDateValue(next);
                    if (!repeatByWeekday) {
                      setRepeatWeekdays([new Date(`${next}T00:00:00`).getDay()]);
                    }
                    const limit = getRepeatEndLimitDate(next);
                    if (repeatByPeriod) {
                      setRepeatUntil((prev) => {
                        if (prev < next) return next;
                        if (prev > limit) return limit;
                        return prev;
                      });
                    }
                  }}
                  className="h-14 bg-gray-50 dark:bg-secondary border-2 border-transparent focus:border-[#6366f1] focus:bg-white dark:focus:bg-accent rounded-2xl px-5 font-bold transition-all outline-none text-[#222222] dark:text-zinc-100"
                  style={{ display: 'block', width: '100%', minWidth: 0, boxSizing: 'border-box' }}
                  required 
                />
              </div>

              {/* 曜日での登録 */}
              <div className="space-y-3 bg-gray-50/70 dark:bg-secondary/40 border border-gray-100 dark:border-border rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setRepeatByWeekday((v) => !v)}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${
                      repeatByWeekday ? 'bg-[#6366f1]' : 'bg-gray-200 dark:bg-accent'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white dark:bg-zinc-200 rounded-full shadow transition-transform duration-200 ${
                        repeatByWeekday ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <div className="min-w-0">
                    <p
                      className="text-sm font-black text-[#222222] dark:text-zinc-100 cursor-pointer select-none"
                      onClick={() => setRepeatByWeekday((v) => !v)}
                    >
                      曜日での登録
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold mt-0.5">
                      選んだ曜日に同じ予定を作成（単独時は開始日から1年後の同日まで）
                    </p>
                  </div>
                </div>
                {repeatByWeekday && (
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-black text-gray-400 dark:text-zinc-555 uppercase tracking-widest">
                      繰り返す曜日（複数選択可）
                    </label>
                    <div className="grid grid-cols-7 gap-2">
                      {WEEKDAYS.map((day) => {
                        const checked = repeatWeekdays.includes(day.value);
                        return (
                          <label
                            key={day.value}
                            className={`h-10 rounded-xl border flex items-center justify-center text-sm font-black cursor-pointer transition-all ${
                              checked
                                ? 'bg-[#6366f1] text-white border-[#6366f1]'
                                : 'bg-white dark:bg-accent text-gray-500 dark:text-zinc-400 border-gray-200 dark:border-border'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={checked}
                              onChange={() => {
                                setRepeatWeekdays((prev) => {
                                  if (prev.includes(day.value)) {
                                    return prev.filter((v) => v !== day.value);
                                  }
                                  return [...prev, day.value].sort((a, b) => a - b);
                                });
                              }}
                            />
                            {day.label}
                          </label>
                        );
                      })}
                    </div>
                    {!repeatByPeriod && (
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold leading-relaxed">
                        終了日なしの場合、開始日から1年後の同日までの該当曜日に登録します。
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* 期間での登録 */}
              <div className="space-y-3 bg-gray-50/70 dark:bg-secondary/40 border border-gray-100 dark:border-border rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setRepeatByPeriod((v) => !v)}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${
                      repeatByPeriod ? 'bg-[#6366f1]' : 'bg-gray-200 dark:bg-accent'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white dark:bg-zinc-200 rounded-full shadow transition-transform duration-200 ${
                        repeatByPeriod ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <div className="min-w-0">
                    <p
                      className="text-sm font-black text-[#222222] dark:text-zinc-100 cursor-pointer select-none"
                      onClick={() => setRepeatByPeriod((v) => !v)}
                    >
                      期間での登録
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold mt-0.5">
                      開始日から終了日まで（最長1年・曜日未指定なら毎日）
                    </p>
                  </div>
                </div>
                {repeatByPeriod && (
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-gray-400 dark:text-zinc-555 uppercase tracking-widest">
                        開始日
                      </label>
                      <input
                        type="date"
                        value={dateValue}
                        readOnly
                        className="h-12 bg-white/80 dark:bg-accent/80 border border-gray-200 dark:border-border rounded-xl px-4 font-bold text-gray-500 dark:text-zinc-400 w-full cursor-default"
                        tabIndex={-1}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-gray-400 dark:text-zinc-555 uppercase tracking-widest">
                        終了日 <span className="text-[#6366f1]">*</span>
                      </label>
                      <input
                        type="date"
                        name="repeat_until"
                        value={repeatUntil}
                        min={dateValue}
                        max={repeatEndLimit}
                        onChange={(e) => setRepeatUntil(e.target.value)}
                        className="h-12 bg-white dark:bg-accent border-2 border-transparent focus:border-[#6366f1] rounded-xl px-4 font-bold transition-all outline-none text-[#222222] dark:text-zinc-100 w-full"
                        required={repeatByPeriod}
                      />
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold">
                        終了日は開始日から最長1年後（{repeatEndLimit}）まで指定できます。
                      </p>
                    </div>
                  </div>
                )}
                {repeatByPeriod && !repeatByWeekday && (
                  <p className="text-[10px] text-[#6366f1] font-bold leading-relaxed">
                    期間内のすべての日に、同じ時刻で予定が作成されます。
                  </p>
                )}
                {repeatByPeriod && repeatByWeekday && (
                  <p className="text-[10px] text-[#6366f1] font-bold leading-relaxed">
                    期間内の、選択した曜日だけに同じ時刻で予定が作成されます。
                  </p>
                )}
              </div>
              <input type="hidden" name="repeat_period" value={repeatByPeriod ? '1' : '0'} />
              <input type="hidden" name="repeat_weekly" value={repeatByWeekday ? '1' : '0'} />
              <input type="hidden" name="repeat_weekdays" value={repeatWeekdays.join(',')} />

              {/* 終日トグル */}
              <div className="flex items-center gap-3 py-1">
                <button
                  type="button"
                  onClick={() => setIsAllDay(v => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${
                    isAllDay ? 'bg-[#6366f1]' : 'bg-gray-200 dark:bg-accent'
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
                      className="h-14 bg-gray-50 dark:bg-secondary border-2 border-transparent focus:border-[#6366f1] focus:bg-white dark:focus:bg-accent rounded-2xl px-3 font-bold transition-all outline-none text-[#222222] dark:text-zinc-100"
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
                      className="h-14 bg-gray-50 dark:bg-secondary border-2 border-transparent focus:border-[#6366f1] focus:bg-white dark:focus:bg-accent rounded-2xl px-3 font-bold transition-all outline-none text-[#222222] dark:text-zinc-100"
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
                      className="w-full h-14 bg-gray-50 dark:bg-secondary border-2 border-transparent focus:border-[#6366f1] focus:bg-white dark:focus:bg-accent rounded-2xl px-5 font-bold transition-all outline-none appearance-none cursor-pointer pr-12 box-border text-[#222222] dark:text-zinc-100"
                    >
                      <option value="オフライン系" className="dark:bg-popover">オフライン系</option>
                      <option value="オンライン系" className="dark:bg-popover">オンライン系</option>
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
                      className="w-full h-14 bg-gray-50 dark:bg-secondary border-2 border-transparent focus:border-[#6366f1] focus:bg-white dark:focus:bg-accent rounded-2xl px-5 font-bold transition-all outline-none appearance-none cursor-pointer pr-12 box-border text-[#222222] dark:text-zinc-100"
                    >
                      {eventCategory === 'オフライン系' ? (
                        <>
                          <option value="ライブ・コンサート" className="dark:bg-popover">ライブ・コンサート</option>
                          <option value="リリースイベント" className="dark:bg-popover">リリースイベント</option>
                          <option value="サイン会・お渡し会" className="dark:bg-popover">サイン会・お渡し会</option>
                          <option value="コラボカフェ・展示" className="dark:bg-popover">コラボカフェ・展示</option>
                          <option value="聖地・ロケ地" className="dark:bg-popover">聖地・ロケ地</option>
                          <option value="記念日" className="dark:bg-popover">記念日</option>
                          <option value="店休日" className="dark:bg-popover">店休日</option>
                          <option value="その他" className="dark:bg-popover">その他</option>
                        </>
                      ) : (
                        <>
                          <option value="YouTube生配信" className="dark:bg-popover">YouTube生配信</option>
                          <option value="テレビ出演" className="dark:bg-popover">テレビ出演</option>
                          <option value="ラジオ出演" className="dark:bg-popover">ラジオ出演</option>
                          <option value="雑誌発売" className="dark:bg-popover">雑誌発売</option>
                          <option value="グッズ発売" className="dark:bg-popover">グッズ発売</option>
                          <option value="その他" className="dark:bg-popover">その他</option>
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
                    className="w-full h-12 bg-gray-50 dark:bg-secondary border-none rounded-xl px-4 focus:ring-2 focus:ring-[#6366f1] outline-none font-bold text-[#222222] dark:text-zinc-100 transition-all"
                  />
                ) : (
                  <>
                    <LocationInput 
                      onSelect={setSelectedLocation}
                      onInputChange={(value) => {
                        setLocationText(value);
                        if (!value.trim()) setSelectedLocation(null);
                      }}
                      placeholder={eventSubCategory === '聖地・ロケ地' ? 'スポット名を入力...' : '会場名を入力...'}
                    />
                    <input
                      type="hidden"
                      name="location"
                      value={selectedLocation?.name || locationText}
                    />
                  </>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 dark:text-zinc-555 uppercase tracking-widest">説明・詳細</label>
                <textarea 
                  name="description" 
                  placeholder="イベントの詳細や持ち物など" 
                  className="w-full h-32 bg-gray-50 dark:bg-secondary border-2 border-transparent focus:border-[#6366f1] focus:bg-white dark:focus:bg-accent rounded-2xl p-5 font-medium transition-all outline-none resize-none text-[#222222] dark:text-zinc-100"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 dark:text-zinc-555 uppercase tracking-widest">参考URL <span className="text-[#6366f1]">*</span></label>
                <input 
                  name="source_url" 
                  placeholder="公式サイト、告知ツイートなど" 
                  className="w-full h-14 bg-gray-50 dark:bg-secondary border-2 border-transparent focus:border-[#6366f1] focus:bg-white dark:focus:bg-accent rounded-2xl px-5 font-bold transition-all outline-none text-[#222222] dark:text-zinc-100"
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
