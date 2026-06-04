import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, Info } from 'lucide-react';

type CreateGroupModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  handleCreateGroup: (e: React.FormEvent<HTMLFormElement>) => void;
  handleApplyOfficialCalendar: (e: React.FormEvent<HTMLFormElement>) => void;
  loading: boolean;
};

export function CreateGroupModal({
  isOpen,
  onOpenChange,
  handleCreateGroup,
  handleApplyOfficialCalendar,
  loading,
}: CreateGroupModalProps) {
  const [mode, setMode] = useState<'shared' | 'official'>('shared');

  const handleOpenChange = (open: boolean) => {
    if (!open) setMode('shared');
    onOpenChange(open);
  };

  const isOfficial = mode === 'official';

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] border-none rounded-[32px] shadow-2xl p-0 overflow-hidden">
        <div className="bg-gray-50 dark:bg-secondary p-8 border-b border-gray-100 dark:border-border">
          <DialogTitle className="text-2xl font-black text-[#222222] dark:text-zinc-100 tracking-tight">
            {isOfficial ? '公式カレンダーを申請' : '共有カレンダーを作成'}
          </DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-zinc-400 font-medium mt-1">
            {isOfficial
              ? '運営の審査後に公式カレンダーが作成されます。承認まではカレンダーは公開されません。'
              : '新しい推しグループのカレンダーを作成し、みんなで予定を共有しましょう。'}
          </DialogDescription>
        </div>

        <div className="px-8 pt-4">
          <div className="flex bg-gray-100 dark:bg-zinc-800 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setMode('shared')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'shared'
                  ? 'bg-white dark:bg-zinc-900 text-[#222222] dark:text-zinc-100 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              共有カレンダー
            </button>
            <button
              type="button"
              onClick={() => setMode('official')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                mode === 'official'
                  ? 'bg-white dark:bg-zinc-900 text-[#6366f1] shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              公式カレンダー申請
            </button>
          </div>
        </div>

        <form
          onSubmit={isOfficial ? handleApplyOfficialCalendar : handleCreateGroup}
          className="modal-surface p-8 pt-5 space-y-5"
        >
          {isOfficial && (
            <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 rounded-xl px-3 py-2 font-bold leading-relaxed flex gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              事務所・店舗・VTuber など、公式として運用するカレンダー向けです。審査には数日かかる場合があります。
            </p>
          )}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.1em]">
              {isOfficial ? '希望カレンダー名' : 'グループ名'} <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              className="w-full h-12 bg-gray-50 dark:bg-secondary border-none rounded-xl px-4 focus:ring-2 focus:ring-[#6366f1] outline-none font-bold text-[#222222] dark:text-zinc-100"
              placeholder={isOfficial ? '例: 〇〇 公式' : '例: Virtual Idols Unit X'}
              required
              maxLength={50}
            />
          </div>
          {!isOfficial && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.1em]">
                説明
              </label>
              <textarea
                name="description"
                className="w-full h-24 bg-gray-50 dark:bg-secondary border-none rounded-xl p-4 focus:ring-2 focus:ring-[#6366f1] outline-none resize-none font-medium text-[#222222] dark:text-zinc-100"
                placeholder="どんなグループか簡単に説明を..."
              />
            </div>
          )}
          <Button
            type="submit"
            disabled={loading}
            className={`w-full h-14 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all ${
              isOfficial
                ? 'bg-[#6366f1] hover:bg-indigo-600 text-white'
                : 'bg-[#222222] hover:bg-black dark:bg-secondary dark:hover:bg-accent text-white'
            }`}
          >
            {loading ? (
              <Loader2 className="animate-spin mr-2 h-5 w-5" />
            ) : isOfficial ? (
              '公式カレンダーを申請する'
            ) : (
              'カレンダーを公開する'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
