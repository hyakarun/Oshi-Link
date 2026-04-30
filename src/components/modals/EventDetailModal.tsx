import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, ShieldCheck, AlertCircle, Hotel, Star, Loader2 } from 'lucide-react';
import { Event } from '@/lib/types';

type HotelInfo = {
  hotelName: string;
  hotelInformationUrl: string;
  hotelImageUrl: string;
  hotelMinCharge: number;
  reviewAverage: number | null;
};

type EventDetailModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEvent: Event | null;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  loading: boolean;
  setExternalUrlWarning: (url: string) => void;
  handleVerify: (status: 'confirmed' | 'disputed') => void;
  handleUpdateEvent: (e: React.FormEvent<HTMLFormElement>) => void;
  handleSubscribe: (groupId: string) => void;
};

export function EventDetailModal({
  isOpen,
  onOpenChange,
  selectedEvent,
  isEditing,
  setIsEditing,
  loading,
  setExternalUrlWarning,
  handleVerify,
  handleUpdateEvent,
  handleSubscribe
}: EventDetailModalProps) {
  const [hotels, setHotels] = useState<HotelInfo[]>([]);
  const [hotelsLoading, setHotelsLoading] = useState(false);

  useEffect(() => {
    if (!selectedEvent?.location && !selectedEvent?.latitude) {
      setHotels([]);
      return;
    }
    setHotelsLoading(true);

    let url = '';
    if (selectedEvent.latitude && selectedEvent.longitude) {
      url = `/api/hotels?lat=${selectedEvent.latitude}&lng=${selectedEvent.longitude}`;
    } else if (selectedEvent.location) {
      url = `/api/hotels?keyword=${encodeURIComponent(selectedEvent.location)}`;
    }

    fetch(url)
      .then(r => r.json())
      .then((data: any) => {
        const list: HotelInfo[] = (data?.hotels || []).map((item: any) => {
          const info = item.hotel?.[0]?.hotelBasicInfo;
          if (!info) return null;
          return {
            hotelName: info.hotelName,
            hotelInformationUrl: info.hotelInformationUrl,
            hotelImageUrl: info.hotelImageUrl,
            hotelMinCharge: info.hotelMinCharge,
            reviewAverage: info.reviewAverage ?? null,
          };
        }).filter(Boolean);
        setHotels(list);
      })
      .catch(() => setHotels([]))
      .finally(() => setHotelsLoading(false));
  }, [selectedEvent?.location]);

  if (!selectedEvent) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-[640px] p-0 overflow-hidden border-none rounded-[32px] bg-white shadow-2xl ring-1 ring-gray-100">
        <div className="p-8">
          <div className="mb-6 flex items-center">
            {selectedEvent.is_tentative ? (
              <div className="flex items-center gap-2 px-4 py-1.5 bg-yellow-50 text-yellow-700 rounded-full border border-yellow-200">
                <AlertCircle className="w-4 h-4" />
                <span className="text-[11px] font-black uppercase tracking-widest">情報の信頼度: 低（仮）</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-200">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-[11px] font-black uppercase tracking-widest">情報の信頼度: 高（確定）</span>
              </div>
            )}
          </div>

            {!isEditing ? (
              <>
                <div className="mb-8">
                  <h2 className="text-3xl font-black text-[#222222] tracking-tight leading-tight mb-4 flex items-center gap-3">
                    {selectedEvent.is_tentative && <AlertCircle className="w-8 h-8 text-yellow-500 shrink-0" />}
                    {selectedEvent.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                      <Calendar className="w-4 h-4 text-[#ff385c]" />
                      <span className="text-sm font-bold text-gray-700">{format(parseISO(selectedEvent.date), 'yyyy年MM月dd日 HH:mm')}</span>
                    </div>
                    {selectedEvent.location && (
                      <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                        <MapPin className="w-4 h-4 text-[#ff385c]" />
                        <span className="text-sm font-bold text-gray-700">{selectedEvent.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedEvent.description && (
                  <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 mb-6">
                    <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{selectedEvent.description}</p>
                  </div>
                )}

                {selectedEvent.source_url && (
                  <div className="mb-4 pt-2">
                    <button
                      onClick={() => setExternalUrlWarning(selectedEvent.source_url!)}
                      className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#ff385c] hover:bg-[#e03150] text-white text-sm font-black rounded-2xl transition-all shadow-lg active:scale-95"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                      公式ソース・関連リンクを開く
                    </button>
                  </div>
                )}

                {selectedEvent.location && (
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-3">
                      <Hotel className="w-4 h-4 text-[#bf0000]" />
                      <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest">会場周辺の宿（楽天トラベル）</p>
                    </div>
                    {hotelsLoading ? (
                      <div className="flex items-center justify-center py-6 bg-gray-50 rounded-2xl">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-300 mr-2" />
                        <span className="text-xs text-gray-400 font-bold">ホテルを検索中...</span>
                      </div>
                    ) : hotels.length > 0 ? (
                      <div className="space-y-2">
                        {hotels.map((hotel, i) => (
                          <a
                            key={i}
                            href={hotel.hotelInformationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-red-50 border border-gray-100 hover:border-red-100 rounded-2xl transition-all group"
                          >
                            {hotel.hotelImageUrl && (
                              <img
                                src={hotel.hotelImageUrl}
                                alt={hotel.hotelName}
                                className="w-16 h-14 object-cover rounded-xl shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-black text-[#222222] truncate leading-tight">{hotel.hotelName}</p>
                              {hotel.reviewAverage && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                  <span className="text-[10px] font-bold text-gray-500">{hotel.reviewAverage}</span>
                                </div>
                              )}
                              {hotel.hotelMinCharge && (
                                <p className="text-[11px] font-black text-[#bf0000] mt-1">
                                  ¥{hotel.hotelMinCharge.toLocaleString()}〜/泊
                                </p>
                              )}
                            </div>
                            <span className="text-[10px] font-black text-[#bf0000] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">予約 →</span>
                          </a>
                        ))}
                        <p className="text-[9px] text-gray-300 text-right font-medium mt-1">Powered by 楽天トラベル</p>
                      </div>
                    ) : (
                      <div className="text-center py-4 bg-gray-50 rounded-2xl">
                        <p className="text-[11px] text-gray-400 font-bold">周辺のホテルが見つかりませんでした</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4 border-t border-gray-100 pt-8 mt-4 bg-gray-50/30 -mx-8 px-8 pb-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">情報の正確さを投票</h3>
                    <div className="flex gap-4">
                      <span className="text-[10px] font-bold text-green-600">正確: {selectedEvent.confirms_count || 0}</span>
                      <span className="text-[10px] font-bold text-orange-600">不正確: {selectedEvent.disputes_count || 0} / 5件で自動削除</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      onClick={() => handleVerify('confirmed')}
                      disabled={loading}
                      variant="outline"
                      className="rounded-2xl h-14 font-black flex items-center justify-center gap-2 active:scale-95 transition-all bg-white border-2 border-green-100 text-green-600 hover:bg-green-50 hover:border-green-200"
                    >
                      <ShieldCheck className="w-5 h-5" /> 正確（{selectedEvent.confirms_count || 0}）
                    </Button>
                    <Button
                      onClick={() => handleVerify('disputed')}
                      disabled={loading}
                      variant="outline"
                      className="rounded-2xl h-14 bg-white border-2 border-orange-100 text-orange-600 hover:bg-orange-50 hover:border-orange-200 transition-all active:scale-95 font-black flex items-center justify-center gap-2"
                    >
                      <AlertCircle className="w-5 h-5" /> 不正確（{selectedEvent.disputes_count || 0}）
                    </Button>
                  </div>
                  <p className="text-[10px] text-gray-400 text-center font-medium mt-2">
                    ※不正確な投票が5件集まると、この予定は自動的に削除されます。
                  </p>
                </div>

                <div className="flex gap-4 mt-8">
                  <Button onClick={() => setIsEditing(true)} className="flex-1 bg-[#222222] hover:bg-black text-white h-14 rounded-2xl font-black shadow-xl active:scale-95 transition-all">
                    情報を修正する
                  </Button>
                  <Button onClick={() => handleSubscribe(selectedEvent.group_id)} variant="outline" className="flex-1 border-gray-200 h-14 rounded-2xl font-black hover:bg-gray-50 transition-all text-gray-600">
                    外部連携 (iCal)
                  </Button>
                </div>
              </>
            ) : (
              <form onSubmit={handleUpdateEvent} className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <DialogTitle className="text-2xl font-black">予定を修正</DialogTitle>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">イベント名</label>
                    <input name="title" defaultValue={selectedEvent.title} className="w-full h-12 bg-gray-50 rounded-xl px-4 font-bold outline-none border-none focus:ring-2 focus:ring-[#ff385c]" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">詳細</label>
                    <textarea name="description" defaultValue={selectedEvent.description} className="w-full h-32 bg-gray-50 rounded-xl p-4 font-medium outline-none border-none focus:ring-2 focus:ring-[#ff385c] resize-none" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button type="submit" className="flex-1 bg-[#ff385c] text-white h-12 rounded-2xl font-black">保存する</Button>
                  <Button type="button" onClick={() => setIsEditing(false)} variant="ghost" className="flex-1 h-12 rounded-2xl font-black text-gray-500">キャンセル</Button>
                </div>
              </form>
            )}
          </div>
      </DialogContent>
    </Dialog>
  );
}
