import React, { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, ShieldCheck, AlertCircle, Hotel, ThumbsUp, MessageSquarePlus } from 'lucide-react';
import { Event } from '@/lib/types';

type Proposal = {
  id: string;
  title: string;
  description?: string;
  user_name: string;
  vote_count: number;
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
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [currentVotes, setCurrentVotes] = useState(0);
  const [myProposalVote, setMyProposalVote] = useState<string | null>(null);
  const [isFetchingProposals, setIsFetchingProposals] = useState(false);

  const fetchProposals = useCallback(async () => {
    if (!selectedEvent) return;
    setIsFetchingProposals(true);
    try {
      const res = await fetch(`/api/events/proposals?event_id=${selectedEvent.id}`);
      if (res.ok) {
        const data = await res.json() as any;
        setProposals(data.proposals);
        setCurrentVotes(data.current_votes);
        setMyProposalVote(data.my_vote);
      }
    } catch (e) {
      console.error('Failed to fetch proposals:', e);
    }
    setIsFetchingProposals(false);
  }, [selectedEvent]);

  useEffect(() => {
    if (isOpen && selectedEvent) {
      fetchProposals();
    }
  }, [isOpen, selectedEvent, fetchProposals]);

  const handleVote = async (proposalId: string | null) => {
    if (!selectedEvent) return;
    try {
      const res = await fetch('/api/events/proposals/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: selectedEvent.id, proposal_id: proposalId })
      });
      if (res.ok) {
        fetchProposals();
      }
    } catch (e) {
      console.error('Failed to vote:', e);
    }
  };

  const onProposeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEvent) return;
    
    const fd = new FormData(e.currentTarget);
    const body = {
      event_id: selectedEvent.id,
      title: fd.get('title'),
      description: fd.get('description'),
      location: selectedEvent.location,
      address: selectedEvent.address,
      latitude: selectedEvent.latitude,
      longitude: selectedEvent.longitude,
      source_url: selectedEvent.source_url
    };

    try {
      const res = await fetch('/api/events/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setIsEditing(false);
        fetchProposals();
      } else {
        const err = await res.json() as any;
        alert(err.error || '提案の投稿に失敗しました');
      }
    } catch (e) {
      alert('通信エラーが発生しました');
    }
  };

  if (!selectedEvent) return null;

  // 楽天トラベルへのアフィリエイトリンクを生成
  const rakutenAffiliateId = process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID || '535601d9.adf03288.535601da.eabb1e44';
  const getRakutenHotelSearchUrl = (location: string) => {
    const keyword = location.split(',')[0].split('、')[0].trim();
    const dest = `https://kw.travel.rakuten.co.jp/keyword/Search.do?charset=utf-8&f_max=30&f_query=${encodeURIComponent(keyword)}`;
    return `https://hb.afl.rakuten.co.jp/hgc/${rakutenAffiliateId}/?pc=${encodeURIComponent(dest)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-[640px] p-0 overflow-hidden border-none rounded-t-[32px] sm:rounded-[32px] bg-white shadow-2xl ring-1 ring-gray-100 top-auto bottom-0 translate-y-0 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 transition-all duration-500 max-h-[90vh] flex flex-col">
        <div className="p-8 overflow-y-auto flex-1">
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
                    {selectedEvent.creator_name && (
                      <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                        <div className="w-4 h-4 bg-[#ff385c] rounded-full flex items-center justify-center text-[8px] text-white font-black">
                          {selectedEvent.creator_name[0]}
                        </div>
                        <span className="text-[11px] font-bold text-gray-500">投稿: {selectedEvent.creator_name}</span>
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

                {selectedEvent.category === 'オフライン系' && (selectedEvent.location || selectedEvent.latitude) && (
                  <div className="mb-6">
                    <a
                      href={getRakutenHotelSearchUrl(selectedEvent.location || '')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2.5 px-6 py-4 bg-[#bf0000] hover:bg-[#a00000] text-white text-sm font-black rounded-2xl transition-all shadow-md active:scale-95"
                    >
                      <Hotel className="w-4 h-4" />
                      会場周辺の宿を楽天トラベルで探す
                    </a>
                    <p className="text-[9px] text-gray-300 text-right font-medium mt-1.5">Powered by 楽天トラベル</p>
                  </div>
                )}

                {/* Accuracy Voting Section */}
                <div className="space-y-4 border-t border-gray-100 pt-8 mt-4 bg-gray-50/30 -mx-8 px-8 pb-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">情報の正確さを投票</h3>
                    <div className="flex gap-4">
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      onClick={() => handleVerify('confirmed')}
                      disabled={loading}
                      variant="outline"
                      className={`rounded-2xl h-14 font-black flex items-center justify-center gap-2 active:scale-95 transition-all ${
                        selectedEvent.user_vote === 'confirmed'
                          ? 'bg-green-50 border-green-500 text-green-700 shadow-inner'
                          : 'bg-white border-green-100 text-green-600 hover:bg-green-50 hover:border-green-200'
                      } border-2`}
                    >
                      <ShieldCheck className={`w-5 h-5 ${selectedEvent.user_vote === 'confirmed' ? 'fill-green-200' : ''}`} /> 正確
                    </Button>
                    <Button
                      onClick={() => handleVerify('disputed')}
                      disabled={loading}
                      variant="outline"
                      className={`rounded-2xl h-14 font-black flex items-center justify-center gap-2 active:scale-95 transition-all ${
                        selectedEvent.user_vote === 'disputed'
                          ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-inner'
                          : 'bg-white border-orange-100 text-orange-600 hover:bg-orange-50 hover:border-orange-200'
                      } border-2`}
                    >
                      <AlertCircle className={`w-5 h-5 ${selectedEvent.user_vote === 'disputed' ? 'fill-orange-200' : ''}`} /> 不正確
                    </Button>
                  </div>
                </div>

                {/* Community Update Section (Voting on Proposals) */}
                <div className="mt-8 border-t border-gray-100 pt-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-sm font-black text-[#222222] uppercase tracking-widest">修正提案（0時更新）</h3>
                      <p className="text-[10px] text-gray-400 font-bold mt-1">最も投票が多い案が採用されます</p>
                    </div>
                    {proposals.length < 3 && (
                      <Button 
                        onClick={() => setIsEditing(true)} 
                        variant="ghost" 
                        className="text-[#ff385c] hover:bg-red-50 font-black text-xs h-9 rounded-xl gap-2"
                      >
                        <MessageSquarePlus className="w-4 h-4" /> 修正案を出す
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {/* Current Version Option */}
                    <div 
                      onClick={() => handleVote(null)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                        myProposalVote === 'current' 
                          ? 'bg-blue-50 border-blue-500' 
                          : 'bg-white border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">現状</p>
                        <p className="text-xs font-black text-[#222222]">現状のままで良い</p>
                      </div>
                      <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-gray-100">
                        <ThumbsUp className={`w-3 h-3 ${myProposalVote === 'current' ? 'text-blue-500 fill-blue-500' : 'text-gray-300'}`} />
                        <span className="text-[11px] font-black text-gray-500">{currentVotes}</span>
                      </div>
                    </div>

                    {/* Proposal Options */}
                    {proposals.map((p, i) => (
                      <div 
                        key={p.id}
                        onClick={() => handleVote(p.id)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                          myProposalVote === p.id 
                            ? 'bg-blue-50 border-blue-500' 
                            : 'bg-white border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-4">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">案 {i + 1} ({p.user_name})</p>
                          <p className="text-xs font-black text-[#222222] truncate">{p.title}</p>
                          {p.description && <p className="text-[9px] text-gray-400 truncate mt-0.5">{p.description}</p>}
                        </div>
                        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-gray-100 shrink-0">
                          <ThumbsUp className={`w-3 h-3 ${myProposalVote === p.id ? 'text-blue-500 fill-blue-500' : 'text-gray-300'}`} />
                          <span className="text-[11px] font-black text-gray-500">{p.vote_count}</span>
                        </div>
                      </div>
                    ))}

                    {proposals.length === 0 && !isFetchingProposals && (
                      <p className="text-center py-4 text-[11px] text-gray-300 font-bold">まだ修正案はありません</p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <form onSubmit={onProposeSubmit} className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <DialogTitle className="text-2xl font-black">修正案を提案</DialogTitle>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">修正後のイベント名</label>
                    <input name="title" defaultValue={selectedEvent.title} className="w-full h-12 bg-gray-50 rounded-xl px-4 font-bold outline-none border-none focus:ring-2 focus:ring-[#ff385c]" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">修正の理由や詳細</label>
                    <textarea name="description" defaultValue={selectedEvent.description} className="w-full h-32 bg-gray-50 rounded-xl p-4 font-medium outline-none border-none focus:ring-2 focus:ring-[#ff385c] resize-none" placeholder="なぜ修正が必要か、具体的な変更点などを入力してください" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button type="submit" className="flex-1 bg-[#ff385c] text-white h-12 rounded-2xl font-black">提案を投稿する</Button>
                  <Button type="button" onClick={() => setIsEditing(false)} variant="ghost" className="flex-1 h-12 rounded-2xl font-black text-gray-500">キャンセル</Button>
                </div>
              </form>
            )}
          </div>
      </DialogContent>
    </Dialog>
  );
}
