import React, { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, ShieldCheck, AlertCircle, Hotel, ThumbsUp, MessageSquarePlus, Clock, Pencil, Trash2 } from 'lucide-react';
import { Event } from '@/lib/types';
import { normalizeExternalUrl, formatEventDateTime, isAllDayEvent } from '@/lib/utils';
import {
  canEditEvent,
  canDeleteEvent,
  creatorEditRemainingMs,
  isUnlimitedOfficialEdit,
  type EventEditUser,
} from '@/lib/event-edit';
import { EventCreatorEditForm } from '@/components/modals/EventCreatorEditForm';

type Proposal = {
  id: string;
  title: string;
  description?: string;
  reason?: string;
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
  handleUpdateEvent: (e: React.FormEvent<HTMLFormElement>, onSuccess?: () => void) => void;
  handleDeleteEvent: (eventId: string) => void;
  handleSubscribe: (groupId: string) => void;
  authHeaders: () => Record<string, string>;
  user: EventEditUser | null;
  postableGroups: { id: string; name: string }[];
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
  handleDeleteEvent,
  handleSubscribe,
  authHeaders,
  user,
  postableGroups,
}: EventDetailModalProps) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [currentVotes, setCurrentVotes] = useState(0);
  const [myProposalVote, setMyProposalVote] = useState<string | null>(null);
  const [showSafetyDialog, setShowSafetyDialog] = useState(false);
  const [isFetchingProposals, setIsFetchingProposals] = useState(false);
  const [isCreatorEditing, setIsCreatorEditing] = useState(false);
  const [editCountdownMs, setEditCountdownMs] = useState(0);

  const isOfficialManager =
    !!selectedEvent?.group_id && isUnlimitedOfficialEdit(user, selectedEvent.group_id);
  const canEdit = !!selectedEvent && canEditEvent(selectedEvent, user);
  const canDelete = !!selectedEvent && canDeleteEvent(selectedEvent, user);

  const fetchProposals = useCallback(async () => {
    if (!selectedEvent) return;
    setIsFetchingProposals(true);
    try {
      const res = await fetch(`/api/events/proposals?event_id=${selectedEvent.id}`, {
        headers: authHeaders()
      });
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
  }, [selectedEvent, authHeaders]);

  useEffect(() => {
    if (isOpen && selectedEvent) {
      fetchProposals();
    }
    if (!isOpen) {
      setIsCreatorEditing(false);
    }
  }, [isOpen, selectedEvent, fetchProposals]);

  useEffect(() => {
    if (!canEdit || !selectedEvent || isOfficialManager) {
      setEditCountdownMs(0);
      return;
    }
    const tick = () => setEditCountdownMs(creatorEditRemainingMs(selectedEvent));
    tick();
    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, [canEdit, isOfficialManager, selectedEvent]);

  const handleVote = async (proposalId: string | null) => {
    if (!selectedEvent) return;
    try {
      const res = await fetch('/api/events/proposals/vote', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
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
      reason: fd.get('reason'),
      location: selectedEvent.location,
      address: selectedEvent.address,
      latitude: selectedEvent.latitude,
      longitude: selectedEvent.longitude,
      source_url: selectedEvent.source_url
    };

    try {
      const res = await fetch('/api/events/proposals', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
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
  const isOfficialManagedEvent =
    !!selectedEvent.group_is_official && !!selectedEvent.added_by_group_official;

  // 楽天トラベルへのアフィリエイトリンクを生成
  const rakutenAffiliateId = process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID || '535601d9.adf03288.535601da.eabb1e44';
  const getRakutenHotelSearchUrl = (location: string) => {
    const keyword = location.split(',')[0].split('、')[0].trim();
    const dest = `https://kw.travel.rakuten.co.jp/keyword/Search.do?charset=utf-8&f_max=30&f_query=${encodeURIComponent(keyword)}`;
    return `https://hb.afl.rakuten.co.jp/hgc/${rakutenAffiliateId}/?pc=${encodeURIComponent(dest)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        initialFocus={(openType) => openType === 'keyboard'}
        className="w-full sm:max-w-[640px] p-0 overflow-hidden border-none rounded-t-[32px] sm:rounded-[32px] shadow-2xl ring-1 ring-gray-100 dark:ring-border top-auto bottom-0 translate-y-0 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 transition-all duration-500 max-h-[90vh] flex flex-col"
      >
        <div className="modal-surface p-8 overflow-y-auto flex-1">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {isOfficialManagedEvent ? (
              <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-50 dark:bg-indigo-950/20 text-[#6366f1] dark:text-indigo-400 rounded-full border border-indigo-200 dark:border-indigo-900/30">
                <ShieldCheck className="w-4 h-4 fill-indigo-100 dark:fill-indigo-950/40" />
                <span className="text-[11px] font-black uppercase tracking-widest">公式情報（公認アカウント）</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-1.5 bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 rounded-full border border-orange-200 dark:border-orange-900/30">
                <AlertCircle className="w-4 h-4" />
                <span className="text-[11px] font-black uppercase tracking-widest">非公式</span>
              </div>
            )}
            {selectedEvent.is_tentative ? (
              <div className="flex items-center gap-2 px-4 py-1.5 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400 rounded-full border border-yellow-200 dark:border-yellow-900/30">
                <AlertCircle className="w-4 h-4" />
                <span className="text-[11px] font-black uppercase tracking-widest">情報の信頼度: 低（仮）</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-1.5 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 rounded-full border border-green-200 dark:border-green-900/30">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-[11px] font-black uppercase tracking-widest">情報の信頼度: 高（確定）</span>
              </div>
            )}
          </div>

          {selectedEvent.category && !isCreatorEditing && (
            <p className="mb-2 text-[10px] font-bold text-gray-400 dark:text-zinc-500 tracking-wide">
              <span className="text-gray-400/80 dark:text-zinc-600">カテゴリ</span>
              {' '}
              {selectedEvent.category}
              {selectedEvent.sub_category ? ` ・ ${selectedEvent.sub_category}` : ''}
            </p>
          )}

            {isCreatorEditing ? (
              <EventCreatorEditForm
                event={selectedEvent}
                groups={postableGroups}
                loading={loading}
                isOfficialManager={isOfficialManager}
                onSubmit={(e) => handleUpdateEvent(e, () => setIsCreatorEditing(false))}
                onCancel={() => setIsCreatorEditing(false)}
              />
            ) : !isEditing ? (
              <>
                <div className="mb-8">
                  <h2 className="text-3xl font-black text-[#222222] dark:text-zinc-100 tracking-tight leading-tight mb-3 flex items-center gap-3">
                    {selectedEvent.is_tentative && <AlertCircle className="w-8 h-8 text-yellow-500 shrink-0" />}
                    {selectedEvent.title}
                  </h2>
                  {selectedEvent.creator_edit_used && !isOfficialManager && (
                    <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 mb-2">
                      投稿者が内容を修正済みです
                    </p>
                  )}
                  {(canEdit || canDelete) && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {canEdit && (
                        <Button
                          type="button"
                          onClick={() => setIsCreatorEditing(true)}
                          variant="outline"
                          className="rounded-xl h-10 font-black text-xs gap-2 border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900/40 dark:text-amber-400"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          {isOfficialManager
                            ? '予定を編集'
                            : `予定を修正（残り約${Math.max(1, Math.ceil(editCountdownMs / 60000))}分・1回限り）`}
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          type="button"
                          onClick={() => handleDeleteEvent(selectedEvent.id)}
                          variant="outline"
                          className="rounded-xl h-10 font-black text-xs gap-2 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          予定を削除
                        </Button>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    {selectedEvent.creator_name && (
                      <div className="flex items-center gap-2 bg-gray-50 dark:bg-secondary px-3 py-1.5 rounded-lg border border-gray-100 dark:border-border">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white font-black ${selectedEvent.creator_is_official ? 'bg-[#6366f1]' : 'bg-gray-400'}`}>
                          {selectedEvent.creator_name[0]}
                        </div>
                        <span className="text-[11px] font-bold text-gray-550 dark:text-zinc-400 flex items-center gap-1">
                          投稿: {selectedEvent.creator_name}
                          {selectedEvent.creator_is_official && (
                            <ShieldCheck className="w-3 h-3 text-[#6366f1] fill-indigo-100 dark:fill-indigo-950/40 shrink-0" />
                          )}
                        </span>
                      </div>
                    )}
                    {selectedEvent.created_at && (
                      <div className="flex items-center gap-2 bg-gray-50 dark:bg-secondary px-3 py-1.5 rounded-lg border border-gray-100 dark:border-border">
                        <Clock className="w-4 h-4 text-[#6366f1]" />
                        <span className="text-[11px] font-bold text-gray-550 dark:text-zinc-400">予定が追加された日</span>
                        <span className="text-sm font-bold text-gray-700 dark:text-zinc-300">
                          {format(parseISO(selectedEvent.created_at.includes('T') ? selectedEvent.created_at : selectedEvent.created_at.replace(' ', 'T')), 'yyyy年MM月dd日')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedEvent.description && (
                  <div className="bg-gray-50/50 dark:bg-secondary/40 p-5 rounded-2xl border border-gray-100 dark:border-border mb-6">
                    <p className="text-gray-600 dark:text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{selectedEvent.description}</p>
                  </div>
                )}

                <div className="mb-4 space-y-3">
                  <div className="flex items-center gap-3 px-4 py-4 bg-indigo-50/80 dark:bg-indigo-950/25 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                    <Calendar className="w-7 h-7 text-[#6366f1] shrink-0" />
                    <div>
                      <p className="text-[10px] font-black text-[#6366f1] dark:text-indigo-400 uppercase tracking-widest mb-0.5">予定の日時</p>
                      <p className="text-xl sm:text-2xl font-black text-[#222222] dark:text-zinc-100 tracking-tight">
                        {formatEventDateTime(selectedEvent.date, isAllDayEvent(selectedEvent))}
                      </p>
                    </div>
                  </div>
                  {(selectedEvent.location || selectedEvent.address) && (
                    <div className="flex items-start gap-3 px-4 py-4 bg-gray-50/90 dark:bg-secondary/50 rounded-2xl border border-gray-100 dark:border-border">
                      <MapPin className="w-7 h-7 text-[#6366f1] shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-gray-500 dark:text-zinc-400 uppercase tracking-widest mb-0.5">場所</p>
                        {selectedEvent.location && (
                          <p className="text-lg sm:text-xl font-black text-[#222222] dark:text-zinc-100 tracking-tight leading-snug">
                            {selectedEvent.location}
                          </p>
                        )}
                        {selectedEvent.address && selectedEvent.address !== selectedEvent.location && (
                          <p className="text-sm font-bold text-gray-600 dark:text-zinc-400 mt-1 leading-relaxed">
                            {selectedEvent.address}
                          </p>
                        )}
                        {!selectedEvent.location && selectedEvent.address && (
                          <p className="text-lg sm:text-xl font-black text-[#222222] dark:text-zinc-100 tracking-tight leading-snug">
                            {selectedEvent.address}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {selectedEvent.source_url && (
                  <div className="mb-4 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowSafetyDialog(true)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-black text-gray-400 dark:text-zinc-500 hover:text-[#6366f1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]/40 transition-colors mb-1"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      リンクの安全性について
                    </button>
                    <button
                      onClick={() => setExternalUrlWarning(selectedEvent.source_url!)}
                      className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#6366f1] hover:bg-[#e03150] text-white text-sm font-black rounded-2xl transition-all shadow-lg active:scale-95"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                      公式ソース・関連リンクを開く
                    </button>
                    {/* URLを直接表示（目視確認用） */}
                    <div className="mt-3 px-4 py-3 bg-gray-50 dark:bg-secondary/40 rounded-xl border border-gray-100 dark:border-border overflow-hidden">
                      <p className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <AlertCircle className="w-3 h-3 text-gray-300 dark:text-zinc-650" />
                        リンク先URL (目視確認用)
                      </p>
                      <p className="text-[11px] font-mono text-gray-500 dark:text-zinc-400 break-all select-all leading-relaxed">
                        {normalizeExternalUrl(selectedEvent.source_url)}
                      </p>
                    </div>
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
                    <p className="text-[9px] text-gray-300 dark:text-zinc-600 text-right font-medium mt-1.5">Powered by 楽天トラベル</p>
                  </div>
                )}

                {/* Accuracy Voting Section */}
                {!(selectedEvent.creator_is_official || selectedEvent.group_is_official) && (
                  <div className="space-y-4 border-t border-gray-100 dark:border-border pt-8 mt-4 bg-gray-50/30 dark:bg-secondary/10 -mx-8 px-8 pb-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">情報の正確さを投票</h3>
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
                          ? 'bg-green-50 dark:bg-green-950/30 border-green-500 text-green-700 dark:text-green-400 shadow-inner'
                          : 'border-green-100 dark:border-green-950/30 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/20 hover:border-green-200'
                      } border-2`}
                    >
                      <ShieldCheck className={`w-5 h-5 ${selectedEvent.user_vote === 'confirmed' ? 'fill-green-200 dark:fill-green-950/40' : ''}`} /> 正確
                    </Button>
                    <Button
                      onClick={() => handleVerify('disputed')}
                      disabled={loading}
                      variant="outline"
                      className={`rounded-2xl h-14 font-black flex items-center justify-center gap-2 active:scale-95 transition-all ${
                        selectedEvent.user_vote === 'disputed'
                          ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-500 text-orange-700 dark:text-orange-400 shadow-inner'
                          : 'border-orange-100 dark:border-orange-950/30 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 hover:border-orange-200'
                      } border-2`}
                    >
                      <AlertCircle className={`w-5 h-5 ${selectedEvent.user_vote === 'disputed' ? 'fill-orange-200 dark:fill-orange-950/40' : ''}`} /> 不正確
                    </Button>
                  </div>
                </div>
                )}

                {/* Community Update Section (Voting on Proposals) */}
                {!selectedEvent.group_is_official && (
                  <div className="mt-8 border-t border-gray-100 dark:border-border pt-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-sm font-black text-[#222222] dark:text-zinc-100 uppercase tracking-widest">修正提案（0時更新）</h3>
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold mt-1">最も投票が多い案が採用されます</p>
                    </div>
                    {proposals.length < 3 && (
                      <Button 
                        onClick={() => setIsEditing(true)} 
                        variant="ghost" 
                        className="text-[#6366f1] hover:bg-red-50 dark:hover:bg-secondary font-black text-xs h-9 rounded-xl gap-2"
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
                          ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-500' 
                          : 'border-gray-100 dark:border-border hover:border-gray-200 dark:hover:border-muted-foreground/40'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-0.5">現状</p>
                        <p className="text-xs font-black text-[#222222] dark:text-zinc-100">現状のままで良い</p>
                      </div>
                      <div className="flex items-center gap-2 bg-white dark:bg-secondary px-3 py-1 rounded-full border border-gray-100 dark:border-border shrink-0">
                        <ThumbsUp className={`w-3 h-3 ${myProposalVote === 'current' ? 'text-blue-500 fill-blue-500' : 'text-gray-300'}`} />
                        <span className="text-[11px] font-black text-gray-500 dark:text-zinc-400">{currentVotes}</span>
                      </div>
                    </div>

                    {/* Proposal Options */}
                    {proposals.map((p, i) => (
                      <div 
                        key={p.id}
                        onClick={() => handleVote(p.id)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-3 ${
                          myProposalVote === p.id 
                            ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-500' 
                            : 'border-gray-100 dark:border-border hover:border-gray-200 dark:hover:border-muted-foreground/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">案 {i + 1} ({p.user_name})</p>
                          <div className="flex items-center gap-2 bg-white dark:bg-secondary px-3 py-1 rounded-full border border-gray-100 dark:border-border">
                            <ThumbsUp className={`w-3 h-3 ${myProposalVote === p.id ? 'text-blue-500 fill-blue-500' : 'text-gray-350'}`} />
                            <span className="text-[11px] font-black text-gray-500 dark:text-zinc-400">{p.vote_count}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {p.reason && (
                            <div className="bg-white/50 dark:bg-secondary/40 p-2.5 rounded-lg border border-blue-100/50 dark:border-blue-900/30">
                              <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">修正理由</p>
                              <p className="text-[11px] font-medium text-gray-600 dark:text-zinc-300 leading-relaxed line-clamp-2">{p.reason}</p>
                            </div>
                          )}
                          <div className="px-1">
                            <p className="text-[9px] font-black text-gray-300 dark:text-zinc-500 uppercase tracking-widest mb-1">変更後の内容</p>
                            <p className="text-xs font-black text-[#222222] dark:text-zinc-100 truncate">{p.title}</p>
                            {p.description && <p className="text-[10px] text-gray-400 dark:text-zinc-400 truncate mt-0.5">{p.description}</p>}
                          </div>
                        </div>
                      </div>
                    ))}

                    {proposals.length === 0 && !isFetchingProposals && (
                      <p className="text-center py-4 text-[11px] text-gray-300 dark:text-zinc-600 font-bold">まだ修正案はありません</p>
                    )}
                  </div>
                </div>
                )}
              </>
            ) : (
              <form onSubmit={onProposeSubmit} className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <DialogTitle className="text-2xl font-black text-[#222222] dark:text-zinc-100">修正案を提案</DialogTitle>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">1. 修正の理由</label>
                    <textarea 
                      name="reason" 
                      className="w-full h-24 bg-gray-50 dark:bg-secondary rounded-xl p-4 font-medium outline-none border-none focus:ring-2 focus:ring-[#6366f1] resize-none text-[#222222] dark:text-zinc-100" 
                      placeholder="例：公式サイトで日時変更が発表されたため、誤字脱字の修正、など"
                      required
                    />
                  </div>
                  
                  <div className="border-t border-gray-100 dark:border-border pt-4 mt-2">
                    <p className="text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-4">2. 変更後の内容</p>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500">イベント名</label>
                        <input name="title" defaultValue={selectedEvent.title} className="w-full h-12 bg-gray-50 dark:bg-secondary rounded-xl px-4 font-bold outline-none border-none focus:ring-2 focus:ring-[#6366f1] text-[#222222] dark:text-zinc-100" required />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500">詳細説明</label>
                        <textarea name="description" defaultValue={selectedEvent.description} className="w-full h-32 bg-gray-50 dark:bg-secondary rounded-xl p-4 font-medium outline-none border-none focus:ring-2 focus:ring-[#6366f1] resize-none text-[#222222] dark:text-zinc-100" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button type="submit" className="flex-1 bg-[#6366f1] text-white h-12 rounded-2xl font-black shadow-lg shadow-red-100">提案を投稿する</Button>
                  <Button type="button" onClick={() => setIsEditing(false)} variant="ghost" className="flex-1 h-12 rounded-2xl font-black text-gray-500 dark:text-zinc-400">キャンセル</Button>
                </div>
              </form>
            )}
          </div>
      </DialogContent>
      {/* リンクの安全性に関する詳細ダイアログ */}
      <Dialog open={showSafetyDialog} onOpenChange={setShowSafetyDialog}>
        <DialogContent className="max-w-md p-8 rounded-[32px] border-none shadow-2xl top-1/2 -translate-y-1/2">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/20 rounded-2xl flex items-center justify-center text-blue-500 shadow-sm">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-[#222222] dark:text-zinc-100">リンクの安全性について</DialogTitle>
                <p className="text-xs text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Security Measures</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-secondary rounded-2xl border border-gray-100 dark:border-border">
                <h4 className="text-[12px] font-black text-[#222222] dark:text-zinc-100 mb-1 flex items-center gap-2">
                  <span className="w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center text-[8px]">1</span>
                  サーバーサイド検証
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed font-medium">
                  全てのURLは登録時にシステムによる自動検証（IPアドレス形式の禁止、短縮URLの制限、不審なキーワードの検出など）が行われています。
                </p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-secondary rounded-2xl border border-gray-100 dark:border-border">
                <h4 className="text-[12px] font-black text-[#222222] dark:text-zinc-100 mb-1 flex items-center gap-2">
                  <span className="w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center text-[8px]">2</span>
                  目視確認
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed font-medium">
                  リンクを開く前に、下部に表示されている実際のURLに不審な点がないか、ご自身でもご確認いただけます。
                </p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-secondary rounded-2xl border border-gray-100 dark:border-border">
                <h4 className="text-[12px] font-black text-[#222222] dark:text-zinc-100 mb-1 flex items-center gap-2">
                  <span className="w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center text-[8px]">3</span>
                  コミュニティ報告
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed font-medium">
                  万が一、悪意のあるリンクを発見した場合は「不正確」ボタンで報告してください。一定数の報告により、リンクは自動的に無効化されます。
                </p>
              </div>

              <div className="p-4 bg-blue-50/30 dark:bg-blue-950/20 rounded-2xl border border-blue-100/50 dark:border-blue-900/30">
                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold leading-relaxed flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3" />
                  今後のアップデート予定
                </p>
                <p className="text-[10px] text-blue-500/70 dark:text-blue-400/60 font-medium mt-1">
                  現在はシステム独自のチェックを行っていますが、今後は Google Safe Browsing 等の外部サービスとも連携し、さらに安全性を高めていく予定です。
                </p>
              </div>
            </div>

            <Button 
              onClick={() => setShowSafetyDialog(false)}
              className="w-full bg-[#222222] hover:bg-black dark:bg-secondary dark:hover:bg-accent text-white h-12 rounded-xl font-black transition-all"
            >
              閉じる
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
