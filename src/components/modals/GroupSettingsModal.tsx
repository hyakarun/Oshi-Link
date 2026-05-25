import React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Palette } from 'lucide-react';
import { Group } from '@/lib/types';

type GroupSettingsModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  group: Group | null;
  loading: boolean;
  handleSavePersonalization: (e: React.FormEvent<HTMLFormElement>) => void;
};

export function GroupSettingsModal({
  isOpen,
  onOpenChange,
  group,
  loading,
  handleSavePersonalization
}: GroupSettingsModalProps) {
  if (!group) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] border-none rounded-[32px] shadow-2xl p-0 overflow-hidden">
        <div className="bg-gray-50 dark:bg-secondary p-8 border-b border-gray-100 dark:border-border">
          <DialogTitle className="text-2xl font-black text-[#222222] dark:text-zinc-100 tracking-tight">{group.name} の個人設定</DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-zinc-400 font-medium mt-1">
            あなただけのカレンダー画面にカスタマイズできます。※他のユーザーには公開されません。
          </DialogDescription>
        </div>
        <form onSubmit={handleSavePersonalization} className="modal-surface p-8 space-y-5">
          <input type="hidden" name="group_id" value={group.id} />
          
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.1em] flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" /> テーマカラー（文字色など）
            </label>
            <div className="flex items-center gap-4">
              <input 
                name="custom_theme_color" 
                type="color"
                defaultValue={group.custom_theme_color || '#ff385c'}
                className="w-12 h-12 bg-gray-50 dark:bg-secondary p-1 rounded-xl cursor-pointer" 
              />
              <span className="text-xs text-gray-400 dark:text-zinc-550 font-bold">推しのメンバーカラー等を選択</span>
            </div>
          </div>
          
          {/* 外部カレンダー連携 (iCal) - Pro機能のため一時非表示
          ...
          */}
          
          <div className="pt-2">
            <Button type="submit" disabled={loading} className="w-full bg-[#222222] hover:bg-black dark:bg-secondary dark:hover:bg-accent text-white h-14 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all">
              {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : '個人設定を保存する'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
