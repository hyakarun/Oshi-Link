import React from 'react';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, ShieldCheck, AlertCircle } from 'lucide-react';
import { Event } from '@/lib/types';
import { FALLBACK_IMG } from '@/components/ui/shared';

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
  if (!selectedEvent) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-[640px] p-0 overflow-hidden border-none rounded-[32px] bg-white shadow-2xl ring-1 ring-gray-100">
        <div className="flex flex-col bg-white">
          <div className="relative aspect-video overflow-hidden">
            <img src={selectedEvent.image_url || FALLBACK_IMG} alt={selectedEvent.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-6 flex items-center gap-2">
              {selectedEvent.verified ? (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/90 backdrop-blur-md rounded-full text-white">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">正確な情報</span>
                </div>
              ) : selectedEvent.disputed ? (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-500/90 backdrop-blur-md rounded-full text-white">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">要検証</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="p-8">
            {!isEditing ? (
              <>
                <div className="mb-6">
                  <h2 className="text-3xl font-black text-[#222222] tracking-tight leading-tight mb-4">{selectedEvent.title}</h2>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-bold">{format(parseISO(selectedEvent.date), 'yyyy年MM月dd日 HH:mm')}</span>
                    </div>
                    {selectedEvent.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-bold">{selectedEvent.location}</span>
                      </div>
                    )}
                  </div>
                </div>
                {selectedEvent.description && (
                  <p className="text-gray-600 text-sm leading-relaxed">{selectedEvent.description}</p>
                )}
                {selectedEvent.source_url && (
                  <div className="pt-2">
                    <button
                      onClick={() => setExternalUrlWarning(selectedEvent.source_url!)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-[#ff385c] text-xs font-bold rounded-xl transition-all"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                      公式情報・リンクを開く
                    </button>
                  </div>
                )}
                <div className="space-y-3 border-t border-gray-100 pt-6 mt-6">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">コミュニティ検証</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => handleVerify('confirmed')}
                      disabled={loading}
                      className={`rounded-2xl h-12 font-black flex items-center justify-center gap-2 active:scale-95 transition-all ${selectedEvent.verified ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-blue-600 border-2 border-blue-100 hover:bg-blue-50'}`}
                    >
                      <ShieldCheck className="w-4 h-4" /> 正確です
                    </Button>
                    <Button
                      onClick={() => handleVerify('disputed')}
                      disabled={loading}
                      className="rounded-2xl h-12 bg-white border-2 border-gray-200 text-gray-400 hover:text-orange-600 hover:border-orange-200 transition-all active:scale-95 font-black flex items-center justify-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4" /> 要修正
                    </Button>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button onClick={() => setIsEditing(true)} className="flex-1 bg-[#222222] hover:bg-black text-white h-12 rounded-2xl font-black shadow-xl active:scale-95 transition-all">
                    内容を修正
                  </Button>
                  <Button onClick={() => handleSubscribe(selectedEvent.group_id)} variant="outline" className="flex-1 border-gray-200 h-12 rounded-2xl font-black hover:bg-gray-50 transition-all">
                    iCalに追加
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
