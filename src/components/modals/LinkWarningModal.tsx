import React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

type LinkWarningModalProps = {
  url: string | null;
  onClose: () => void;
};

export function LinkWarningModal({ url, onClose }: LinkWarningModalProps) {
  return (
    <Dialog open={!!url} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-8 border-none rounded-[32px] bg-white dark:bg-popover shadow-2xl">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-950/30 rounded-full flex items-center justify-center mb-2">
            <AlertCircle className="w-8 h-8 text-orange-500" />
          </div>
          <DialogTitle className="text-2xl font-black text-[#222222] dark:text-zinc-100">外部サイトへ移動します</DialogTitle>
          <p className="text-sm font-medium text-gray-550 dark:text-zinc-400 bg-gray-50 dark:bg-secondary p-4 rounded-xl break-all w-full text-left max-h-[100px] overflow-y-auto">
            {url}
          </p>
          <DialogDescription className="text-sm text-gray-500 dark:text-zinc-400">
            Oshi-Linkから離れ、コミュニティによって登録された外部サイトに移動しようとしています。<br/><br/>
            <span className="text-orange-600 dark:text-orange-400 font-bold">フィッシング詐欺や悪質なウイルスが含まれる可能性があるリンクには十分にご注意ください。怪しい場合は絶対に開かないでください。</span>
          </DialogDescription>
          <div className="flex gap-3 w-full mt-4">
            <Button onClick={onClose} className="flex-1 bg-gray-100 dark:bg-secondary text-gray-600 dark:text-zinc-300 h-12 rounded-2xl font-black hover:bg-gray-200 dark:hover:bg-accent shadow-sm active:scale-95 transition-all">キャンセル</Button>
            <a 
              href={url || '#'} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex-1 bg-orange-500 text-white h-12 rounded-2xl font-black flex items-center justify-center hover:bg-orange-600 shadow-md active:scale-95 transition-all" 
              onClick={onClose}
            >
              自己責任で開く
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
