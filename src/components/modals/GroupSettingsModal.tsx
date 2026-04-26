import React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Palette, Image as ImageIcon } from 'lucide-react';
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
      <DialogContent className="sm:max-w-[480px] bg-white border-none rounded-[32px] shadow-2xl p-0 overflow-hidden">
        <div className="bg-gray-50 p-8 border-b border-gray-100">
          <DialogTitle className="text-2xl font-black text-[#222222] tracking-tight">{group.name} の個人設定</DialogTitle>
          <DialogDescription className="text-gray-500 font-medium mt-1">
            あなただけのカレンダー画面にカスタマイズできます。※他のユーザーには公開されません。
          </DialogDescription>
        </div>
        <form onSubmit={handleSavePersonalization} className="p-8 space-y-5 bg-white">
          <input type="hidden" name="group_id" value={group.id} />
          
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em] flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" /> テーマカラー（文字色など）
            </label>
            <div className="flex items-center gap-4">
              <input 
                name="custom_theme_color" 
                type="color"
                defaultValue={group.custom_theme_color || '#ff385c'}
                className="w-12 h-12 bg-gray-50 p-1 rounded-xl cursor-pointer" 
              />
              <span className="text-xs text-gray-400 font-bold">推しのメンバーカラー等を選択</span>
            </div>
          </div>
          
          <div className="space-y-4 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              外部カレンダー連携 (iCal)
            </label>
            <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
              iPhoneのカレンダーやGoogleカレンダーに予定を同期できます。以下のURLをコピーしてカレンダーアプリの「照会」または「URLから追加」に貼り付けてください。
            </p>
            <div className="flex gap-2">
              <input 
                readOnly 
                value={`${typeof window !== 'undefined' ? window.location.origin.replace('http', 'webcal') : ''}/api/groups/export?id=${group.id}`}
                className="flex-1 h-10 bg-white border border-gray-200 rounded-lg px-3 text-[10px] font-mono text-gray-400 outline-none"
              />
              <Button 
                type="button" 
                onClick={() => {
                  const url = `${window.location.origin}/api/groups/export?id=${group.id}`;
                  navigator.clipboard.writeText(url);
                  alert('URLをコピーしました');
                }}
                className="h-10 px-4 bg-white border border-gray-200 text-[#222222] font-bold text-[10px] rounded-lg hover:bg-gray-50"
              >
                コピー
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <a 
                href={`webcal://${typeof window !== 'undefined' ? window.location.host : ''}/api/groups/export?id=${group.id}`}
                className="flex items-center justify-center gap-2 h-10 bg-black text-white text-[10px] font-bold rounded-lg hover:bg-gray-800 transition-all"
              >
                iPhoneに登録
              </a>
              <a 
                href={`https://www.google.com/calendar/render?cid=http://${typeof window !== 'undefined' ? window.location.host : ''}/api/groups/export?id=${group.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 h-10 bg-white border border-gray-200 text-[#4285F4] text-[10px] font-bold rounded-lg hover:bg-gray-50 transition-all"
              >
                Googleに追加
              </a>
            </div>
          </div>
          
          <div className="pt-2">
            <Button type="submit" disabled={loading} className="w-full bg-[#222222] hover:bg-black text-white h-14 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all">
              {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : '個人設定を保存する'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
