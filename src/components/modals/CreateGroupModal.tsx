import React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

type CreateGroupModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  handleCreateGroup: (e: React.FormEvent<HTMLFormElement>) => void;
  loading: boolean;
};

export function CreateGroupModal({
  isOpen,
  onOpenChange,
  handleCreateGroup,
  loading
}: CreateGroupModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-white dark:bg-popover border-none rounded-[32px] shadow-2xl p-0 overflow-hidden">
        <div className="bg-gray-50 dark:bg-secondary p-8 border-b border-gray-100 dark:border-border">
          <DialogTitle className="text-2xl font-black text-[#222222] dark:text-zinc-100 tracking-tight">共有カレンダーを作成</DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-zinc-400 font-medium mt-1">
            新しい推しグループのカレンダーを作成し、みんなで予定を共有しましょう。
          </DialogDescription>
        </div>
        <form onSubmit={handleCreateGroup} className="p-8 space-y-5 bg-white dark:bg-popover">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.1em]">グループ名 <span className="text-red-500">*</span></label>
            <input name="name" className="w-full h-12 bg-gray-50 dark:bg-secondary border-none rounded-xl px-4 focus:ring-2 focus:ring-[#6366f1] outline-none font-bold text-[#222222] dark:text-zinc-100" placeholder="例: Virtual Idols Unit X" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.1em]">説明</label>
            <textarea name="description" className="w-full h-24 bg-gray-50 dark:bg-secondary border-none rounded-xl p-4 focus:ring-2 focus:ring-[#6366f1] outline-none resize-none font-medium text-[#222222] dark:text-zinc-100" placeholder="どんなグループか簡単に説明を..." />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-[#222222] hover:bg-black dark:bg-secondary dark:hover:bg-accent text-white h-14 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all">
            {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : 'カレンダーを公開する'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
