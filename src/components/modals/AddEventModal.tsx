import React from 'react';
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
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[540px] w-full p-0 overflow-hidden border-none rounded-t-[32px] sm:rounded-[32px] bg-white shadow-2xl top-auto bottom-0 translate-y-0 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 transition-all duration-500 max-h-[90vh] flex flex-col">
        <div className="p-6 sm:p-8 overflow-y-auto overflow-x-hidden min-w-0">
          <form onSubmit={onSubmit} className="space-y-6 w-full">
            <div className="flex items-center justify-between mb-2">
              <DialogTitle className="text-2xl font-black text-[#222222]">新しい予定を追加</DialogTitle>
            </div>

            <div className="space-y-4 w-full">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">追加先カレンダー</label>
                <div className="relative group/select w-full overflow-hidden">
                  <select 
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full h-14 bg-gray-50 border-2 border-transparent focus:border-[#6366f1] focus:bg-white rounded-2xl px-5 font-bold transition-all outline-none appearance-none cursor-pointer pr-12 box-border"
                    required
                  >
                    <option value="" disabled>カレンダーを選択してください</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-focus-within/select:text-[#6366f1] transition-colors">
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">イベント名 <span className="text-[#6366f1]">*</span></label>
                <input 
                  name="title" 
                  placeholder="ライブ、リリースイベントなど" 
                  className="w-full h-14 bg-gray-50 border-2 border-transparent focus:border-[#6366f1] focus:bg-white rounded-2xl px-5 font-bold transition-all outline-none box-border"
                  required 
                />
              </div>

              <div className="space-y-2 min-w-0 overflow-hidden">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">日付 <span className="text-[#6366f1]">*</span></label>
                <input 
                  type="date" 
                  name="date" 
                  defaultValue={defaultEventData?.date || format(new Date(), 'yyyy-MM-dd')}
                  className="h-14 bg-gray-50 border-2 border-transparent focus:border-[#6366f1] focus:bg-white rounded-2xl px-5 font-bold transition-all outline-none"
                  style={{ display: 'block', width: '100%', minWidth: 0, boxSizing: 'border-box' }}
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 min-w-0 overflow-hidden">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">開始時間 <span className="text-[#6366f1]">*</span></label>
                  <input 
                    type="time" 
                    name="startTime" 
                    defaultValue={defaultEventData?.startTime}
                    className="h-14 bg-gray-50 border-2 border-transparent focus:border-[#6366f1] focus:bg-white rounded-2xl px-3 font-bold transition-all outline-none"
                    style={{ display: 'block', width: '100%', minWidth: 0, boxSizing: 'border-box' }}
                    required
                  />
                </div>
                <div className="space-y-2 min-w-0 overflow-hidden">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">終了時間</label>
                  <input 
                    type="time" 
                    name="endTime" 
                    defaultValue={defaultEventData?.endTime}
                    className="h-14 bg-gray-50 border-2 border-transparent focus:border-[#6366f1] focus:bg-white rounded-2xl px-3 font-bold transition-all outline-none"
                    style={{ display: 'block', width: '100%', minWidth: 0, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">カテゴリ</label>
                  <div className="relative group/select w-full overflow-hidden">
                    <select 
                      value={eventCategory}
                      onChange={(e) => {
                        const newCat = e.target.value;
                        setEventCategory(newCat);
                        // カテゴリ変更時にサブカテゴリをリセット
                        setEventSubCategory(newCat === 'オフライン系' ? 'ライブ・コンサート' : 'YouTube生配信');
                      }}
                      className="w-full h-14 bg-gray-50 border-2 border-transparent focus:border-[#6366f1] focus:bg-white rounded-2xl px-5 font-bold transition-all outline-none appearance-none cursor-pointer pr-12 box-border"
                    >
                      <option value="オフライン系">オフライン系</option>
                      <option value="オンライン系">オンライン系</option>
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-focus-within/select:text-[#6366f1] transition-colors">
                      <ChevronDown className="w-5 h-5" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">サブカテゴリ</label>
                  <div className="relative group/select w-full overflow-hidden">
                    <select 
                      value={eventSubCategory}
                      onChange={(e) => setEventSubCategory(e.target.value)}
                      className="w-full h-14 bg-gray-50 border-2 border-transparent focus:border-[#6366f1] focus:bg-white rounded-2xl px-5 font-bold transition-all outline-none appearance-none cursor-pointer pr-12 box-border"
                    >
                      {eventCategory === 'オフライン系' ? (
                        <>
                          <option value="ライブ・コンサート">ライブ・コンサート</option>
                          <option value="リリースイベント">リリースイベント</option>
                          <option value="サイン会・お渡し会">サイン会・お渡し会</option>
                          <option value="コラボカフェ・展示">コラボカフェ・展示</option>
                          <option value="聖地・ロケ地">聖地・ロケ地</option>
                          <option value="その他">その他</option>
                        </>
                      ) : (
                        <>
                          <option value="YouTube生配信">YouTube生配信</option>
                          <option value="テレビ出演">テレビ出演</option>
                          <option value="ラジオ出演">ラジオ出演</option>
                          <option value="雑誌発売">雑誌発売</option>
                          <option value="グッズ発売">グッズ発売</option>
                          <option value="その他">その他</option>
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
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
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
                    className="w-full h-12 bg-gray-50 border-none rounded-xl px-4 focus:ring-2 focus:ring-[#6366f1] outline-none font-bold text-[#222222] transition-all"
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
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">説明・詳細</label>
                <textarea 
                  name="description" 
                  placeholder="イベントの詳細や持ち物など" 
                  className="w-full h-32 bg-gray-50 border-2 border-transparent focus:border-[#6366f1] focus:bg-white rounded-2xl p-5 font-medium transition-all outline-none resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">参考URL <span className="text-[#6366f1]">*</span></label>
                <input 
                  name="source_url" 
                  placeholder="公式サイト、告知ツイートなど" 
                  className="w-full h-14 bg-gray-50 border-2 border-transparent focus:border-[#6366f1] focus:bg-white rounded-2xl px-5 font-bold transition-all outline-none"
                  required
                />
              </div>

              <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-100 flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-yellow-700 font-bold leading-relaxed">
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
